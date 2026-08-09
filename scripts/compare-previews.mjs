import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PNG } from "playwright-core/lib/utilsBundle";

const previewsRoot = resolve("artifacts/previews");
const latestDir = resolve(previewsRoot, "latest");
const snapshotsDir = resolve(previewsRoot, "snapshots");
const reportsDir = resolve(previewsRoot, "reports");
const args = process.argv.slice(2);
const strictComparison = args.includes("--strict") || ["1", "true", "yes"].includes(String(process.env.STRICT_SCREENSHOT_COMPARE).toLowerCase());
const requestedBaseline = process.env.BASELINE_SNAPSHOT ?? args.find((arg) => arg !== "--strict");
const pixelDiffThreshold = Number(process.env.PIXEL_DIFF_THRESHOLD ?? "0");
const pixelColorThreshold = Number(process.env.PIXEL_COLOR_THRESHOLD ?? "0");

async function main() {
  const latestManifest = await readManifest(latestDir);
  const baselineDir = await resolveBaselineDir(latestManifest);
  const baselineManifest = await readManifest(baselineDir);
  const latestImages = await imageRecords(latestDir, latestManifest);
  const baselineImages = await imageRecords(baselineDir, baselineManifest);
  const baselineSummary = manifestSummary(baselineManifest, baselineDir);
  const latestSummary = manifestSummary(latestManifest, latestDir);
  const reportId = `${baselineSummary.snapshotId}-to-${latestSummary.snapshotId}`;
  const diffDir = join(reportsDir, reportId);
  const report = await buildReport({ baselineImages, baselineSummary, diffDir, latestImages, latestSummary });
  const reportPath = join(reportsDir, `${report.baseline.snapshotId}-to-${report.latest.snapshotId}.json`);
  const htmlReportPath = join(reportsDir, `${report.baseline.snapshotId}-to-${report.latest.snapshotId}.html`);
  const markdownReportPath = join(reportsDir, `${report.baseline.snapshotId}-to-${report.latest.snapshotId}.md`);
  const reviewDecisionPath = join(reportsDir, `${report.baseline.snapshotId}-to-${report.latest.snapshotId}.review.json`);
  const decisions = await readReviewDecisions(reviewDecisionPath);
  report.reviewDecisionSummary = reviewDecisionSummary(report, decisions);

  await mkdir(reportsDir, { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(htmlReportPath, htmlReport(report, htmlReportPath, reportPath));
  await writeFile(markdownReportPath, markdownReport(report, markdownReportPath, htmlReportPath, reportPath));

  console.log(
    `Compared ${report.baseline.snapshotId} to ${report.latest.snapshotId}: ${report.summary.added} added, ${report.summary.removed} removed, ${report.summary.changed} changed, ${report.summary.tolerated} tolerated, ${report.summary.unchanged} unchanged.`,
  );
  console.log(`Report written to ${reportPath}`);
  console.log(`HTML report written to ${htmlReportPath}`);
  console.log(`Markdown report written to ${markdownReportPath}`);

  if (strictComparison) {
    const strictResult = strictReviewResult(report, decisions);
    if (strictResult.unresolved.length) {
      console.error(
        `Strict screenshot comparison failed. ${strictResult.unresolved.length} blocking ${strictResult.unresolved.length === 1 ? "item needs" : "items need"} review before accepting this snapshot.`,
      );
      if (strictResult.accepted.length) {
        console.error(`${strictResult.accepted.length} blocking ${strictResult.accepted.length === 1 ? "item was" : "items were"} accepted from ${reviewDecisionPath}.`);
      }
      process.exitCode = 1;
    } else if (strictResult.accepted.length) {
      console.log(`${strictResult.accepted.length} blocking ${strictResult.accepted.length === 1 ? "item was" : "items were"} accepted from ${reviewDecisionPath}.`);
    }
  }
}

async function readManifest(dir) {
  const manifestPath = join(dir, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  return { ...manifest, manifestPath };
}

async function resolveBaselineDir(latestManifest) {
  if (requestedBaseline) {
    return resolve(snapshotsDir, requestedBaseline);
  }

  if (latestManifest.metadata?.snapshotId) {
    return resolve(snapshotsDir, latestManifest.metadata.snapshotId);
  }

  const snapshots = await readdir(snapshotsDir, { withFileTypes: true });
  const dirs = snapshots.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  if (!dirs.length) {
    throw new Error("No snapshot directories are available. Run npm run screenshots first.");
  }

  return resolve(snapshotsDir, dirs.at(-1));
}

async function imageRecords(rootDir, manifest) {
  const records = new Map();

  for (const theme of manifest.themes ?? []) {
    for (const kind of ["components", "groups"]) {
      for (const item of theme[kind] ?? []) {
        const relativePath = item.relativePath ?? join(theme.id, kind, `${slugify(item.name)}.png`);
        const path = join(rootDir, relativePath);
        const file = await stat(path);
        records.set(relativePath.replaceAll("\\", "/"), {
          kind,
          name: item.name,
          path,
          relativePath: relativePath.replaceAll("\\", "/"),
          sha256: await fileHash(path),
          size: file.size,
          theme: theme.id,
        });
      }
    }
  }

  return records;
}

async function buildReport({ baselineImages, baselineSummary, diffDir, latestImages, latestSummary }) {
  const added = [];
  const removed = [];
  const changed = [];
  const tolerated = [];
  const unchanged = [];
  const keys = Array.from(new Set([...baselineImages.keys(), ...latestImages.keys()])).sort();

  for (const key of keys) {
    const baseline = baselineImages.get(key);
    const latest = latestImages.get(key);

    if (!baseline && latest) {
      added.push(latest);
    } else if (baseline && !latest) {
      removed.push(baseline);
    } else if (baseline.sha256 !== latest.sha256 || baseline.size !== latest.size) {
      const record = await changedRecord({ baseline, diffDir, latest });
      if (record.diff.changedPixels === 0) {
        unchanged.push(latest);
      } else if (record.diff.changedRatio <= pixelDiffThreshold) {
        tolerated.push(record);
      } else {
        changed.push(record);
      }
    } else {
      unchanged.push(latest);
    }
  }

  return {
    comparedAt: new Date().toISOString(),
    baseline: baselineSummary,
    latest: latestSummary,
    thresholds: {
      pixelColorDistance: pixelColorThreshold,
      pixelDiffRatio: pixelDiffThreshold,
    },
    summary: {
      added: added.length,
      removed: removed.length,
      changed: changed.length,
      tolerated: tolerated.length,
      unchanged: unchanged.length,
      totalCompared: keys.length,
      changedPixels: changed.reduce((total, item) => total + item.diff.changedPixels, 0),
      toleratedPixels: tolerated.reduce((total, item) => total + item.diff.changedPixels, 0),
    },
    added,
    removed,
    tolerated,
    changed,
  };
}

async function changedRecord({ baseline, diffDir, latest }) {
  const diffRelativePath = latest.relativePath.replace(/\.png$/i, ".diff.png");
  const diffPath = join(diffDir, diffRelativePath);
  const diff = await diffImages({ baselinePath: baseline.path, diffPath, latestPath: latest.path });

  return {
    baseline,
    latest,
    diff: {
      ...diff,
      path: diffPath,
      relativePath: diffRelativePath.replaceAll("\\", "/"),
    },
  };
}

async function diffImages({ baselinePath, diffPath, latestPath }) {
  const baseline = PNG.sync.read(await readFile(baselinePath));
  const latest = PNG.sync.read(await readFile(latestPath));
  const width = Math.max(baseline.width, latest.width);
  const height = Math.max(baseline.height, latest.height);
  const diff = new PNG({ width, height });
  let changedPixels = 0;
  const totalPixels = width * height;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const outputIndex = (width * y + x) << 2;
      const baselinePixel = pixelAt(baseline, x, y);
      const latestPixel = pixelAt(latest, x, y);
      const changed = !samePixel(baselinePixel, latestPixel, pixelColorThreshold);

      if (changed) changedPixels += 1;
      writePixel(diff.data, outputIndex, changed ? [224, 48, 92, 255] : dimPixel(latestPixel ?? baselinePixel));
    }
  }

  await mkdir(dirname(diffPath), { recursive: true });
  await writeFile(diffPath, PNG.sync.write(diff));

  return {
    baselineSize: { width: baseline.width, height: baseline.height },
    latestSize: { width: latest.width, height: latest.height },
    changedPixels,
    totalPixels,
    changedRatio: totalPixels ? changedPixels / totalPixels : 0,
  };
}

function pixelAt(image, x, y) {
  if (x >= image.width || y >= image.height) return null;
  const index = (image.width * y + x) << 2;
  return [image.data[index], image.data[index + 1], image.data[index + 2], image.data[index + 3]];
}

function samePixel(left, right, colorThreshold) {
  if (!left || !right) return false;
  return colorDistance(left, right) <= colorThreshold;
}

function colorDistance(left, right) {
  return Math.hypot(left[0] - right[0], left[1] - right[1], left[2] - right[2], left[3] - right[3]);
}

function dimPixel(pixel) {
  if (!pixel) return [255, 255, 255, 255];
  const value = Math.round((pixel[0] + pixel[1] + pixel[2]) / 3);
  const dimmed = Math.round(238 + value * 0.04);
  return [dimmed, dimmed, dimmed, pixel[3]];
}

function writePixel(data, index, pixel) {
  data[index] = pixel[0];
  data[index + 1] = pixel[1];
  data[index + 2] = pixel[2];
  data[index + 3] = pixel[3];
}

export function markdownReport(report, markdownReportPath, htmlReportPath, jsonReportPath) {
  const status = reviewStatus(report);
  const jsonUrl = relativeUrl(markdownReportPath, jsonReportPath);
  const htmlUrl = relativeUrl(markdownReportPath, htmlReportPath);
  const sections = [
    markdownChangedSection("Changed", report.changed, markdownReportPath),
    markdownChangedSection("Tolerated", report.tolerated, markdownReportPath),
    markdownImageSection("Added", report.added, markdownReportPath),
    markdownImageSection("Removed", report.removed, markdownReportPath),
  ].join("\n");

  return `# Theme Preview Screenshot Report

${markdownEscape(report.baseline.snapshotId)} to ${markdownEscape(report.latest.snapshotId)}

**Status:** ${markdownEscape(status.title)}

${markdownEscape(status.detail)}

## Reports

- [HTML report](${htmlUrl})
- [JSON report](${jsonUrl})

## Summary

| Metric | Value |
| --- | ---: |
| Added | ${report.summary.added} |
| Removed | ${report.summary.removed} |
| Changed | ${report.summary.changed} |
| Tolerated | ${report.summary.tolerated} |
| Unchanged | ${report.summary.unchanged} |
| Total Compared | ${report.summary.totalCompared} |
| Changed Pixels | ${report.summary.changedPixels} |
| Tolerated Pixels | ${report.summary.toleratedPixels} |

## Metadata

| Field | Value |
| --- | --- |
| Baseline | ${markdownTableCell(report.baseline.dir)} |
| Latest | ${markdownTableCell(report.latest.dir)} |
| Color Threshold | ${report.thresholds.pixelColorDistance} |
| Pixel Threshold | ${report.thresholds.pixelDiffRatio} |
| Compared | ${markdownTableCell(report.comparedAt)} |

${markdownReviewCoverage(report)}

${sections}
`;
}

function markdownReviewCoverage(report) {
  const coverage = report.reviewDecisionSummary;
  if (!coverage || coverage.status === "none") {
    return "## Review Decisions\n\nNo blocking review decisions are recorded for this report.\n";
  }

  const stale = coverage.staleKeys.length ? `\n\nStale decision keys: ${coverage.staleKeys.map(markdownTableCell).join(", ")}` : "";
  const unresolved = coverage.unresolvedKeys.length ? `\n\nUnresolved decision keys: ${coverage.unresolvedKeys.map(markdownTableCell).join(", ")}` : "";

  return `## Review Decisions

Status: ${markdownTableCell(coverage.status)}

| Metric | Value |
| --- | ---: |
| Blocking Items | ${coverage.totalBlocking} |
| Accepted | ${coverage.accepted} |
| Dismissed | ${coverage.dismissed} |
| Unresolved | ${coverage.unresolved} |
| Stale | ${coverage.stale} |${unresolved}${stale}
`;
}

function markdownChangedSection(title, items, markdownReportPath) {
  if (!items.length) {
    return `## ${title}\n\nNo ${title.toLowerCase()} previews.\n`;
  }

  const rows = items
    .map((item) => {
      const preview = `${item.latest.theme} / ${item.latest.kind} / ${item.latest.name}`;
      const baselineUrl = relativeUrl(markdownReportPath, item.baseline.path);
      const latestUrl = relativeUrl(markdownReportPath, item.latest.path);
      const diffUrl = relativeUrl(markdownReportPath, item.diff.path);
      return `| ${markdownTableCell(preview)} | ${item.diff.changedPixels} | ${formatPercent(item.diff.changedRatio)} | [baseline](${baselineUrl}) | [latest](${latestUrl}) | [diff](${diffUrl}) |`;
    })
    .join("\n");

  return `## ${title}

| Preview | Pixels | Ratio | Baseline | Latest | Diff |
| --- | ---: | ---: | --- | --- | --- |
${rows}
`;
}

function markdownImageSection(title, items, markdownReportPath) {
  if (!items.length) {
    return `## ${title}\n\nNo ${title.toLowerCase()} previews.\n`;
  }

  const rows = items
    .map((item) => {
      const preview = `${item.theme} / ${item.kind} / ${item.name}`;
      const imageUrl = relativeUrl(markdownReportPath, item.path);
      return `| ${markdownTableCell(preview)} | ${markdownTableCell(item.relativePath)} | [preview](${imageUrl}) |`;
    })
    .join("\n");

  return `## ${title}

| Preview | Path | Image |
| --- | --- | --- |
${rows}
`;
}

export function htmlReport(report, htmlReportPath, jsonReportPath) {
  const status = reviewStatus(report);
  const sections = [
    imageSection("Changed", report.changed, htmlReportPath, changedCard),
    imageSection("Tolerated", report.tolerated, htmlReportPath, changedCard),
    imageSection("Added", report.added, htmlReportPath, singleImageCard),
    imageSection("Removed", report.removed, htmlReportPath, singleImageCard),
  ].join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Theme Preview Screenshot Report</title>
  <style>
    :root { color: #1c2430; background: #eef2f7; font-family: Inter, "Segoe UI", system-ui, sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; }
    main { max-width: 1180px; margin: 0 auto; display: grid; gap: 18px; }
    header { display: grid; gap: 10px; }
    h1, h2, p { margin: 0; }
    h1 { font-size: 1.7rem; }
    h2 { font-size: 1.08rem; }
    a { color: #0f7476; font-weight: 800; }
    .meta, .summary, .cards, .status-actions { display: grid; gap: 10px; }
    .status-actions { grid-template-columns: repeat(auto-fit, minmax(150px, max-content)); }
    .summary { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
    .pill, .card, .meta, .status, .review-decisions { border: 1px solid #d1d9e6; border-radius: 8px; background: #fff; }
    .pill { padding: 10px; }
    .pill span, .card span, .meta span, .status span { display: block; color: #667085; font-size: 0.74rem; font-weight: 800; text-transform: uppercase; }
    .pill strong { display: block; margin-top: 3px; font-size: 1.25rem; }
    .meta { padding: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
    .status { padding: 14px; display: grid; gap: 6px; border-left-width: 6px; }
    .status strong { font-size: 1.1rem; }
    .status.ready { border-left-color: #198754; }
    .status.tolerated { border-left-color: #b7791f; }
    .status.review { border-left-color: #c2413d; }
    .review-decisions { padding: 12px; display: grid; gap: 8px; border-left: 6px solid #94a3b8; }
    .review-decisions.reviewed { border-left-color: #198754; }
    .review-decisions.partial, .review-decisions.partial-with-stale, .review-decisions.stale, .review-decisions.reviewed-with-stale { border-left-color: #b7791f; }
    .review-decisions.missing, .review-decisions.missing-with-stale { border-left-color: #c2413d; }
    .review-decisions ul { margin: 0; padding-left: 18px; color: #52627a; font-size: 0.82rem; }
    button { min-height: 34px; padding: 0 11px; border: 1px solid #b9c6d8; border-radius: 8px; color: #263141; background: #fff; font: inherit; font-weight: 800; cursor: pointer; }
    section { display: grid; gap: 10px; }
    .cards { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
    .card { padding: 12px; display: grid; gap: 10px; }
    .card header { display: flex; align-items: start; justify-content: space-between; gap: 12px; }
    .card code { overflow-wrap: anywhere; color: #52627a; font-size: 0.76rem; }
    .images { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
    .note { display: grid; gap: 5px; }
    .note label { color: #52627a; font-size: 0.78rem; font-weight: 800; }
    .note textarea { width: 100%; min-height: 76px; resize: vertical; padding: 9px; border: 1px solid #cbd5e1; border-radius: 8px; color: #1c2430; font: inherit; }
    .note small { color: #667085; font-size: 0.72rem; }
    figure { margin: 0; display: grid; gap: 5px; }
    figcaption { color: #667085; font-size: 0.76rem; font-weight: 800; }
    img { width: 100%; border: 1px solid #dbe2ec; border-radius: 8px; background: #fff; }
    .empty { padding: 14px; border: 1px dashed #cbd5e1; border-radius: 8px; color: #667085; background: #fff; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Theme Preview Screenshot Report</h1>
      <p>${escapeHtml(report.baseline.snapshotId)} to ${escapeHtml(report.latest.snapshotId)}</p>
    </header>
    <div class="status ${status.kind}">
      <span>Review Status</span>
      <strong>${escapeHtml(status.title)}</strong>
      <p>${escapeHtml(status.detail)}</p>
      <div class="status-actions">
        <p><a href="${relativeUrl(htmlReportPath, jsonReportPath)}">Open JSON report</a></p>
        <button type="button" id="export-notes">Export review notes</button>
      </div>
    </div>
    <div class="summary">
      ${summaryPill("Added", report.summary.added)}
      ${summaryPill("Removed", report.summary.removed)}
      ${summaryPill("Changed", report.summary.changed)}
      ${summaryPill("Tolerated", report.summary.tolerated)}
      ${summaryPill("Unchanged", report.summary.unchanged)}
      ${summaryPill("Changed Pixels", report.summary.changedPixels)}
    </div>
    <div class="meta">
      <p><span>Baseline</span>${escapeHtml(report.baseline.dir)}</p>
      <p><span>Latest</span>${escapeHtml(report.latest.dir)}</p>
      <p><span>Color Threshold</span>${report.thresholds.pixelColorDistance}</p>
      <p><span>Pixel Threshold</span>${report.thresholds.pixelDiffRatio}</p>
      <p><span>Compared</span>${escapeHtml(report.comparedAt)}</p>
    </div>
    ${htmlReviewCoverage(report)}
    ${sections}
  </main>
  <script>
    const reportInfo = ${JSON.stringify({
      baseline: report.baseline.snapshotId,
      comparedAt: report.comparedAt,
      latest: report.latest.snapshotId,
    })};
    for (const note of document.querySelectorAll("[data-note-key]")) {
      const key = "theme-preview-report-note:" + note.dataset.noteKey;
      note.value = localStorage.getItem(key) || "";
      note.addEventListener("input", () => localStorage.setItem(key, note.value));
    }
    document.getElementById("export-notes").addEventListener("click", () => {
      const notes = [...document.querySelectorAll("[data-note-key]")]
        .map((note) => ({ preview: note.dataset.noteKey, note: note.value.trim() }))
        .filter((entry) => entry.note);
      const payload = { ...reportInfo, exportedAt: new Date().toISOString(), notes };
      const blob = new Blob([JSON.stringify(payload, null, 2) + "\\n"], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "review-notes-" + reportInfo.baseline + "-to-" + reportInfo.latest + ".json";
      link.click();
      URL.revokeObjectURL(link.href);
    });
  </script>
</body>
</html>
`;
}

function htmlReviewCoverage(report) {
  const coverage = report.reviewDecisionSummary;
  if (!coverage || coverage.status === "none") {
    return `<section class="review-decisions"><span>Review Decisions</span><strong>No blocking decisions recorded</strong><p>No blocking review decisions are recorded for this report.</p></section>`;
  }

  const stale = coverage.staleKeys.length
    ? `<p><span>Stale Decision Keys</span></p><ul>${coverage.staleKeys.map((key) => `<li>${escapeHtml(key)}</li>`).join("")}</ul>`
    : "";
  const unresolved = coverage.unresolvedKeys.length
    ? `<p><span>Unresolved Decision Keys</span></p><ul>${coverage.unresolvedKeys.map((key) => `<li>${escapeHtml(key)}</li>`).join("")}</ul>`
    : "";

  return `<section class="review-decisions ${escapeHtml(coverage.status)}">
      <span>Review Decisions</span>
      <strong>${escapeHtml(reviewCoverageTitle(coverage.status))}</strong>
      <p>${coverage.accepted} accepted, ${coverage.dismissed} dismissed, ${coverage.unresolved} unresolved, ${coverage.stale} stale decision ${coverage.stale === 1 ? "key" : "keys"}.</p>
      ${unresolved}
      ${stale}
    </section>`;
}

function reviewCoverageTitle(status) {
  switch (status) {
    case "reviewed":
      return "All blocking items accepted";
    case "reviewed-with-stale":
      return "All blocking items accepted, with stale decisions";
    case "partial":
      return "Partial review coverage";
    case "partial-with-stale":
      return "Partial review coverage, with stale decisions";
    case "missing":
      return "Missing review decisions";
    case "missing-with-stale":
      return "Missing review decisions, with stale decisions";
    case "stale":
      return "Only stale review decisions found";
    default:
      return "Review decision coverage";
  }
}

function reviewStatus(report) {
  const blocking = report.summary.added + report.summary.removed + report.summary.changed;
  if (blocking > 0) {
    return {
      kind: "review",
      title: "Needs review",
      detail: `${blocking} preview ${blocking === 1 ? "item needs" : "items need"} review before accepting this snapshot.`,
    };
  }

  if (report.summary.tolerated > 0) {
    return {
      kind: "tolerated",
      title: "Review tolerated drift",
      detail: `${report.summary.tolerated} preview ${report.summary.tolerated === 1 ? "difference is" : "differences are"} within the configured threshold.`,
    };
  }

  return {
    kind: "ready",
    title: "All clear",
    detail: "No preview additions, removals, or image differences were found.",
  };
}

async function readReviewDecisions(path) {
  try {
    const exportFile = JSON.parse(await readFile(path, "utf8"));
    return new Map(
      (exportFile.decisions ?? [])
        .filter((item) => item.decision === "accepted" || item.decision === "dismissed")
        .map((item) => [item.key, item.decision]),
    );
  } catch (error) {
    if (error?.code === "ENOENT") {
      return new Map();
    }

    throw new Error(`Could not read review decisions ${path}: ${error.message}`);
  }
}

export function strictReviewResult(report, decisions) {
  const blockingItems = blockingReviewItems(report);
  return {
    accepted: blockingItems.filter((item) => decisions.get(item.key) === "accepted"),
    unresolved: blockingItems.filter((item) => decisions.get(item.key) !== "accepted"),
  };
}

export function reviewDecisionSummary(report, decisions) {
  const blockingItems = blockingReviewItems(report);
  const blockingKeys = new Set(blockingItems.map((item) => item.key));
  const accepted = blockingItems.filter((item) => decisions.get(item.key) === "accepted");
  const dismissed = blockingItems.filter((item) => decisions.get(item.key) === "dismissed");
  const unresolved = blockingItems.filter((item) => !decisions.has(item.key));
  const stale = Array.from(decisions.keys()).filter((key) => !blockingKeys.has(key)).sort();

  return {
    accepted: accepted.length,
    dismissed: dismissed.length,
    stale: stale.length,
    totalBlocking: blockingItems.length,
    unresolved: unresolved.length,
    status: reviewDecisionCoverageStatus({ accepted, blockingItems, dismissed, stale, unresolved }),
    staleKeys: stale,
    unresolvedKeys: unresolved.map((item) => item.key),
  };
}

function reviewDecisionCoverageStatus({ accepted, blockingItems, dismissed, stale, unresolved }) {
  if (!blockingItems.length && stale.length) return "stale";
  if (!blockingItems.length) return "none";
  if (!unresolved.length && !dismissed.length && accepted.length === blockingItems.length) return stale.length ? "reviewed-with-stale" : "reviewed";
  if (accepted.length || dismissed.length) return stale.length ? "partial-with-stale" : "partial";
  return stale.length ? "missing-with-stale" : "missing";
}

export function blockingReviewItems(report) {
  return [
    ...report.changed.map((item) => ({
      key: `changed:${item.latest.relativePath}`,
      label: `${item.latest.theme} ${item.latest.kind} ${item.latest.name}`,
    })),
    ...report.added.map((item) => ({
      key: `added:${item.relativePath}`,
      label: `${item.theme} ${item.kind} ${item.name}`,
    })),
    ...report.removed.map((item) => ({
      key: `removed:${item.relativePath}`,
      label: `${item.theme} ${item.kind} ${item.name}`,
    })),
  ];
}

function summaryPill(label, value) {
  return `<div class="pill"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`;
}

function imageSection(title, items, htmlReportPath, renderCard) {
  if (!items.length) {
    return `<section><h2>${escapeHtml(title)}</h2><p class="empty">No ${escapeHtml(title.toLowerCase())} previews.</p></section>`;
  }

  return `<section><h2>${escapeHtml(title)}</h2><div class="cards">${items.map((item) => renderCard(item, htmlReportPath)).join("\n")}</div></section>`;
}

function changedCard(item, htmlReportPath) {
  return `<article class="card">
    <header>
      <div>
        <span>${escapeHtml(item.latest.theme)} ${escapeHtml(item.latest.kind)}</span>
        <strong>${escapeHtml(item.latest.name)}</strong>
      </div>
      <code>${formatPercent(item.diff.changedRatio)} changed</code>
    </header>
    <p>${item.diff.changedPixels} of ${item.diff.totalPixels} pixels differ.</p>
    <div class="images">
      ${figure("Baseline", item.baseline.path, htmlReportPath)}
      ${figure("Latest", item.latest.path, htmlReportPath)}
      ${figure("Diff", item.diff.path, htmlReportPath)}
    </div>
    ${noteField(item.latest.relativePath)}
  </article>`;
}

function singleImageCard(item, htmlReportPath) {
  return `<article class="card">
    <header>
      <div>
        <span>${escapeHtml(item.theme)} ${escapeHtml(item.kind)}</span>
        <strong>${escapeHtml(item.name)}</strong>
      </div>
      <code>${escapeHtml(item.relativePath)}</code>
    </header>
    <div class="images">${figure("Preview", item.path, htmlReportPath)}</div>
    ${noteField(item.relativePath)}
  </article>`;
}

function noteField(key) {
  return `<div class="note"><label for="note-${slugify(key)}">Review note</label><textarea id="note-${slugify(key)}" data-note-key="${escapeHtml(key)}" placeholder="Decision, owner, or follow-up"></textarea><small>Saved in this browser.</small></div>`;
}

function figure(label, imagePath, htmlReportPath) {
  return `<figure><img alt="${escapeHtml(label)}" src="${relativeUrl(htmlReportPath, imagePath)}"><figcaption>${escapeHtml(label)}</figcaption></figure>`;
}

function relativeUrl(fromPath, toPath) {
  return relative(dirname(fromPath), toPath).replaceAll("\\", "/").split("/").map(encodeURIComponent).join("/");
}

function formatPercent(value) {
  return `${(value * 100).toFixed(3)}%`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function markdownTableCell(value) {
  return markdownEscape(value).replaceAll("|", "\\|");
}

function markdownEscape(value) {
  return String(value).replaceAll("\\", "\\\\");
}

function manifestSummary(manifest, dir) {
  const dirName = basename(dir);
  return {
    dir,
    manifestPath: manifest.manifestPath,
    metadataHash: manifest.metadata?.hash ?? null,
    snapshotId: dirName === "latest" ? manifestSnapshotId(manifest, dir) : dirName,
    metadataSnapshotId: manifest.metadata?.snapshotId ?? null,
    capturedAt: manifest.capturedAt ?? null,
  };
}

function manifestSnapshotId(manifest, dir) {
  return manifest.metadata?.snapshotId ?? basename(dir);
}

async function fileHash(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
