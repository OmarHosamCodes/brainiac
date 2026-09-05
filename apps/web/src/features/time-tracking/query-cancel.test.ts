import { describe, expect, test } from "bun:test";
import { CancelledError } from "@tanstack/react-query";

import {
  ignoreQueryCancelRejection,
  isQueryCancelRejection,
  settledQueryCancel,
} from "./query-cancel";

describe("ignoreQueryCancelRejection", () => {
  test("swallows TanStack Query CancelledError", () => {
    expect(() => ignoreQueryCancelRejection(new CancelledError())).not.toThrow();
  });

  test("swallows CancelledError-shaped errors from another realm", () => {
    const foreign = new Error("CancelledError");
    expect(isQueryCancelRejection(foreign)).toBe(true);
    expect(() => ignoreQueryCancelRejection(foreign)).not.toThrow();
  });

  test("rethrows other errors", () => {
    expect(() => ignoreQueryCancelRejection(new Error("boom"))).toThrow("boom");
  });
});

describe("settledQueryCancel", () => {
  test("does not reject when the cancel promise rejects as CancelledError", async () => {
    await expect(
      settledQueryCancel(async () => {
        throw new CancelledError({ revert: true });
      }),
    ).resolves.toBeUndefined();
  });

  test("propagates non-cancel failures", async () => {
    await expect(
      settledQueryCancel(async () => {
        throw new Error("network");
      }),
    ).rejects.toThrow("network");
  });
});
