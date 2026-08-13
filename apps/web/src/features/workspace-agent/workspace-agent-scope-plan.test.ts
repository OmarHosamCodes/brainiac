import { describe, expect, test } from "bun:test";

import { nodeChipPlanSeed } from "./workspace-agent-scope-plan";

describe("nodeChipPlanSeed", () => {
  test("seeds only Plan with an empty draft", () => {
    expect(
      nodeChipPlanSeed({
        toolPreset: "plan",
        draft: "",
        chip: { kind: "node", id: "node-1", label: "Launch" },
      }),
    ).toContain("Launch");
    expect(
      nodeChipPlanSeed({
        toolPreset: "ask",
        draft: "",
        chip: { kind: "node", id: "node-1", label: "Launch" },
      }),
    ).toBeNull();
    expect(
      nodeChipPlanSeed({
        toolPreset: "plan",
        draft: "already typing",
        chip: { kind: "node", id: "node-1", label: "Launch" },
      }),
    ).toBeNull();
  });
});
