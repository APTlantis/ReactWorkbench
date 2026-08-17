import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const previewPort = process.env.VERIFY_PREVIEW_PORT ?? previewPortFromUrl(process.env.PREVIEW_URL) ?? "1421";
const previewUrl = process.env.PREVIEW_URL ?? `http://127.0.0.1:${previewPort}/`;

async function main() {
  const checks = [];

  await runCheck(checks, "Build", () => runNpm(["run", "build"]));
  await runCheck(checks, "Compare fixtures", () => runNpm(["run", "test:compare"]));
  await runCheck(checks, "Duplicate group fixtures", () => runNpm(["run", "test:groups"]));
  await runCheck(checks, "Page layout fixtures", () => runNpm(["run", "test:pages"]));
  await runCheck(checks, "Report review fixtures", () => runNpm(["run", "test:reports"]));
  await runCheck(checks, "Strict screenshot comparison", () => runNpm(["run", "compare:screenshots:strict"]));
  await runCheck(checks, "Rust/Tauri tests", () => run(cargoCommand(), ["test"], { cwd: "src-tauri" }));

  const serverCommand = npmInvocation(["run", "dev", "--", "--host", "127.0.0.1", "--port", previewPort, "--strictPort"]);
  const server = spawn(serverCommand.command, serverCommand.args, {
    stdio: ["ignore", "pipe", "pipe"],
  });

  server.stdout.on("data", (chunk) => process.stdout.write(chunk));
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));

  try {
    await waitForPreview(previewUrl);
    await runCheck(checks, "Browser smoke", () => runNpm(["run", "smoke"], { env: { ...process.env, PREVIEW_URL: previewUrl } }));
    checks.push(await duplicateSmokeSummary());
    checks.push(await visualSmokeSummary());
  } finally {
    await stop(server);
  }

  printSummary(checks);
}

function runNpm(args, options = {}) {
  const invocation = npmInvocation(args);
  return run(invocation.command, invocation.args, options);
}

async function runCheck(checks, label, action) {
  await action();
  checks.push(label);
}

function printSummary(checks) {
  console.log("\nVerification summary");
  for (const check of checks) {
    console.log(`✓ ${check}`);
  }
}

async function visualSmokeSummary() {
  const raw = await readFile("artifacts/smoke/visual-checks.json", "utf8");
  const visual = JSON.parse(raw);
  const checked = visual.checkedElements ?? {};
  const issueCount = Array.isArray(visual.issues) ? visual.issues.length : 0;
  const fixtureCount = Array.isArray(visual.fixtures?.contentClipping?.issues) ? visual.fixtures.contentClipping.issues.length : 0;

  return `Visual smoke totals: ${issueCount} issues · ${checked.previews ?? 0} previews · ${checked.controls ?? 0} controls · ${checked.text ?? 0} text nodes · ${checked.verticalClippingContainers ?? 0} vertical clip containers · ${checked.clippedContentContainers ?? 0} child clip containers · ${checked.computedContrast ?? 0} contrast samples · ${fixtureCount} fixture diagnostics`;
}

async function duplicateSmokeSummary() {
  const raw = await readFile("artifacts/smoke/summary.json", "utf8");
  const smoke = JSON.parse(raw);
  const coverage = smoke.duplicateCoverage ?? {};
  const badgeCount = Array.isArray(coverage.badgePairs) ? coverage.badgePairs.length : 0;
  const persistence = coverage.filterPersistence?.checkboxChecked === true && coverage.filterPersistence?.storageValue === "true" ? "persisted" : "not persisted";
  const reset = coverage.filterReset?.checkboxChecked === false ? "reset" : "not reset";
  const seededMetadata = smoke.seededDuplicateMetadata ?? {};
  const selectedPanel = coverage.selectedPanel?.title ?? "missing panel";
  const jumpTarget = coverage.jumpTarget?.highlightedCardTitle ?? "missing jump";

  return `Duplicate smoke coverage: ${seededMetadata.groupCount ?? 0} seeded groups (${seededMetadata.similarLabel ?? "no label"}) · ${badgeCount} badges · ${coverage.duplicateOnlyCount ?? 0} duplicate-only cards · ${persistence} · ${reset} · ${selectedPanel} · jump ${jumpTarget}`;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
      }
    });
  });
}

async function waitForPreview(url) {
  const startedAt = Date.now();
  const timeoutMs = 30_000;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await delay(250);
    }
  }

  throw new Error(`Preview server did not become ready at ${url} within ${timeoutMs}ms.`);
}

function stop(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.killed) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => stopProcessTree(child.pid).finally(resolve), 5_000);

    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
    stopProcessTree(child.pid).catch(() => child.kill("SIGTERM"));
  });
}

function stopProcessTree(pid) {
  if (!pid) return Promise.resolve();

  if (process.platform === "win32") {
    return new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(pid), "/t", "/f"], { stdio: "ignore" });
      killer.on("exit", () => resolve());
      killer.on("error", () => resolve());
    });
  }

  process.kill(pid, "SIGTERM");
  return Promise.resolve();
}

function npmInvocation(args) {
  if (process.platform === "win32") {
    return {
      command: process.env.ComSpec ?? "cmd.exe",
      args: ["/d", "/s", "/c", "npm", ...args],
    };
  }

  return { command: "npm", args };
}

function cargoCommand() {
  return process.platform === "win32" ? "cargo.exe" : "cargo";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function previewPortFromUrl(url) {
  if (!url) return null;

  try {
    return new URL(url).port || null;
  } catch {
    return null;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
