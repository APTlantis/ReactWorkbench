import assert from "node:assert/strict";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { blockingReviewItems, htmlReport, markdownReport, reviewDecisionSummary, strictReviewResult } from "./compare-previews.mjs";

const reportFixture = {
  added: [
    {
      kind: "components",
      name: "Badge",
      relativePath: "aurora/components/badge.png",
      theme: "aurora",
    },
  ],
  changed: [
    {
      latest: {
        kind: "groups",
        name: "Settings Row",
        relativePath: "light/groups/settings-row.png",
        theme: "light",
      },
    },
  ],
  removed: [
    {
      kind: "components",
      name: "Button",
      relativePath: "dark/components/button.png",
      theme: "dark",
    },
  ],
};

const reportRenderFixture = {
  baseline: {
    dir: resolve("artifacts/previews/snapshots/base"),
    snapshotId: "base",
  },
  latest: {
    dir: resolve("artifacts/previews/latest"),
    snapshotId: "latest",
  },
  comparedAt: "2026-08-09T00:00:00.000Z",
  thresholds: {
    pixelColorDistance: 0,
    pixelDiffRatio: 0,
  },
  summary: {
    added: 1,
    removed: 0,
    changed: 1,
    tolerated: 0,
    unchanged: 0,
    totalCompared: 2,
    changedPixels: 12,
    toleratedPixels: 0,
  },
  added: [
    {
      kind: "components",
      name: "Badge",
      path: resolve("artifacts/previews/latest/aurora/components/badge.png"),
      relativePath: "aurora/components/badge.png",
      theme: "aurora",
    },
  ],
  changed: [
    {
      baseline: {
        path: resolve("artifacts/previews/snapshots/base/light/groups/settings-row.png"),
      },
      latest: {
        kind: "groups",
        name: "Settings Row",
        path: resolve("artifacts/previews/latest/light/groups/settings-row.png"),
        relativePath: "light/groups/settings-row.png",
        theme: "light",
      },
      diff: {
        changedPixels: 12,
        changedRatio: 0.012,
        path: resolve("artifacts/previews/reports/base-to-latest/light/groups/settings-row.diff.png"),
        totalPixels: 1000,
      },
    },
  ],
  removed: [],
  tolerated: [],
};

const reportRenderFixtureWithCoverage = {
  ...reportRenderFixture,
  reviewDecisionSummary: {
    accepted: 1,
    dismissed: 0,
    stale: 1,
    staleKeys: ["changed:old/path.png"],
    status: "partial-with-stale",
    totalBlocking: 2,
    unresolved: 1,
    unresolvedKeys: ["added:aurora/components/badge.png"],
  },
};

describe("strict screenshot review decisions", () => {
  it("builds stable review keys for blocking report items", () => {
    assert.deepEqual(
      blockingReviewItems(reportFixture).map((item) => item.key),
      ["changed:light/groups/settings-row.png", "added:aurora/components/badge.png", "removed:dark/components/button.png"],
    );
  });

  it("treats accepted blocking items as reviewed", () => {
    const decisions = new Map([
      ["changed:light/groups/settings-row.png", "accepted"],
      ["added:aurora/components/badge.png", "accepted"],
      ["removed:dark/components/button.png", "accepted"],
    ]);

    const result = strictReviewResult(reportFixture, decisions);

    assert.equal(result.accepted.length, 3);
    assert.equal(result.unresolved.length, 0);
  });

  it("keeps dismissed or missing blocking items unresolved", () => {
    const decisions = new Map([
      ["changed:light/groups/settings-row.png", "accepted"],
      ["added:aurora/components/badge.png", "dismissed"],
    ]);

    const result = strictReviewResult(reportFixture, decisions);

    assert.deepEqual(
      result.unresolved.map((item) => item.key),
      ["added:aurora/components/badge.png", "removed:dark/components/button.png"],
    );
  });

  it("summarizes partial and stale review decision coverage", () => {
    const decisions = new Map([
      ["changed:light/groups/settings-row.png", "accepted"],
      ["changed:old/path.png", "accepted"],
    ]);

    assert.deepEqual(reviewDecisionSummary(reportRenderFixture, decisions), {
      accepted: 1,
      dismissed: 0,
      stale: 1,
      totalBlocking: 2,
      unresolved: 1,
      status: "partial-with-stale",
      staleKeys: ["changed:old/path.png"],
      unresolvedKeys: ["added:aurora/components/badge.png"],
    });
  });
});

describe("screenshot report links", () => {
  const markdownPath = resolve("artifacts/previews/reports/base-to-latest.md");
  const htmlPath = resolve("artifacts/previews/reports/base-to-latest.html");
  const jsonPath = resolve("artifacts/previews/reports/base-to-latest.json");

  it("writes relative Markdown links to report files and review images", () => {
    const markdown = markdownReport(reportRenderFixtureWithCoverage, markdownPath, htmlPath, jsonPath);

    assert.match(markdown, /- \[HTML report\]\(base-to-latest\.html\)/);
    assert.match(markdown, /- \[JSON report\]\(base-to-latest\.json\)/);
    assert.match(markdown, /\[baseline\]\(\.\.\/snapshots\/base\/light\/groups\/settings-row\.png\)/);
    assert.match(markdown, /\[latest\]\(\.\.\/latest\/light\/groups\/settings-row\.png\)/);
    assert.match(markdown, /\[diff\]\(base-to-latest\/light\/groups\/settings-row\.diff\.png\)/);
    assert.match(markdown, /\[preview\]\(\.\.\/latest\/aurora\/components\/badge\.png\)/);
    assert.match(markdown, /Status: partial-with-stale/);
    assert.match(markdown, /Unresolved decision keys: added:aurora\/components\/badge\.png/);
    assert.match(markdown, /Stale decision keys: changed:old\/path\.png/);
  });

  it("writes relative HTML links to JSON and review images", () => {
    const html = htmlReport(reportRenderFixtureWithCoverage, htmlPath, jsonPath);

    assert.match(html, /href="base-to-latest\.json"/);
    assert.match(html, /src="\.\.\/snapshots\/base\/light\/groups\/settings-row\.png"/);
    assert.match(html, /src="\.\.\/latest\/light\/groups\/settings-row\.png"/);
    assert.match(html, /src="base-to-latest\/light\/groups\/settings-row\.diff\.png"/);
    assert.match(html, /src="\.\.\/latest\/aurora\/components\/badge\.png"/);
    assert.match(html, /Partial review coverage, with stale decisions/);
    assert.match(html, /added:aurora\/components\/badge\.png/);
    assert.match(html, /changed:old\/path\.png/);
  });
});
