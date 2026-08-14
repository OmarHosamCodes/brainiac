import { describe, expect, test } from "bun:test";

import {
  proposalPreviewEmptyLabel,
  proposalPreviewLines,
} from "@/features/workspace-agent/proposal-change-preview";

describe("proposalPreviewLines", () => {
  test("returns empty for null", () => {
    expect(proposalPreviewLines(null)).toEqual([]);
    expect(proposalPreviewEmptyLabel(null)).toBe("Nothing yet");
  });

  test("lists primitive fields and skips ids used only for routing", () => {
    expect(
      proposalPreviewLines({
        type: "time_entry.update",
        teamId: "t1",
        description: "Design review",
        isWaste: true,
        durationSeconds: 3600,
      }),
    ).toEqual([
      { label: "Description", value: "Design review" },
      { label: "Is Waste", value: "Yes" },
      { label: "Duration Seconds", value: "3600" },
    ]);
  });

  test("summarizes string arrays", () => {
    expect(proposalPreviewLines(["alpha", "beta"])).toEqual([
      { label: "Items", value: "alpha, beta" },
    ]);
  });
});
