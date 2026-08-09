import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  duplicateGroupBadgeLabel,
  duplicateGroupBoardCountCopy,
  duplicateGroupBoardFilterCopy,
  duplicateGroupFindingSummary,
  duplicateGroupJumpTargets,
  duplicateGroupPanelCopy,
  filterDuplicateGroupSummaries,
  findDuplicateGroups,
  groupStructureSignature,
  parseDuplicateBoardFilter,
  type DuplicateGroupFile,
} from "../src/group-duplicates.ts";

const group = (
  id: string,
  name: string,
  layout: string,
  items: Array<[component: string, state: string]>,
): DuplicateGroupFile => ({
  group: {
    id,
    name,
    layout,
  },
  items: items.map(([component, state]) => ({ component, state })),
});

function seededGroup(path: string): DuplicateGroupFile {
  const content = readFileSync(new URL(`../metadata/groups/${path}`, import.meta.url), "utf8");
  const groupMatch = {
    id: requiredTomlString(content, "id", path),
    name: requiredTomlString(content, "name", path),
    layout: requiredTomlString(content, "layout", path),
  };
  const items = [...content.matchAll(/\[\[items\]\]\s+component = "([^"]+)"\s+state = "([^"]+)"/g)].map((match) => ({
    component: match[1],
    state: match[2],
  }));
  assert(items.length > 0, `${path} should define at least one item.`);

  return {
    group: groupMatch,
    items,
  };
}

function requiredTomlString(content: string, key: string, path: string) {
  const value = content.match(new RegExp(`^${key} = "([^"]+)"`, "m"))?.[1];
  assert(value, `${path} should define ${key}.`);
  return value;
}

describe("duplicate group structure detection", () => {
  it("uses layout and ordered component states for stable signatures", () => {
    assert.equal(
      groupStructureSignature(group("settings-row", "Settings Row", "form-row", [["input", "default"], ["toggle", "on"]])),
      "form-row|input:default|toggle:on",
    );
  });

  it("finds matching structures even when group names differ", () => {
    const findings = findDuplicateGroups({
      alpha: group("alpha", "Alpha Row", "form-row", [["input", "default"], ["toggle", "on"]]),
      beta: group("beta", "Beta Row", "form-row", [["input", "default"], ["toggle", "on"]]),
      toolbar: group("toolbar", "Toolbar", "toolbar", [["button", "primary"], ["button", "secondary"]]),
    });

    assert.deepEqual(findings, [
      {
        groupIds: ["alpha", "beta"],
        names: ["Alpha Row", "Beta Row"],
        signature: "form-row|input:default|toggle:on",
      },
    ]);
  });

  it("does not match groups with the same items in a different layout or order", () => {
    const findings = findDuplicateGroups({
      formRow: group("form-row", "Form Row", "form-row", [["input", "default"], ["toggle", "on"]]),
      tableRow: group("table-row", "Table Row", "table-header", [["input", "default"], ["toggle", "on"]]),
      reversed: group("reversed", "Reversed", "form-row", [["toggle", "on"], ["input", "default"]]),
    });

    assert.deepEqual(findings, []);
  });

  it("formats duplicate structure surfacing copy for board and selected panels", () => {
    const findings = [
      {
        groupIds: ["alpha", "beta"],
        names: ["Alpha Row", "Beta Row"],
        signature: "form-row|input:default|toggle:on",
      },
    ];

    assert.deepEqual(duplicateGroupPanelCopy(findings, "board"), {
      status: "warning",
      title: "Duplicate Structures",
      emptyMessage: "No duplicate group structures found.",
    });
    assert.deepEqual(duplicateGroupPanelCopy([], "selected"), {
      status: "ready",
      title: "Similar Groups",
      emptyMessage: "This group has no matching saved structure.",
    });
  });

  it("formats duplicate structure finding summaries and board badges", () => {
    const finding = {
      groupIds: ["alpha", "beta", "gamma"],
      names: ["Alpha Row", "Beta Row", "Gamma Row"],
      signature: "form-row|input:default|toggle:on",
    };

    assert.equal(duplicateGroupFindingSummary(finding), "3 groups use the same layout and component-state sequence.");
    assert.equal(duplicateGroupBadgeLabel(finding), "3 similar");
    assert.equal(duplicateGroupBadgeLabel(undefined), "");
  });

  it("builds duplicate structure jump targets in finding order", () => {
    assert.deepEqual(
      duplicateGroupJumpTargets({
        groupIds: ["alpha", "beta"],
        names: ["Alpha Row", "Beta Row"],
        signature: "form-row|input:default|toggle:on",
      }),
      [
        { groupId: "alpha", label: "Alpha Row" },
        { groupId: "beta", label: "Beta Row" },
      ],
    );
    assert.deepEqual(
      duplicateGroupJumpTargets({
        groupIds: ["alpha", "beta"],
        names: ["Alpha Row"],
        signature: "form-row|input:default|toggle:on",
      }),
      [
        { groupId: "alpha", label: "Alpha Row" },
        { groupId: "beta", label: "beta" },
      ],
    );
  });

  it("formats duplicate structure board inspector counts", () => {
    assert.deepEqual(duplicateGroupBoardCountCopy([]), {
      status: "ready",
      duplicateGroupCount: 0,
      duplicateStructureCount: 0,
      title: "No duplicate structures",
      detail: "Every saved group has a unique layout and component-state sequence.",
    });
    assert.deepEqual(
      duplicateGroupBoardCountCopy([
        {
          groupIds: ["alpha", "beta"],
          names: ["Alpha Row", "Beta Row"],
          signature: "form-row|input:default|toggle:on",
        },
        {
          groupIds: ["gamma", "delta", "epsilon"],
          names: ["Gamma Row", "Delta Row", "Epsilon Row"],
          signature: "toolbar|button:primary|button:secondary",
        },
      ]),
      {
        status: "warning",
        duplicateGroupCount: 5,
        duplicateStructureCount: 2,
        title: "2 duplicate structures",
        detail: "5 saved groups share repeated layout and component-state sequences.",
      },
    );
  });

  it("filters board group summaries down to duplicate structures", () => {
    const groups = [
      { id: "alpha", name: "Alpha Row" },
      { id: "beta", name: "Beta Row" },
      { id: "toolbar", name: "Toolbar" },
    ];
    const findings = [
      {
        groupIds: ["alpha", "beta"],
        names: ["Alpha Row", "Beta Row"],
        signature: "form-row|input:default|toggle:on",
      },
    ];

    assert.deepEqual(filterDuplicateGroupSummaries(groups, findings, false), groups);
    assert.deepEqual(filterDuplicateGroupSummaries(groups, findings, true), [
      { id: "alpha", name: "Alpha Row" },
      { id: "beta", name: "Beta Row" },
    ]);
    assert.deepEqual(filterDuplicateGroupSummaries(groups, [], true), []);
  });

  it("formats duplicate board filter state summaries", () => {
    const groups = [
      { id: "alpha", name: "Alpha Row" },
      { id: "beta", name: "Beta Row" },
      { id: "toolbar", name: "Toolbar" },
    ];
    const findings = [
      {
        groupIds: ["alpha", "beta"],
        names: ["Alpha Row", "Beta Row"],
        signature: "form-row|input:default|toggle:on",
      },
    ];

    assert.deepEqual(duplicateGroupBoardFilterCopy(groups, findings, false), {
      status: "ready",
      title: "Showing all groups",
      detail: "3 of 3 saved groups visible.",
      visibleGroupCount: 3,
      canReset: false,
      resetLabel: "Show all groups",
    });
    assert.deepEqual(duplicateGroupBoardFilterCopy(groups, findings, true), {
      status: "warning",
      title: "Duplicate filter active",
      detail: "2 of 3 saved groups visible.",
      visibleGroupCount: 2,
      canReset: true,
      resetLabel: "Show all groups",
    });
    assert.deepEqual(duplicateGroupBoardFilterCopy(groups, [], true), {
      status: "warning",
      title: "Duplicate filter active",
      detail: "0 of 3 saved groups visible.",
      visibleGroupCount: 0,
      canReset: true,
      resetLabel: "Show all groups",
    });
  });

  it("keeps overlapping duplicate group findings unique in count and filter copy", () => {
    const groups = [
      { id: "alpha", name: "Alpha Row" },
      { id: "beta", name: "Beta Row" },
      { id: "gamma", name: "Gamma Row" },
      { id: "toolbar", name: "Toolbar" },
    ];
    const findings = [
      {
        groupIds: ["alpha", "beta"],
        names: ["Alpha Row", "Beta Row"],
        signature: "row|badge:soft-info|card:compact-warning|button:secondary-disabled",
      },
      {
        groupIds: ["beta", "gamma"],
        names: ["Beta Row", "Gamma Row"],
        signature: "row|input:error-invalid|badge:soft-danger|toggle:warning-on",
      },
    ];

    assert.deepEqual(duplicateGroupBoardCountCopy(findings), {
      status: "warning",
      duplicateGroupCount: 3,
      duplicateStructureCount: 2,
      title: "2 duplicate structures",
      detail: "3 saved groups share repeated layout and component-state sequences.",
    });
    assert.deepEqual(filterDuplicateGroupSummaries(groups, findings, true), [
      { id: "alpha", name: "Alpha Row" },
      { id: "beta", name: "Beta Row" },
      { id: "gamma", name: "Gamma Row" },
    ]);
    assert.deepEqual(duplicateGroupBoardFilterCopy(groups, findings, true), {
      status: "warning",
      title: "Duplicate filter active",
      detail: "3 of 4 saved groups visible.",
      visibleGroupCount: 3,
      canReset: true,
      resetLabel: "Show all groups",
    });
  });

  it("detects the seeded settings duplicate metadata pair", () => {
    const settingsReviewRow = seededGroup("settings-review-row.toml");
    const settingsRow = seededGroup("settings-row.toml");
    const findings = findDuplicateGroups({
      [settingsReviewRow.group.id]: settingsReviewRow,
      [settingsRow.group.id]: settingsRow,
    });

    assert.deepEqual(findings, [
      {
        groupIds: ["settings-review-row", "settings-row"],
        names: ["Settings Review Row", "Settings Row"],
        signature: "row|badge:soft-info|card:compact-warning|button:secondary-disabled",
      },
    ]);
    assert.equal(duplicateGroupBadgeLabel(findings[0]), "2 similar");
    assert.equal(duplicateGroupFindingSummary(findings[0]), "2 groups use the same layout and component-state sequence.");
    assert.deepEqual(duplicateGroupJumpTargets(findings[0]), [
      { groupId: "settings-review-row", label: "Settings Review Row" },
      { groupId: "settings-row", label: "Settings Row" },
    ]);
  });

  it("keeps seeded duplicate metadata item counts and order aligned", () => {
    const settingsReviewRow = seededGroup("settings-review-row.toml");
    const settingsRow = seededGroup("settings-row.toml");
    const seededSequence = [
      { component: "badge", state: "soft-info" },
      { component: "card", state: "compact-warning" },
      { component: "button", state: "secondary-disabled" },
    ];

    assert.deepEqual(settingsReviewRow.items, seededSequence);
    assert.deepEqual(settingsRow.items, seededSequence);
    assert.equal(settingsReviewRow.items.length, 3);
    assert.equal(settingsRow.items.length, 3);
    assert.equal(groupStructureSignature(settingsReviewRow), groupStructureSignature(settingsRow));
  });

  it("sorts seeded and synthetic duplicate findings by displayed group names", () => {
    const settingsReviewRow = seededGroup("settings-review-row.toml");
    const settingsRow = seededGroup("settings-row.toml");
    const findings = findDuplicateGroups({
      zuluA: group("zulu-a", "Zulu A", "toolbar", [["button", "primary-ready"], ["badge", "soft-info"]]),
      zuluB: group("zulu-b", "Zulu B", "toolbar", [["button", "primary-ready"], ["badge", "soft-info"]]),
      [settingsReviewRow.group.id]: settingsReviewRow,
      [settingsRow.group.id]: settingsRow,
      alphaA: group("alpha-a", "Alpha A", "form-row", [["input", "default-filled"], ["toggle", "enabled"]]),
      alphaB: group("alpha-b", "Alpha B", "form-row", [["input", "default-filled"], ["toggle", "enabled"]]),
    });

    assert.deepEqual(
      findings.map((finding) => finding.names),
      [
        ["Alpha A", "Alpha B"],
        ["Settings Review Row", "Settings Row"],
        ["Zulu A", "Zulu B"],
      ],
    );
  });

  it("parses duplicate board filter persistence defensively", () => {
    assert.equal(parseDuplicateBoardFilter(null), false);
    assert.equal(parseDuplicateBoardFilter("false"), false);
    assert.equal(parseDuplicateBoardFilter("yes"), false);
    assert.equal(parseDuplicateBoardFilter("{bad json"), false);
    assert.equal(parseDuplicateBoardFilter("true"), true);
  });
});
