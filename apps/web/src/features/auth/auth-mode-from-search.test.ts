import { describe, expect, test } from "bun:test";

import { authModeFromSearchParam } from "./auth-mode-from-search";

describe("authModeFromSearchParam", () => {
  test("treats sign-up as sign-up", () => {
    expect(authModeFromSearchParam("sign-up")).toBe("sign-up");
  });

  test("defaults anything else to sign-in", () => {
    expect(authModeFromSearchParam(null)).toBe("sign-in");
    expect(authModeFromSearchParam("sign-in")).toBe("sign-in");
    expect(authModeFromSearchParam("signup")).toBe("sign-in");
  });
});
