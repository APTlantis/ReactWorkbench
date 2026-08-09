import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emptyReviewProgressCopy,
  filterReportReviewItems,
  loadedReviewDecisionMessage,
  loadedReviewDecisionSummary,
  normalizeReportFilters,
  parseReportFilters,
  parseStoredReviewDecisionResult,
  parseStoredReviewDecisions,
  pruneReviewDecisions,
  reviewDecisionSourceMessage,
  reviewDecisionSourceSummary,
  reviewDecisionExportPayload,
  reviewItemKey,
  reviewedReportStatus,
  reportReviewTotals,
  staleLocalDecisionActionLabel,
  storedReviewDecisionWarningMessage,
  uniqueReportValues,
  type ReportReviewItem,
} from "../src/report-review.ts";

const items: ReportReviewItem[] = [
  { status: "changed", theme: "light", kind: "components", relativePath: "light/components/button.png" },
  { status: "changed", theme: "dark", kind: "components", relativePath: "dark/components/button.png" },
  { status: "added", theme: "dark", kind: "groups", relativePath: "dark/groups/settings-row.png" },
  { status: "removed", theme: "aurora", kind: "groups", relativePath: "aurora/groups/dialog-footer.png" },
  { status: "tolerated", theme: "aurora", kind: "components", relativePath: "aurora/components/badge.png" },
];

describe("screenshot report review helpers", () => {
  it("filters review items by status, theme, and kind", () => {
    assert.deepEqual(filterReportReviewItems(items, { status: "changed", theme: "dark", kind: "components" }), [
      { status: "changed", theme: "dark", kind: "components", relativePath: "dark/components/button.png" },
    ]);
  });

  it("treats all filter dimensions as pass-through", () => {
    assert.equal(filterReportReviewItems(items, { status: "all", theme: "all", kind: "all" }).length, items.length);
  });

  it("returns sorted unique option values", () => {
    assert.deepEqual(uniqueReportValues(items, (item) => item.theme), ["aurora", "dark", "light"]);
    assert.deepEqual(uniqueReportValues(items, (item) => item.kind), ["components", "groups"]);
  });

  it("builds sorted totals for clickable report breakdowns", () => {
    assert.deepEqual(reportReviewTotals(items, (item) => item.theme), [
      {
        label: "aurora",
        added: 0,
        changed: 0,
        removed: 1,
        tolerated: 1,
        total: 2,
      },
      {
        label: "dark",
        added: 1,
        changed: 1,
        removed: 0,
        tolerated: 0,
        total: 2,
      },
      {
        label: "light",
        added: 0,
        changed: 1,
        removed: 0,
        tolerated: 0,
        total: 1,
      },
    ]);
  });

  it("falls back to all filters when saved filters are absent or malformed", () => {
    assert.deepEqual(parseReportFilters(null), { status: "all", theme: "all", kind: "all" });
    assert.deepEqual(parseReportFilters("{bad json"), { status: "all", theme: "all", kind: "all" });
    assert.deepEqual(parseReportFilters(JSON.stringify({ status: "changed" })), {
      status: "changed",
      theme: "all",
      kind: "all",
    });
  });

  it("normalizes stale saved filters against current report options", () => {
    assert.deepEqual(
      normalizeReportFilters(
        {
          status: "changed",
          theme: "missing-theme",
          kind: "groups",
        },
        {
          statuses: ["added", "changed"],
          themes: ["dark", "light"],
          kinds: ["components", "groups"],
        },
      ),
      {
        status: "changed",
        theme: "all",
        kind: "groups",
      },
    );
  });

  it("builds stable review item keys", () => {
    assert.equal(reviewItemKey(items[0]), "changed:light/components/button.png");
  });

  it("builds export payloads with only current sorted decisions", () => {
    assert.deepEqual(
      reviewDecisionExportPayload(
        {
          reportPath: "reports/base-to-latest.json",
          baselineSnapshotId: "base",
          latestSnapshotId: "latest",
          reviewItems: items,
        },
        {
          "removed:aurora/groups/dialog-footer.png": "dismissed",
          "changed:light/components/button.png": "accepted",
          "changed:old/path.png": "accepted",
        },
        "2026-08-09T00:00:00.000Z",
      ),
      {
        reportPath: "reports/base-to-latest.json",
        baselineSnapshotId: "base",
        latestSnapshotId: "latest",
        exportedAt: "2026-08-09T00:00:00.000Z",
        accepted: 1,
        dismissed: 1,
        decisions: [
          {
            key: "changed:light/components/button.png",
            decision: "accepted",
          },
          {
            key: "removed:aurora/groups/dialog-footer.png",
            decision: "dismissed",
          },
        ],
      },
    );
  });

  it("summarizes loaded decisions that no longer match current review items", () => {
    assert.deepEqual(
      loadedReviewDecisionSummary(items, [
        {
          key: "changed:light/components/button.png",
          decision: "accepted",
        },
        {
          key: "changed:old/path.png",
          decision: "accepted",
        },
      ]),
      {
        current: 1,
        stale: 1,
        total: 2,
      },
    );
  });

  it("prunes stale local review decisions", () => {
    assert.deepEqual(
      pruneReviewDecisions(items, {
        "changed:light/components/button.png": "accepted",
        "changed:old/path.png": "dismissed",
      }),
      {
        "changed:light/components/button.png": "accepted",
      },
    );
  });

  it("formats loaded decision progress copy", () => {
    assert.equal(loadedReviewDecisionMessage({ current: 0, stale: 0, total: 0 }), "");
    assert.equal(loadedReviewDecisionMessage({ current: 1, stale: 0, total: 1 }), "1 exported decision matches 1 current item.");
    assert.equal(loadedReviewDecisionMessage({ current: 2, stale: 0, total: 2 }), "2 exported decisions match 2 current items.");
    assert.equal(
      loadedReviewDecisionMessage({ current: 1, stale: 1, total: 2 }),
      "1 exported decision matches 1 current item · 1 stale decision in exported file.",
    );
    assert.equal(
      loadedReviewDecisionMessage({ current: 2, stale: 3, total: 5 }),
      "2 exported decisions match 2 current items · 3 stale decisions in exported file.",
    );
  });

  it("summarizes current review decision sources", () => {
    assert.deepEqual(
      reviewDecisionSourceSummary(
        items,
        [
          {
            key: "changed:light/components/button.png",
            decision: "accepted",
          },
          {
            key: "removed:aurora/groups/dialog-footer.png",
            decision: "dismissed",
          },
          {
            key: "changed:old/path.png",
            decision: "accepted",
          },
        ],
        {
          "changed:light/components/button.png": "dismissed",
          "added:dark/groups/settings-row.png": "accepted",
          "changed:stale/path.png": "accepted",
        },
      ),
      {
        exported: 1,
        local: 2,
        total: 3,
      },
    );
  });

  it("formats review decision source copy", () => {
    assert.equal(reviewDecisionSourceMessage({ exported: 0, local: 0, total: 0 }), "");
    assert.equal(reviewDecisionSourceMessage({ exported: 0, local: 1, total: 1 }), "Review source: 1 local browser decision.");
    assert.equal(reviewDecisionSourceMessage({ exported: 2, local: 0, total: 2 }), "Review source: 2 exported decisions.");
    assert.equal(
      reviewDecisionSourceMessage({ exported: 1, local: 2, total: 3 }),
      "Review source: 2 local browser decisions · 1 exported decision.",
    );
  });

  it("formats stale local cleanup labels", () => {
    assert.equal(staleLocalDecisionActionLabel(0), "");
    assert.equal(staleLocalDecisionActionLabel(1), "Clear 1 Stale Local Decision");
    assert.equal(staleLocalDecisionActionLabel(3), "Clear 3 Stale Local Decisions");
  });

  it("parses saved browser review decisions defensively", () => {
    assert.deepEqual(parseStoredReviewDecisions(null), {});
    assert.deepEqual(parseStoredReviewDecisions("{bad json"), {});
    assert.deepEqual(parseStoredReviewDecisionResult("{bad json"), {
      decisions: {},
      ignoredMalformed: true,
    });
    assert.deepEqual(
      parseStoredReviewDecisions(
        JSON.stringify({
          "added:dark/groups/settings-row.png": "accepted",
          "changed:light/components/button.png": "dismissed",
          "removed:aurora/groups/dialog-footer.png": "pending",
          "tolerated:aurora/components/badge.png": true,
        }),
      ),
      {
        "added:dark/groups/settings-row.png": "accepted",
        "changed:light/components/button.png": "dismissed",
      },
    );
    assert.deepEqual(
      parseStoredReviewDecisionResult(
        JSON.stringify({
          "added:dark/groups/settings-row.png": "accepted",
          "changed:light/components/button.png": "dismissed",
          "removed:aurora/groups/dialog-footer.png": "pending",
        }),
      ),
      {
        decisions: {
          "added:dark/groups/settings-row.png": "accepted",
          "changed:light/components/button.png": "dismissed",
        },
        ignoredMalformed: true,
      },
    );
  });

  it("formats malformed browser review decision warnings", () => {
    assert.equal(storedReviewDecisionWarningMessage(false), "");
    assert.equal(
      storedReviewDecisionWarningMessage(true),
      "Some saved browser review decisions were ignored because they were malformed.",
    );
  });

  it("formats empty review progress copy", () => {
    assert.deepEqual(emptyReviewProgressCopy(), {
      title: "No review items",
      detail: "All compared previews are ready or unchanged.",
    });
  });

  it("formats final reviewed report status", () => {
    assert.deepEqual(
      reviewedReportStatus({
        acceptedCount: 3,
        dismissedCount: 0,
        fallbackDetail: "Needs review.",
        fallbackStatus: "review",
        fallbackTitle: "Needs review",
        total: 3,
      }),
      {
        status: "reviewed",
        title: "Reviewed",
        detail: "All review items have been accepted for this report.",
      },
    );
  });

  it("formats mixed accepted and dismissed report status", () => {
    assert.deepEqual(
      reviewedReportStatus({
        acceptedCount: 2,
        dismissedCount: 1,
        fallbackDetail: "Needs review.",
        fallbackStatus: "review",
        fallbackTitle: "Needs review",
        total: 3,
      }),
      {
        status: "tolerated",
        title: "Review complete",
        detail: "2 accepted decisions and 1 dismissed decision for this report.",
      },
    );

    assert.deepEqual(
      reviewedReportStatus({
        acceptedCount: 1,
        dismissedCount: 2,
        fallbackDetail: "Needs review.",
        fallbackStatus: "review",
        fallbackTitle: "Needs review",
        total: 3,
      }),
      {
        status: "tolerated",
        title: "Review complete",
        detail: "1 accepted decision and 2 dismissed decisions for this report.",
      },
    );
  });

  it("keeps generated report status while review is incomplete", () => {
    assert.deepEqual(
      reviewedReportStatus({
        acceptedCount: 1,
        dismissedCount: 0,
        fallbackDetail: "Two previews changed.",
        fallbackStatus: "review",
        fallbackTitle: "Needs review",
        total: 3,
      }),
      {
        status: "review",
        title: "Needs review",
        detail: "Two previews changed.",
      },
    );
  });
});
