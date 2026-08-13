import { describe, expect, test } from "bun:test";

import { findWorkspaceAgentMessageHits } from "./workspace-agent-message-search";

describe("findWorkspaceAgentMessageHits", () => {
  test("returns no hits for empty query", () => {
    expect(findWorkspaceAgentMessageHits("Paid waste internal", "")).toEqual([]);
  });

  test("extracts before/match/after for the first hit", () => {
    const hits = findWorkspaceAgentMessageHits("Paid waste internal", "waste");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.match.toLowerCase()).toBe("waste");
    expect(hits[0]?.before.endsWith("Paid ")).toBe(true);
  });
});
