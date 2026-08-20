import { describe, expect, test } from "bun:test";

import {
  formatTaskMessageAbsoluteTime,
  formatTaskMessageSmartTime,
} from "./agency-task-thread-message-time";

describe("formatTaskMessageSmartTime", () => {
  const now = Date.parse("2026-08-20T15:00:00");

  test("just now under 45s", () => {
    expect(formatTaskMessageSmartTime(new Date(now - 10_000).toISOString(), now)).toBe("Just now");
  });

  test("minutes ago under an hour", () => {
    expect(formatTaskMessageSmartTime(new Date(now - 5 * 60_000).toISOString(), now)).toBe(
      "5m ago",
    );
  });

  test("same calendar day uses clock", () => {
    const iso = new Date(now - 3 * 60 * 60_000).toISOString();
    const label = formatTaskMessageSmartTime(iso, now);
    expect(label).not.toMatch(/ago|Yesterday|Just now/);
    expect(label.length).toBeGreaterThan(0);
  });

  test("yesterday prefix", () => {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 16, 0, 0);
    const label = formatTaskMessageSmartTime(yesterday.toISOString(), now);
    expect(label.startsWith("Yesterday ")).toBe(true);
  });

  test("absolute title is non-empty", () => {
    expect(formatTaskMessageAbsoluteTime(new Date(now).toISOString()).length).toBeGreaterThan(0);
  });
});
