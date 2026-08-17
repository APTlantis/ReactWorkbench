import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { movePageBlockToRegion, reorderPageBlock } from "../src/page-layout.ts";

const page = {
  regions: [
    {
      id: "main",
      blocks: [
        { kind: "group" as const, reference: "dash-summary", role: "Dashboard summary", layout: "grid" },
        { kind: "variant" as const, reference: "project-feature-card", role: "Saved feature card", layout: "section" },
      ],
    },
    {
      id: "footer",
      blocks: [{ kind: "group" as const, reference: "confirm-footer", role: "Footer actions", layout: "section" }],
    },
  ],
};

describe("page layout helpers", () => {
  it("reorders blocks inside a semantic region", () => {
    const reordered = reorderPageBlock(page, "main", 0, 1);

    assert.deepEqual(
      reordered.regions[0].blocks.map((block) => block.reference),
      ["project-feature-card", "dash-summary"],
    );
    assert.deepEqual(
      page.regions[0].blocks.map((block) => block.reference),
      ["dash-summary", "project-feature-card"],
    );
  });

  it("moves blocks between semantic regions without absolute positioning state", () => {
    const moved = movePageBlockToRegion(page, "main", 1, "footer");

    assert.deepEqual(
      moved.regions.find((region) => region.id === "main")?.blocks.map((block) => block.reference),
      ["dash-summary"],
    );
    assert.deepEqual(
      moved.regions.find((region) => region.id === "footer")?.blocks.map((block) => block.reference),
      ["confirm-footer", "project-feature-card"],
    );
  });
});
