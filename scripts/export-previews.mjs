import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, relative, resolve } from "node:path";
import { chromium } from "playwright";

const previewUrl = process.env.PREVIEW_URL ?? "http://127.0.0.1:1420/";
const previewsRoot = resolve("artifacts/previews");
const outputDir = resolve(previewsRoot, "latest");
const manifestPath = join(outputDir, "manifest.json");
const metadataRoot = resolve("metadata");

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function selectLibraryItem(page, library, name) {
  await page.getByRole("button", { name: library, exact: true }).click();
  await page.locator(".component-row", { hasText: name }).first().click();
  await page.waitForFunction((expectedName) => document.querySelector(".preview-header h2")?.textContent?.trim() === expectedName, name);
  await page.waitForTimeout(120);
}

async function selectTheme(page, theme) {
  await page.getByTitle(theme.name).click();
  await page.waitForFunction((expectedName) => document.querySelector(".preview-header .eyebrow")?.textContent?.trim() === expectedName, theme.name);
  await page.waitForTimeout(120);
}

async function capturePreview(page, themeId, kind, name) {
  const relativePath = join(themeId, kind, `${slugify(name)}.png`);
  const path = join(outputDir, relativePath);
  await mkdir(join(outputDir, themeId, kind), { recursive: true });
  await page.locator(".preview-pane").screenshot({ path });
  return { path, relativePath };
}

async function metadataFingerprint() {
  const files = await listMetadataFiles(metadataRoot);
  const hash = createHash("sha256");

  for (const file of files) {
    const filePath = resolve(file);
    const relativePath = relative(metadataRoot, filePath).replaceAll("\\", "/");
    hash.update(relativePath);
    hash.update("\0");
    hash.update(await readFile(filePath));
    hash.update("\0");
  }

  const fullHash = hash.digest("hex");
  return {
    hash: fullHash,
    snapshotId: fullHash.slice(0, 12),
    fileCount: files.length,
  };
}

async function listMetadataFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return listMetadataFiles(path);
      return entry.isFile() && entry.name.endsWith(".toml") ? [path] : [];
    }),
  );

  return files.flat().sort((left, right) => left.localeCompare(right));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const capturedAt = new Date().toISOString();
  const metadata = await metadataFingerprint();
  const snapshotDir = resolve(previewsRoot, "snapshots", metadata.snapshotId);
  const manifest = {
    previewUrl,
    capturedAt,
    metadata,
    latestDir: outputDir,
    snapshotDir,
    themes: [],
  };

  try {
    await page.goto(previewUrl, { waitUntil: "networkidle" });
    await page.waitForSelector(".preview-pane", { state: "visible" });
    await rm(outputDir, { recursive: true, force: true });
    await mkdir(outputDir, { recursive: true });

    const themes = await page
      .locator(".theme-dot")
      .evaluateAll((nodes) =>
        nodes
          .map((node) => ({
            id: node.getAttribute("title")?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
            name: node.getAttribute("title"),
          }))
          .filter((theme) => theme.id && theme.name),
      );
    const componentNames = await page
      .locator(".component-row strong")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim()).filter(Boolean));

    await page.getByRole("button", { name: "Groups", exact: true }).click();
    const groupNames = await page
      .locator(".component-row strong")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim()).filter(Boolean));
    await page.getByRole("button", { name: "Variants", exact: true }).click();
    const variantNames = await page
      .locator(".component-row strong")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim()).filter(Boolean));
    await page.getByRole("button", { name: "Pages", exact: true }).click();
    const pageNames = await page
      .locator(".component-row strong")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim()).filter(Boolean));

    for (const theme of themes) {
      await selectTheme(page, theme);
      const themeManifest = {
        id: theme.id,
        name: theme.name,
        components: [],
        variants: [],
        groups: [],
        pages: [],
      };

      for (const name of componentNames) {
        await selectLibraryItem(page, "Components", name);
        themeManifest.components.push({ name, ...(await capturePreview(page, theme.id, "components", name)) });
      }

      for (const name of groupNames) {
        await selectLibraryItem(page, "Groups", name);
        themeManifest.groups.push({ name, ...(await capturePreview(page, theme.id, "groups", name)) });
      }

      for (const name of variantNames) {
        await selectLibraryItem(page, "Variants", name);
        themeManifest.variants.push({ name, ...(await capturePreview(page, theme.id, "variants", name)) });
      }

      for (const name of pageNames) {
        await selectLibraryItem(page, "Pages", name);
        themeManifest.pages.push({ name, ...(await capturePreview(page, theme.id, "pages", name)) });
      }

      manifest.themes.push(themeManifest);
    }

    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    await rm(snapshotDir, { recursive: true, force: true });
    await cp(outputDir, snapshotDir, { recursive: true });
    const componentCount = manifest.themes.reduce((total, theme) => total + theme.components.length, 0);
    const groupCount = manifest.themes.reduce((total, theme) => total + theme.groups.length, 0);
    const variantCount = manifest.themes.reduce((total, theme) => total + theme.variants.length, 0);
    const pageCount = manifest.themes.reduce((total, theme) => total + theme.pages.length, 0);
    console.log(
      `Exported ${componentCount} component previews, ${variantCount} variant previews, ${groupCount} group previews, and ${pageCount} page previews across ${manifest.themes.length} themes to ${outputDir}`,
    );
    console.log(`Snapshot ${metadata.snapshotId} is available at ${snapshotDir}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
