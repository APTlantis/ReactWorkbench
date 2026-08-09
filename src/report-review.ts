export type ReportReviewStatus = "changed" | "added" | "removed" | "tolerated";
export type ReviewDecision = "accepted" | "dismissed";

export type ReportReviewItem = {
  status: ReportReviewStatus;
  theme: string;
  kind: string;
  relativePath: string;
};

export type ReportReviewFilters = {
  status: string;
  theme: string;
  kind: string;
};

export type ReportReviewTotal = {
  label: string;
  added: number;
  changed: number;
  removed: number;
  tolerated: number;
  total: number;
};

export type ReportReviewDecisionExportReport = {
  reportPath: string;
  baselineSnapshotId: string;
  latestSnapshotId: string;
  reviewItems: ReportReviewItem[];
};

export type ReportReviewDecision = {
  key: string;
  decision: ReviewDecision;
};

export type LoadedReviewDecisionSummary = {
  current: number;
  stale: number;
  total: number;
};

export type ReviewDecisionSourceSummary = {
  exported: number;
  local: number;
  total: number;
};

export type StoredReviewDecisionParseResult = {
  decisions: Record<string, ReviewDecision>;
  ignoredMalformed: boolean;
};

export type ReviewStatusInput = {
  acceptedCount: number;
  dismissedCount: number;
  fallbackDetail: string;
  fallbackStatus: string;
  fallbackTitle: string;
  total: number;
};

export type ReviewStatusCopy = {
  status: string;
  title: string;
  detail: string;
};

export type EmptyReviewProgressCopy = {
  title: string;
  detail: string;
};

export function uniqueReportValues<T extends ReportReviewItem>(items: T[], getValue: (item: T) => string) {
  return Array.from(new Set(items.map(getValue))).sort((left, right) => left.localeCompare(right));
}

export function filterReportReviewItems<T extends ReportReviewItem>(items: T[], filters: ReportReviewFilters) {
  return items.filter((item) => {
    if (filters.status !== "all" && item.status !== filters.status) return false;
    if (filters.theme !== "all" && item.theme !== filters.theme) return false;
    if (filters.kind !== "all" && item.kind !== filters.kind) return false;
    return true;
  });
}

export function reviewItemKey(item: ReportReviewItem) {
  return `${item.status}:${item.relativePath}`;
}

export function reviewDecisionExportPayload(
  report: ReportReviewDecisionExportReport,
  decisions: Record<string, ReviewDecision>,
  exportedAt = new Date().toISOString(),
) {
  const currentItemKeys = new Set(report.reviewItems.map(reviewItemKey));
  const entries = Object.entries(decisions)
    .filter(([key]) => currentItemKeys.has(key))
    .map(([key, decision]) => ({ key, decision }))
    .sort((left, right) => left.key.localeCompare(right.key));

  return {
    reportPath: report.reportPath,
    baselineSnapshotId: report.baselineSnapshotId,
    latestSnapshotId: report.latestSnapshotId,
    exportedAt,
    accepted: entries.filter((entry) => entry.decision === "accepted").length,
    dismissed: entries.filter((entry) => entry.decision === "dismissed").length,
    decisions: entries,
  };
}

export function loadedReviewDecisionSummary(
  reviewItems: ReportReviewItem[],
  loadedDecisions: ReportReviewDecision[],
): LoadedReviewDecisionSummary {
  const currentItemKeys = new Set(reviewItems.map(reviewItemKey));
  const current = loadedDecisions.filter((item) => currentItemKeys.has(item.key)).length;

  return {
    current,
    stale: loadedDecisions.length - current,
    total: loadedDecisions.length,
  };
}

export function reviewDecisionSourceSummary(
  reviewItems: ReportReviewItem[],
  exportedDecisions: ReportReviewDecision[],
  localDecisions: Record<string, ReviewDecision>,
): ReviewDecisionSourceSummary {
  const currentItemKeys = new Set(reviewItems.map(reviewItemKey));
  const localKeys = new Set(Object.keys(localDecisions).filter((key) => currentItemKeys.has(key)));
  const exported = exportedDecisions.filter((item) => currentItemKeys.has(item.key) && !localKeys.has(item.key)).length;

  return {
    exported,
    local: localKeys.size,
    total: exported + localKeys.size,
  };
}

export function reviewDecisionSourceMessage(summary: ReviewDecisionSourceSummary) {
  if (summary.total === 0) return "";

  const parts = [];
  if (summary.local > 0) parts.push(`${summary.local} local browser ${pluralize("decision", summary.local)}`);
  if (summary.exported > 0) parts.push(`${summary.exported} exported ${pluralize("decision", summary.exported)}`);
  return `Review source: ${parts.join(" · ")}.`;
}

export function pruneReviewDecisions(
  reviewItems: ReportReviewItem[],
  decisions: Record<string, ReviewDecision>,
): Record<string, ReviewDecision> {
  const currentItemKeys = new Set(reviewItems.map(reviewItemKey));
  return Object.fromEntries(Object.entries(decisions).filter(([key]) => currentItemKeys.has(key)));
}

export function loadedReviewDecisionMessage(summary: LoadedReviewDecisionSummary) {
  if (summary.total === 0) return "";

  const stale = summary.stale > 0 ? ` · ${summary.stale} stale ${pluralize("decision", summary.stale)} in exported file` : "";
  return `${summary.current} exported ${pluralize("decision", summary.current)} ${summary.current === 1 ? "matches" : "match"} ${summary.current} current ${pluralize("item", summary.current)}${stale}.`;
}

export function staleLocalDecisionActionLabel(count: number) {
  return count > 0 ? `Clear ${count} Stale Local ${pluralize("Decision", count)}` : "";
}

export function reviewedReportStatus(input: ReviewStatusInput): ReviewStatusCopy {
  if (input.total > 0 && input.acceptedCount === input.total) {
    return {
      status: "reviewed",
      title: "Reviewed",
      detail: "All review items have been accepted for this report.",
    };
  }

  if (input.total > 0 && input.acceptedCount + input.dismissedCount === input.total) {
    return {
      status: "tolerated",
      title: "Review complete",
      detail: `${reviewDecisionCountPhrase(input.acceptedCount, "accepted")} and ${reviewDecisionCountPhrase(input.dismissedCount, "dismissed")} for this report.`,
    };
  }

  return {
    status: input.fallbackStatus,
    title: input.fallbackTitle,
    detail: input.fallbackDetail,
  };
}

export function emptyReviewProgressCopy(): EmptyReviewProgressCopy {
  return {
    title: "No review items",
    detail: "All compared previews are ready or unchanged.",
  };
}

function pluralize(label: string, count: number) {
  return count === 1 ? label : `${label}s`;
}

function reviewDecisionCountPhrase(count: number, label: string) {
  return `${count} ${label} ${pluralize("decision", count)}`;
}

export function defaultReportFilters(): ReportReviewFilters {
  return {
    status: "all",
    theme: "all",
    kind: "all",
  };
}

export function parseReportFilters(raw: string | null): ReportReviewFilters {
  if (!raw) return defaultReportFilters();

  try {
    const parsed = JSON.parse(raw) as Partial<ReportReviewFilters>;
    return {
      status: typeof parsed.status === "string" ? parsed.status : "all",
      theme: typeof parsed.theme === "string" ? parsed.theme : "all",
      kind: typeof parsed.kind === "string" ? parsed.kind : "all",
    };
  } catch {
    return defaultReportFilters();
  }
}

export function parseStoredReviewDecisionResult(raw: string | null): StoredReviewDecisionParseResult {
  if (!raw) return { decisions: {}, ignoredMalformed: false };

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { decisions: {}, ignoredMalformed: true };
    }

    const entries = Object.entries(parsed);
    const decisions = Object.fromEntries(
      entries.filter((entry): entry is [string, ReviewDecision] => entry[1] === "accepted" || entry[1] === "dismissed"),
    );
    return {
      decisions,
      ignoredMalformed: Object.keys(decisions).length !== entries.length,
    };
  } catch {
    return { decisions: {}, ignoredMalformed: true };
  }
}

export function parseStoredReviewDecisions(raw: string | null): Record<string, ReviewDecision> {
  return parseStoredReviewDecisionResult(raw).decisions;
}

export function storedReviewDecisionWarningMessage(ignoredMalformed: boolean) {
  return ignoredMalformed ? "Some saved browser review decisions were ignored because they were malformed." : "";
}

export function normalizeReportFilter(value: string, allowedValues: string[]) {
  return value === "all" || allowedValues.includes(value) ? value : "all";
}

export function normalizeReportFilters(filters: ReportReviewFilters, options: ReportReviewFiltersOptions): ReportReviewFilters {
  return {
    status: normalizeReportFilter(filters.status, options.statuses),
    theme: normalizeReportFilter(filters.theme, options.themes),
    kind: normalizeReportFilter(filters.kind, options.kinds),
  };
}

export type ReportReviewFiltersOptions = {
  statuses: string[];
  themes: string[];
  kinds: string[];
};

export function reportReviewTotals<T extends ReportReviewItem>(items: T[], getLabel: (item: T) => string): ReportReviewTotal[] {
  const totals = new Map<string, ReportReviewTotal>();

  items.forEach((item) => {
    const label = getLabel(item);
    const total =
      totals.get(label) ??
      ({
        label,
        added: 0,
        changed: 0,
        removed: 0,
        tolerated: 0,
        total: 0,
      } satisfies ReportReviewTotal);

    total[item.status] += 1;
    total.total += 1;
    totals.set(label, total);
  });

  return Array.from(totals.values()).sort((left, right) => right.total - left.total || left.label.localeCompare(right.label));
}
