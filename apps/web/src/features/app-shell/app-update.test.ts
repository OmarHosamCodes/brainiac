import { describe, expect, test } from "bun:test";

import {
  isChunkLoadFailureReason,
  isRemoteBuildNewer,
  parseAppVersionPayload,
  refreshAppWithMinDwell,
} from "./app-update";

describe("parseAppVersionPayload", () => {
  test("reads buildId from a valid payload", () => {
    expect(parseAppVersionPayload({ buildId: "abc123" })).toBe("abc123");
  });

  test("rejects empty or malformed payloads", () => {
    expect(parseAppVersionPayload(null)).toBeNull();
    expect(parseAppVersionPayload({})).toBeNull();
    expect(parseAppVersionPayload({ buildId: "" })).toBeNull();
    expect(parseAppVersionPayload({ buildId: 12 })).toBeNull();
  });
});

describe("isRemoteBuildNewer", () => {
  test("detects a mismatched remote build", () => {
    expect(isRemoteBuildNewer("local", "remote")).toBe(true);
    expect(isRemoteBuildNewer("same", "same")).toBe(false);
  });

  test("ignores missing ids", () => {
    expect(isRemoteBuildNewer("", "remote")).toBe(false);
    expect(isRemoteBuildNewer("local", null)).toBe(false);
  });
});

describe("isChunkLoadFailureReason", () => {
  test("matches vite dynamic import failures", () => {
    expect(
      isChunkLoadFailureReason(
        new Error("Failed to fetch dynamically imported module: https://example/assets/x.js"),
      ),
    ).toBe(true);
    expect(isChunkLoadFailureReason("Loading chunk 5 failed")).toBe(true);
    expect(isChunkLoadFailureReason(new Error("Network offline"))).toBe(false);
  });
});

describe("refreshAppWithMinDwell", () => {
  test("waits for the floor duration before reload", async () => {
    const sleeps: number[] = [];
    let reloaded = false;

    await refreshAppWithMinDwell({
      minDwellMs: 250,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      reload: () => {
        reloaded = true;
      },
    });

    expect(sleeps).toEqual([250]);
    expect(reloaded).toBe(true);
  });
});
