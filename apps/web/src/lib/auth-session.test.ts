import { describe, expect, test } from "bun:test";

import { resolveAuthSession } from "./auth-session";

const loaderUser = { id: "u1", name: "Ada", email: "ada@orch.test" };

describe("resolveAuthSession", () => {
  test("loader user wins while client session is empty", () => {
    expect(resolveAuthSession(null, false, loaderUser)).toEqual({
      user: loaderUser,
      isPending: false,
    });
    expect(resolveAuthSession(undefined, true, loaderUser)).toEqual({
      user: loaderUser,
      isPending: false,
    });
  });

  test("client user wins once present", () => {
    const clientUser = { id: "u1", name: "Ada Lovelace", email: "ada@orch.test" };
    expect(resolveAuthSession(clientUser, false, loaderUser)).toEqual({
      user: clientUser,
      isPending: false,
    });
  });

  test("pending only when neither source has a user", () => {
    expect(resolveAuthSession(null, true, null)).toEqual({ user: null, isPending: true });
    expect(resolveAuthSession(null, false, null)).toEqual({ user: null, isPending: false });
  });
});
