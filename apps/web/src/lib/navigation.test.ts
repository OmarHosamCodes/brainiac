import { describe, expect, test } from "bun:test";

import { collectRouteParams } from "./navigation";

describe("collectRouteParams", () => {
  test("merges params from root to leaf so nested ids are visible", () => {
    expect(
      collectRouteParams([{ params: {} }, { params: {} }, { params: { clientId: "cli_1" } }]),
    ).toEqual({ clientId: "cli_1" });
  });

  test("later matches win when keys overlap", () => {
    expect(collectRouteParams([{ params: { id: "parent" } }, { params: { id: "child" } }])).toEqual(
      { id: "child" },
    );
  });

  test("ignores non-string param values", () => {
    expect(collectRouteParams([{ params: { clientId: "cli_1", count: 2 } }])).toEqual({
      clientId: "cli_1",
    });
  });
});
