import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const previewUrl = process.env.PREVIEW_URL ?? "http://127.0.0.1:1420/";
const screenshotPath = resolve("artifacts/smoke/group-board.png");
const visualSummaryPath = resolve("artifacts/smoke/visual-checks.json");
const browserReportPath = "browser://reports/smoke-source.json";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await page.goto(previewUrl, { waitUntil: "networkidle" });
    await page.waitForSelector(".preview-pane", { state: "visible" });

    const boot = await page.evaluate(() => ({
      error: document.querySelector(".error-banner")?.textContent?.trim() ?? null,
      componentNames: [...document.querySelectorAll(".component-row strong")].map((node) => node.textContent?.trim()),
      activeTitle: document.querySelector(".preview-header h2")?.textContent?.trim(),
      indexedText: document.querySelector(".status-pill span")?.textContent?.trim(),
      visualCheckSummary: document.querySelector(".visual-check-panel header strong")?.textContent?.trim(),
      activeTheme: document.querySelector(".preview-header .eyebrow")?.textContent?.trim(),
    }));

    assert(!boot.error, `Unexpected error banner after boot: ${boot.error}`);
    assert(boot.componentNames.includes("Input"), "Input component is missing from the sidebar.");
    assert(boot.componentNames.includes("Toggle"), "Toggle component is missing from the sidebar.");
    assert(boot.activeTitle && boot.activeTitle !== "Loading", "Preview pane did not finish loading.");
    assert(boot.indexedText?.includes("indexed"), "Browser catalog status did not initialize.");
    assert(boot.visualCheckSummary, "Visual checks panel did not render in the inspector.");
    assert(boot.activeTheme === "Blue Slate", `Blue Slate should be the default selected theme, found ${boot.activeTheme}.`);

    await page.getByRole("button", { name: "Variants", exact: true }).click();
    await page.locator(".component-row", { hasText: "Project Feature Card" }).first().click();
    await page.waitForFunction(() => document.querySelector(".preview-header h2")?.textContent?.trim() === "Project Feature Card");
    const variantPreview = await page.evaluate(() => ({
      title: document.querySelector(".variant-card h3")?.textContent?.trim() ?? null,
      action: document.querySelector(".variant-card button")?.textContent?.trim() ?? null,
      slots: [...document.querySelectorAll(".state-chip")].map((node) => node.textContent?.trim()),
    }));
    assert(variantPreview.title === "React composition workbench", `Seeded variant title did not render: ${JSON.stringify(variantPreview)}`);
    assert(variantPreview.action === "Open workbench", `Seeded variant action did not render: ${JSON.stringify(variantPreview)}`);
    assert(variantPreview.slots.includes("media"), `Variant slot strip did not include media: ${JSON.stringify(variantPreview)}`);

    await page.getByRole("button", { name: "Pages", exact: true }).click();
    await page.locator(".component-row", { hasText: "Workbench Home" }).first().click();
    await page.waitForFunction(() => document.querySelector(".preview-header h2")?.textContent?.trim() === "Workbench Home");
    const pagePreview = await page.evaluate(() => ({
      title: document.querySelector(".page-preview-title h3")?.textContent?.trim() ?? null,
      blocks: [...document.querySelectorAll(".page-block > span")].map((node) => node.textContent?.trim()),
    }));
    assert(pagePreview.title === "Workbench Home", `Seeded page did not render: ${JSON.stringify(pagePreview)}`);
    assert(pagePreview.blocks.includes("Saved feature card"), `Seeded page did not render the variant-backed block: ${JSON.stringify(pagePreview)}`);

    await page.getByTitle("New page").click();
    await page.waitForFunction(() => document.querySelector(".preview-header h2")?.textContent?.trim() === "New Page");
    const firstMainBlockBefore = await page.locator(".page-region-editor", { hasText: "Main Layout" }).locator(".composer-item.nested input").first().inputValue();
    await page.locator(".page-region-editor", { hasText: "Main Layout" }).getByTitle("Move down").first().click();
    const firstMainBlockAfter = await page.locator(".page-region-editor", { hasText: "Main Layout" }).locator(".composer-item.nested input").first().inputValue();
    assert(firstMainBlockBefore !== firstMainBlockAfter, "Page block move control did not reorder the main region.");
    await page.getByRole("button", { name: "Cancel" }).click();

    await page.evaluate((reportPath) => {
      localStorage.setItem(
        `theme-preview-report-review:${reportPath}`,
        JSON.stringify({
          "added:dark/groups/settings-row.png": "dismissed",
          "removed:old/path.png": "pending",
        }),
      );
    }, browserReportPath);
    await page.getByTitle("Screenshot report").click();
    await page.waitForSelector(".report-review-progress", { state: "visible" });

    const report = await page.evaluate(() => ({
      source: document.querySelector(".report-review-source")?.textContent?.trim() ?? null,
      warning: document.querySelector(".report-review-storage-warning")?.textContent?.trim() ?? null,
      progress: document.querySelector(".report-review-progress strong")?.textContent?.trim() ?? null,
    }));

    assert(report.progress === "2 of 2", `Report review progress was not merged from exported and local decisions: ${report.progress}`);
    assert(
      report.source === "Review source: 1 local browser decision · 1 exported decision.",
      `Report review source message did not render as expected: ${report.source}`,
    );
    assert(
      report.warning === "Some saved browser review decisions were ignored because they were malformed.",
      `Malformed local review decision warning did not render as expected: ${report.warning}`,
    );

    await page.getByTitle("Group board").click();
    await page.waitForSelector(".board-card", { state: "visible" });
    await page.waitForTimeout(200);

    const board = await page.evaluate(() => ({
      error: document.querySelector(".error-banner")?.textContent?.trim() ?? null,
      cardNames: [...document.querySelectorAll(".board-card > header h3")].map((node) => node.textContent?.trim()),
      duplicateBadges: [...document.querySelectorAll(".board-card")].map((card) => ({
        title: card.querySelector("h3")?.textContent?.trim() ?? null,
        badge: card.querySelector(".duplicate-badge")?.textContent?.trim() ?? null,
      })),
      layouts: [...document.querySelectorAll(".board-card > header span")].map((node) => node.textContent?.trim()),
      boardRect: document.querySelector(".group-board")?.getBoundingClientRect().toJSON(),
    }));

    assert(!board.error, `Unexpected error banner on group board: ${board.error}`);
    assert(board.cardNames.includes("Command Toolbar"), "Command Toolbar group is missing from the board.");
    assert(board.cardNames.includes("Table Header"), "Table Header group is missing from the board.");
    assert(board.layouts.includes("toolbar"), "Toolbar layout is missing from the board.");
    assert(board.layouts.includes("table-header"), "Table header layout is missing from the board.");
    assert(board.boardRect && board.boardRect.width > 300 && board.boardRect.height > 300, "Group board rendered too small or blank.");
    const seededDuplicateBadges = board.duplicateBadges.filter((item) => item.title === "Settings Row" || item.title === "Settings Review Row");
    assert(
      seededDuplicateBadges.length === 2 && seededDuplicateBadges.every((item) => item.badge === "2 similar"),
      `Seeded duplicate cards did not render matching badges: ${JSON.stringify(seededDuplicateBadges)}`,
    );

    const jumpControl = await page.locator(".duplicate-jumps button").first();
    const jumpControlLabel = (await jumpControl.textContent())?.trim();
    const jumpControlBox = await jumpControl.boundingBox();
    assert(jumpControlLabel, "Duplicate-list jump controls did not render.");
    assert(
      jumpControlBox && jumpControlBox.width >= 24 && jumpControlBox.height >= 24,
      `Duplicate-list jump control target is too small: ${JSON.stringify(jumpControlBox)}`,
    );
    await jumpControl.click();
    await page.waitForSelector(".board-card.highlighted", { state: "visible" });

    const duplicateJump = await page.evaluate(() => {
      const highlightedCard = document.querySelector(".board-card.highlighted");
      return {
        highlightedCardId: highlightedCard?.id ?? null,
        highlightedCardTitle: highlightedCard?.querySelector("h3")?.textContent?.trim() ?? null,
      };
    });

    assert(
      duplicateJump.highlightedCardId?.startsWith("group-board-card-"),
      `Duplicate-list jump did not highlight a board card: ${JSON.stringify(duplicateJump)}`,
    );
    assert(
      duplicateJump.highlightedCardTitle === jumpControlLabel,
      `Duplicate-list jump highlighted ${duplicateJump.highlightedCardTitle} instead of ${jumpControlLabel}.`,
    );

    await page.getByLabel("Duplicate structures only").check();
    await page.waitForFunction(() => document.querySelector(".duplicate-filter strong")?.textContent?.trim() === "Duplicate filter active");
    const duplicateOnlyCardCount = await page.locator(".board-card").count();
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector(".preview-pane", { state: "visible" });
    await page.getByTitle("Group board").click();
    await page.waitForFunction(() => document.querySelector(".duplicate-filter strong")?.textContent?.trim() === "Duplicate filter active");

    const filterPersistence = await page.evaluate(() => {
      const checkbox = document.querySelector(".group-board-toolbar input");
      return {
        checkboxChecked: checkbox instanceof HTMLInputElement ? checkbox.checked : null,
        filterTitle: document.querySelector(".duplicate-filter strong")?.textContent?.trim() ?? null,
        storageValue: localStorage.getItem("theme-preview-duplicate-board-filter"),
        visibleCardCount: document.querySelectorAll(".board-card").length,
      };
    });

    assert(
      filterPersistence.checkboxChecked === true,
      `Duplicate filter did not restore checked state after reload: ${JSON.stringify(filterPersistence)}`,
    );
    assert(
      filterPersistence.filterTitle === "Duplicate filter active",
      `Duplicate filter did not restore active inspector state after reload: ${JSON.stringify(filterPersistence)}`,
    );
    assert(
      filterPersistence.storageValue === "true",
      `Duplicate filter did not persist true in storage: ${JSON.stringify(filterPersistence)}`,
    );
    assert(
      filterPersistence.visibleCardCount === duplicateOnlyCardCount,
      `Duplicate filter did not restore the duplicate-only board count after reload: ${JSON.stringify(filterPersistence)}`,
    );

    await page.locator(".duplicate-filter button", { hasText: "Show all groups" }).click();
    await page.waitForFunction(() => document.querySelector(".duplicate-filter strong")?.textContent?.trim() === "Showing all groups");

    const filterReset = await page.evaluate(() => {
      const checkbox = document.querySelector(".group-board-toolbar input");
      return {
        checkboxChecked: checkbox instanceof HTMLInputElement ? checkbox.checked : null,
        filterTitle: document.querySelector(".duplicate-filter strong")?.textContent?.trim() ?? null,
        filterDetail: document.querySelector(".duplicate-filter small")?.textContent?.trim() ?? null,
        visibleCardCount: document.querySelectorAll(".board-card").length,
      };
    });

    assert(duplicateOnlyCardCount === 2, `Duplicate-only filter should show 2 cards, found ${duplicateOnlyCardCount}.`);
    assert(filterReset.checkboxChecked === false, `Duplicate filter reset did not clear the board checkbox: ${JSON.stringify(filterReset)}`);
    assert(filterReset.filterTitle === "Showing all groups", `Duplicate filter reset did not update the inspector title: ${JSON.stringify(filterReset)}`);
    assert(filterReset.visibleCardCount === board.cardNames.length, `Duplicate filter reset did not restore all board cards: ${JSON.stringify(filterReset)}`);

    await page.locator(".board-card", { hasText: "Settings Review Row" }).getByRole("button", { name: "Open" }).click();
    await page.waitForFunction(() => document.querySelector(".preview-header h2")?.textContent?.trim() === "Settings Review Row");

    const selectedDuplicatePanel = await page.evaluate(() => {
      const panels = [...document.querySelectorAll(".duplicate-panel")];
      const panel = panels.find((candidate) => candidate.querySelector(":scope > strong")?.textContent?.trim() === "Similar Groups");
      return {
        title: panel?.querySelector(":scope > strong")?.textContent?.trim() ?? null,
        findingNames: [...(panel?.querySelectorAll(".duplicate-finding span") ?? [])].map((node) => node.textContent?.trim()),
        summaries: [...(panel?.querySelectorAll(".duplicate-finding p") ?? [])].map((node) => node.textContent?.trim()),
      };
    });

    assert(selectedDuplicatePanel.title === "Similar Groups", `Selected duplicate panel did not render: ${JSON.stringify(selectedDuplicatePanel)}`);
    assert(
      selectedDuplicatePanel.findingNames.includes("Settings Review Row, Settings Row"),
      `Selected duplicate panel did not list the seeded duplicate pair: ${JSON.stringify(selectedDuplicatePanel)}`,
    );
    assert(
      selectedDuplicatePanel.summaries.includes("2 groups use the same layout and component-state sequence."),
      `Selected duplicate panel did not show the seeded duplicate summary: ${JSON.stringify(selectedDuplicatePanel)}`,
    );

    await page.getByTitle("Group board").click();
    await page.waitForSelector(".board-card", { state: "visible" });

    const visual = await page.evaluate(() => {
      const issueElements = [
        ...document.querySelectorAll(
          ".sample-button, .sample-card, .sample-badge, .sample-input, .sample-toggle, .state-chip, .group-preview-item, .board-card",
        ),
      ];
      const controlElements = [...document.querySelectorAll("button, input, select")];
      const textElements = [
        ...document.querySelectorAll(
          ".preview-pane h2, .board-card h3, .board-card p, .group-preview-item span, .group-preview-item strong, .sample-button, .sample-badge, .sample-input span, .sample-input small, .toggle-copy strong, .toggle-copy small, .state-chip",
        ),
      ];
      const verticalClipElements = [
        ...document.querySelectorAll(
          ".preview-surface, .sample-card, .sample-input, .sample-toggle, .group-preview-item, .board-card, .report-item, .visual-check-panel, .validation-panel, .duplicate-panel",
        ),
      ];
      const contentClipElements = [
        ...document.querySelectorAll(
          ".preview-pane, .preview-surface, .sample-card, .sample-input, .sample-toggle, .group-preview-item, .board-card, .report-item",
        ),
      ];
      const contrastElements = [
        ...document.querySelectorAll(
          ".preview-pane h2, .visual-check-panel, .validation-panel, .duplicate-panel, .board-card h3, .board-card p, .group-preview-item span, .group-preview-item strong, .sample-button, .sample-badge, .sample-input span, .sample-input small, .toggle-copy strong, .toggle-copy small, .state-chip",
        ),
      ];
      const viewportWidth = document.documentElement.clientWidth;
      const issues = [];

      function labelFor(element) {
        return (
          element.getAttribute("aria-label") ||
          element.getAttribute("title") ||
          element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ||
          element.className ||
          element.tagName.toLowerCase()
        );
      }

      function hasScrollableInlineAncestor(element) {
        let current = element.parentElement;
        while (current && current !== document.body) {
          const style = window.getComputedStyle(current);
          if ((style.overflowX === "auto" || style.overflowX === "scroll") && current.scrollWidth > current.clientWidth + 1) {
            return true;
          }
          current = current.parentElement;
        }
        return false;
      }

      function clipsOverflow(style) {
        return style.overflow === "hidden" || style.overflow === "clip" || style.overflowX === "hidden" || style.overflowX === "clip" || style.overflowY === "hidden" || style.overflowY === "clip";
      }

      function parseRgb(value) {
        const match = value.match(/rgba?\(([^)]+)\)/);
        if (!match) return null;

        const parts = match[1].split(",").map((part) => part.trim());
        if (parts.length < 3) return null;

        return {
          r: Number(parts[0]),
          g: Number(parts[1]),
          b: Number(parts[2]),
          a: parts[3] === undefined ? 1 : Number(parts[3]),
        };
      }

      function channelToLinear(value) {
        const normalized = value / 255;
        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      }

      function relativeLuminance(color) {
        return 0.2126 * channelToLinear(color.r) + 0.7152 * channelToLinear(color.g) + 0.0722 * channelToLinear(color.b);
      }

      function contrastRatio(foreground, background) {
        const foregroundLuminance = relativeLuminance(foreground);
        const backgroundLuminance = relativeLuminance(background);
        const lighter = Math.max(foregroundLuminance, backgroundLuminance);
        const darker = Math.min(foregroundLuminance, backgroundLuminance);
        return (lighter + 0.05) / (darker + 0.05);
      }

      function colorLabel(color) {
        return `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
      }

      function nearestOpaqueBackground(element) {
        let current = element;
        while (current && current.nodeType === Node.ELEMENT_NODE) {
          const color = parseRgb(window.getComputedStyle(current).backgroundColor);
          if (color && color.a > 0.95) return color;
          current = current.parentElement;
        }

        return { r: 255, g: 255, b: 255, a: 1 };
      }

      function contentClippingIssues(elements) {
        const found = [];

        for (const element of elements) {
          const containerRect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          if (containerRect.width <= 0 || containerRect.height <= 0 || !clipsOverflow(style)) continue;

          for (const child of [...element.children]) {
            const childStyle = window.getComputedStyle(child);
            if (childStyle.visibility === "hidden" || childStyle.display === "none" || child.closest("[aria-hidden='true']")) continue;

            const childRect = child.getBoundingClientRect();
            if (childRect.width <= 0 || childRect.height <= 0) continue;

            const clippedLeft = childRect.left < containerRect.left - 1;
            const clippedRight = childRect.right > containerRect.right + 1;
            const clippedTop = childRect.top < containerRect.top - 1;
            const clippedBottom = childRect.bottom > containerRect.bottom + 1;
            if (clippedLeft || clippedRight || clippedTop || clippedBottom) {
              found.push({
                kind: "content-clipping",
                target: `${labelFor(element)} > ${labelFor(child)}`,
                detail: `Child spans ${Math.round(childRect.left)},${Math.round(childRect.top)} to ${Math.round(childRect.right)},${Math.round(childRect.bottom)} inside container ${Math.round(containerRect.left)},${Math.round(containerRect.top)} to ${Math.round(containerRect.right)},${Math.round(containerRect.bottom)}.`,
              });
            }
          }
        }

        return found;
      }

      function issueCountsByKind(foundIssues) {
        return foundIssues.reduce((counts, issue) => {
          counts[issue.kind] = (counts[issue.kind] ?? 0) + 1;
          return counts;
        }, {});
      }

      for (const element of issueElements) {
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
          issues.push({ kind: "blank-render", target: labelFor(element), detail: "Element has no rendered area." });
        }

        if (!hasScrollableInlineAncestor(element) && (rect.left < -1 || rect.right > viewportWidth + 1)) {
          issues.push({
            kind: "horizontal-clipping",
            target: labelFor(element),
            detail: `Element spans ${Math.round(rect.left)} to ${Math.round(rect.right)} in a ${viewportWidth}px viewport.`,
          });
        }
      }

      for (const element of controlElements) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        if (style.visibility === "hidden" || style.display === "none" || element.closest("[aria-hidden='true']")) continue;
        if (rect.width > 0 && rect.height > 0 && (rect.width < 24 || rect.height < 24)) {
          issues.push({
            kind: "tiny-target",
            target: labelFor(element),
            detail: `Target is ${Math.round(rect.width)}x${Math.round(rect.height)}px.`,
          });
        }
      }

      for (const element of verticalClipElements) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const clipsBlockOverflow = style.overflowY === "hidden" || style.overflowY === "clip" || style.overflow === "hidden" || style.overflow === "clip";
        if (rect.width > 0 && rect.height > 0 && clipsBlockOverflow && element.scrollHeight > element.clientHeight + 1) {
          issues.push({
            kind: "vertical-clipping",
            target: labelFor(element),
            detail: `Container is ${element.clientHeight}px tall with ${element.scrollHeight}px of content.`,
          });
        }
      }

      issues.push(...contentClippingIssues(contentClipElements));

      for (const element of textElements) {
        const style = window.getComputedStyle(element);
        const managesOverflow = style.textOverflow === "ellipsis" || style.overflow === "hidden" || style.whiteSpace === "nowrap";
        const overflowsX = element.scrollWidth > element.clientWidth + 1;
        const overflowsY = element.scrollHeight > element.clientHeight + 1;
        if ((overflowsX || overflowsY) && !managesOverflow) {
          issues.push({
            kind: "text-overflow",
            target: labelFor(element),
            detail: `Text box is ${element.clientWidth}x${element.clientHeight}px with scroll area ${element.scrollWidth}x${element.scrollHeight}px.`,
          });
        }
      }

      for (const element of contrastElements) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        if (
          rect.width <= 0 ||
          rect.height <= 0 ||
          style.visibility === "hidden" ||
          style.display === "none" ||
          element.closest("[aria-hidden='true']") ||
          element.matches(":disabled, [disabled]")
        ) {
          continue;
        }

        const foreground = parseRgb(style.color);
        const background = nearestOpaqueBackground(element);
        if (!foreground || foreground.a < 0.95) continue;

        const fontSize = Number.parseFloat(style.fontSize);
        const fontWeight = Number.parseFloat(style.fontWeight);
        const requiredRatio = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700) ? 3 : 4.5;
        const ratio = contrastRatio(foreground, background);
        if (ratio + 0.01 < requiredRatio) {
          issues.push({
            kind: "computed-contrast",
            target: labelFor(element),
            detail: `Contrast is ${ratio.toFixed(2)}:1 for ${colorLabel(foreground)} on ${colorLabel(background)}; expected at least ${requiredRatio}:1.`,
          });
        }
      }

      const clippingFixture = document.createElement("div");
      clippingFixture.className = "smoke-content-clipping-fixture";
      clippingFixture.setAttribute("aria-label", "Smoke content clipping fixture");
      clippingFixture.style.cssText = "position:fixed;left:0;top:0;width:20px;height:20px;overflow:hidden;opacity:0;pointer-events:none;";
      const clippingFixtureChild = document.createElement("div");
      clippingFixtureChild.className = "smoke-content-clipping-child";
      clippingFixtureChild.setAttribute("aria-label", "Smoke clipped child");
      clippingFixtureChild.style.cssText = "width:60px;height:20px;";
      clippingFixtureChild.textContent = "clipped child";
      clippingFixture.append(clippingFixtureChild);
      document.body.append(clippingFixture);
      const fixtureIssues = contentClippingIssues([clippingFixture]);
      clippingFixture.remove();

      return {
        checkedElements: {
          previews: issueElements.length,
          controls: controlElements.length,
          text: textElements.length,
          verticalClippingContainers: verticalClipElements.length,
          clippedContentContainers: contentClipElements.length,
          computedContrast: contrastElements.length,
        },
        fixtures: {
          contentClipping: {
            issueCountsByKind: issueCountsByKind(fixtureIssues),
            issues: fixtureIssues,
          },
        },
        issueCountsByKind: issueCountsByKind(issues),
        issues,
      };
    });

    assert(
      visual.fixtures.contentClipping.issues.some((issue) => issue.kind === "content-clipping" && issue.target.includes("Smoke content clipping fixture")),
      `Content clipping fixture did not produce the expected diagnostic: ${JSON.stringify(visual.fixtures.contentClipping, null, 2)}`,
    );
    assert(visual.issues.length === 0, `Visual QA found issues: ${JSON.stringify(visual.issues, null, 2)}`);

    await mkdir(dirname(screenshotPath), { recursive: true });
    const screenshot = await page.screenshot({ path: screenshotPath, fullPage: true });
    assert(screenshot.length > 10000, "Smoke screenshot appears to be blank or incomplete.");

    const duplicateCoverage = {
      badgePairs: seededDuplicateBadges,
      duplicateOnlyCount: duplicateOnlyCardCount,
      filterPersistence,
      filterReset,
      jumpTarget: duplicateJump,
      selectedPanel: selectedDuplicatePanel,
    };
    const seededDuplicateMetadata = {
      groupCount: seededDuplicateBadges.length,
      groups: seededDuplicateBadges.map((item) => item.title),
      similarLabel: seededDuplicateBadges[0]?.badge ?? null,
    };

    await writeFile(resolve(visualSummaryPath), `${JSON.stringify(visual, null, 2)}\n`);
    await writeFile(
      resolve("artifacts/smoke/summary.json"),
      `${JSON.stringify({ previewUrl, boot, report, board, duplicateCoverage, seededDuplicateMetadata, duplicateJump, filterPersistence, filterReset, selectedDuplicatePanel, visual, screenshotPath, visualSummaryPath }, null, 2)}\n`,
    );

    console.log(`Smoke check passed: ${screenshotPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
