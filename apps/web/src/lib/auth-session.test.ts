import { describe, expect, mock, test } from "bun:test";

mock.module("@/lib/env", () => ({
  getServerUrl: () => "http://localhost:7000",
  getRpcBaseUrl: () => "http://localhost:7000",
  getAuthBaseUrl: () => "http://localhost:7000",
}));

const { resolveAuthSession } = await import("./auth-session");

const loaderUser = { id: "u1", name: "Ada", email: "ada@orch.test" };

describe("resolveAuthSession", () => {
  test("loader user bridges while the client session is still pending", () => {
    expect(resolveAuthSession({ data: undefined, isPending: true }, loaderUser)).toEqual({
      user: loaderUser,
      isPending: false,
    });
    expect(resolveAuthSession({ data: undefined, isPending: true }, null)).toEqual({
      user: null,
      isPending: true,
    });
  });

  test("authoritative signed-out client result does not keep the loader user", () => {
    expect(resolveAuthSession({ data: null, isPending: false }, loaderUser)).toEqual({
      user: null,
      isPending: false,
    });
    expect(resolveAuthSession({ data: { user: null }, isPending: false }, loaderUser)).toEqual({
      user: null,
      isPending: false,
    });
  });

  test("transient client failure keeps the loader user instead of signing out", () => {
    expect(
      resolveAuthSession(
        { data: undefined, isPending: false, error: new Error("timeout") },
        loaderUser,
      ),
    ).toEqual({
      user: loaderUser,
      isPending: false,
    });
    expect(
      resolveAuthSession({ data: null, isPending: false, error: new Error("timeout") }, loaderUser),
    ).toEqual({
      user: loaderUser,
      isPending: false,
    });
  });

  test("unsettled client data without an error keeps the loader user", () => {
    expect(resolveAuthSession({ data: undefined, isPending: false }, loaderUser)).toEqual({
      user: loaderUser,
      isPending: false,
    });
  });

  test("client user wins once present", () => {
    const clientUser = { id: "u1", name: "Ada Lovelace", email: "ada@orch.test" };
    expect(
      resolveAuthSession({ data: { user: clientUser }, isPending: false }, loaderUser),
    ).toEqual({
      user: clientUser,
      isPending: false,
    });
  });

  test("pending only when neither source has a user", () => {
    expect(resolveAuthSession({ data: null, isPending: true }, null)).toEqual({
      user: null,
      isPending: true,
    });
    expect(resolveAuthSession({ data: null, isPending: false }, null)).toEqual({
      user: null,
      isPending: false,
    });
  });
});
