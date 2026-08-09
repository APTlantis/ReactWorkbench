import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const previewUrl = process.env.PREVIEW_URL ?? "http://127.0.0.1:1420/";
const screenshotPath = resolve("artifacts/smoke/group-board.png");
const visualSummaryPath = resolve("artifacts/smoke/visual-checks.json");

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
    }));

    assert(!boot.error, `Unexpected error banner after boot: ${boot.error}`);
    assert(boot.componentNames.includes("Input"), "Input component is missing from the sidebar.");
    assert(boot.componentNames.includes("Toggle"), "Toggle component is missing from the sidebar.");
    assert(boot.activeTitle && boot.activeTitle !== "Loading", "Preview pane did not finish loading.");
    assert(boot.indexedText?.includes("indexed"), "Browser catalog status did not initialize.");
    assert(boot.visualCheckSummary, "Visual checks panel did not render in the inspector.");

    await page.getByTitle("Group board").click();
    await page.waitForSelector(".board-card", { state: "visible" });
    await page.waitForTimeout(200);

    const board = await page.evaluate(() => ({
      error: document.querySelector(".error-banner")?.textContent?.trim() ?? null,
      cardNames: [...document.querySelectorAll(".board-card > header h3")].map((node) => node.textContent?.trim()),
      layouts: [...document.querySelectorAll(".board-card > header span")].map((node) => node.textContent?.trim()),
      boardRect: document.querySelector(".group-board")?.getBoundingClientRect().toJSON(),
    }));

    assert(!board.error, `Unexpected error banner on group board: ${board.error}`);
    assert(board.cardNames.includes("Command Toolbar"), "Command Toolbar group is missing from the board.");
    assert(board.cardNames.includes("Table Header"), "Table Header group is missing from the board.");
    assert(board.layouts.includes("toolbar"), "Toolbar layout is missing from the board.");
    assert(board.layouts.includes("table-header"), "Table header layout is missing from the board.");
    assert(board.boardRect && board.boardRect.width > 300 && board.boardRect.height > 300, "Group board rendered too small or blank.");

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

      return {
        checkedElements: {
          previews: issueElements.length,
          controls: controlElements.length,
          text: textElements.length,
        },
        issues,
      };
    });

    assert(visual.issues.length === 0, `Visual QA found issues: ${JSON.stringify(visual.issues, null, 2)}`);

    await mkdir(dirname(screenshotPath), { recursive: true });
    const screenshot = await page.screenshot({ path: screenshotPath, fullPage: true });
    assert(screenshot.length > 10000, "Smoke screenshot appears to be blank or incomplete.");

    await writeFile(resolve(visualSummaryPath), `${JSON.stringify(visual, null, 2)}\n`);
    await writeFile(
      resolve("artifacts/smoke/summary.json"),
      `${JSON.stringify({ previewUrl, boot, board, visual, screenshotPath, visualSummaryPath }, null, 2)}\n`,
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
