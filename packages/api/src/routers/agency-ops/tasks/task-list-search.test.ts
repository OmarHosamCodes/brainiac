import { describe, expect, test } from "bun:test";
import { buildTaskListSearchPredicate, tokenizeTaskListSearch } from "./task-list-search";

describe("tokenizeTaskListSearch", () => {
  test("mirrors chooser whitespace tokens", () => {
    expect(tokenizeTaskListSearch("Acme  Design")).toEqual(["acme", "design"]);
  });

  test("caps at 8 tokens", () => {
    expect(tokenizeTaskListSearch("a b c d e f g h i j")).toHaveLength(8);
  });

  test("returns empty for blank query", () => {
    expect(tokenizeTaskListSearch("   ")).toEqual([]);
  });
});

describe("buildTaskListSearchPredicate", () => {
  test("returns undefined for empty tokens", () => {
    expect(buildTaskListSearchPredicate([])).toBeUndefined();
  });

  test("builds a predicate for each token", () => {
    const predicate = buildTaskListSearchPredicate(["acme", "design"]);
    expect(predicate).toBeDefined();
  });
});
