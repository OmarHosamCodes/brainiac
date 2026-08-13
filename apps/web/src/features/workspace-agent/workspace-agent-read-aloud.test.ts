import { describe, expect, test } from "bun:test";

import { splitReadAloudWords } from "./workspace-agent-read-aloud";

describe("splitReadAloudWords", () => {
  test("splits on whitespace and drops empties", () => {
    expect(splitReadAloudWords("  Paid  waste ")).toEqual(["Paid", "waste"]);
  });

  test("returns empty for blank text", () => {
    expect(splitReadAloudWords("   ")).toEqual([]);
  });
});
