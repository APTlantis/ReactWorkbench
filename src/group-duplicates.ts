export type DuplicateGroupItem = {
  kind?: string;
  component: string;
  state: string;
  variant?: string;
};

export type DuplicateGroupFile = {
  group: {
    id: string;
    name: string;
    layout: string;
  };
  items: DuplicateGroupItem[];
};

export type DuplicateGroupFinding = {
  groupIds: string[];
  names: string[];
  signature: string;
};

export type DuplicateGroupPanelMode = "board" | "selected";

export type DuplicateGroupPanelCopy = {
  status: "ready" | "warning";
  title: string;
  emptyMessage: string;
};

export type DuplicateGroupBoardCountCopy = {
  status: "ready" | "warning";
  duplicateGroupCount: number;
  duplicateStructureCount: number;
  title: string;
  detail: string;
};

export type DuplicateGroupBoardFilterCopy = {
  status: "ready" | "warning";
  title: string;
  detail: string;
  visibleGroupCount: number;
  canReset: boolean;
  resetLabel: string;
};

export type DuplicateGroupJumpTarget = {
  groupId: string;
  label: string;
};

export type DuplicateGroupSummary = {
  id: string;
};

export function findDuplicateGroups(groupFiles: Record<string, DuplicateGroupFile>): DuplicateGroupFinding[] {
  const bySignature = new Map<string, DuplicateGroupFile[]>();

  Object.values(groupFiles).forEach((group) => {
    const signature = groupStructureSignature(group);
    bySignature.set(signature, [...(bySignature.get(signature) ?? []), group]);
  });

  return Array.from(bySignature.entries())
    .filter(([, matches]) => matches.length > 1)
    .map(([signature, matches]) => ({
      groupIds: matches.map((group) => group.group.id),
      names: matches.map((group) => group.group.name),
      signature,
    }))
    .sort((left, right) => left.names.join(", ").localeCompare(right.names.join(", ")));
}

export function groupStructureSignature(group: DuplicateGroupFile) {
  const items = group.items.map((item) => (item.kind === "variant" ? `variant:${item.variant ?? ""}` : `${item.component}:${item.state}`)).join("|");
  return `${group.group.layout}|${items}`;
}

export function duplicateGroupPanelCopy(findings: DuplicateGroupFinding[], mode: DuplicateGroupPanelMode): DuplicateGroupPanelCopy {
  return {
    status: findings.length ? "warning" : "ready",
    title: mode === "board" ? "Duplicate Structures" : "Similar Groups",
    emptyMessage: mode === "board" ? "No duplicate group structures found." : "This group has no matching saved structure.",
  };
}

export function duplicateGroupFindingSummary(finding: DuplicateGroupFinding) {
  return `${finding.groupIds.length} groups use the same layout and component-state sequence.`;
}

export function duplicateGroupBadgeLabel(finding: DuplicateGroupFinding | undefined) {
  return finding ? `${finding.groupIds.length} similar` : "";
}

export function duplicateGroupJumpTargets(finding: DuplicateGroupFinding): DuplicateGroupJumpTarget[] {
  return finding.groupIds.map((groupId, index) => ({
    groupId,
    label: finding.names[index] ?? groupId,
  }));
}

export function duplicateGroupBoardCountCopy(findings: DuplicateGroupFinding[]): DuplicateGroupBoardCountCopy {
  const duplicateGroupCount = new Set(findings.flatMap((finding) => finding.groupIds)).size;
  const duplicateStructureCount = findings.length;

  if (!duplicateStructureCount) {
    return {
      status: "ready",
      duplicateGroupCount,
      duplicateStructureCount,
      title: "No duplicate structures",
      detail: "Every saved group has a unique layout and component-state sequence.",
    };
  }

  return {
    status: "warning",
    duplicateGroupCount,
    duplicateStructureCount,
    title: `${duplicateStructureCount} duplicate ${pluralize("structure", duplicateStructureCount)}`,
    detail: `${duplicateGroupCount} saved ${pluralize("group", duplicateGroupCount)} share repeated layout and component-state sequences.`,
  };
}

export function filterDuplicateGroupSummaries<T extends DuplicateGroupSummary>(
  groups: T[],
  findings: DuplicateGroupFinding[],
  showDuplicatesOnly: boolean,
) {
  if (!showDuplicatesOnly) return groups;

  const duplicateGroupIds = new Set(findings.flatMap((finding) => finding.groupIds));
  return groups.filter((group) => duplicateGroupIds.has(group.id));
}

export function duplicateGroupBoardFilterCopy<T extends DuplicateGroupSummary>(
  groups: T[],
  findings: DuplicateGroupFinding[],
  showDuplicatesOnly: boolean,
): DuplicateGroupBoardFilterCopy {
  const visibleGroupCount = filterDuplicateGroupSummaries(groups, findings, showDuplicatesOnly).length;

  if (!showDuplicatesOnly) {
    return {
      status: "ready",
      title: "Showing all groups",
      detail: `${visibleGroupCount} of ${groups.length} saved ${pluralize("group", groups.length)} visible.`,
      visibleGroupCount,
      canReset: false,
      resetLabel: "Show all groups",
    };
  }

  return {
    status: "warning",
    title: "Duplicate filter active",
    detail: `${visibleGroupCount} of ${groups.length} saved ${pluralize("group", groups.length)} visible.`,
    visibleGroupCount,
    canReset: true,
    resetLabel: "Show all groups",
  };
}

export function parseDuplicateBoardFilter(raw: string | null) {
  return raw === "true";
}

function pluralize(word: string, count: number) {
  return count === 1 ? word : `${word}s`;
}
