import { describe, expect, test } from "bun:test";

import { localDateKeyFromInstant } from "../time-tracking/local-week-bounds";
import { DEFAULT_ALERT_POLICY } from "./member-profile-alerts";
import { memberProfileAlertContextSchema, memberProfileAlertPolicySchema } from "./schemas";

describe("member profile alert contracts", () => {
  test("alert context schema accepts detector fields", () => {
    const parsed = memberProfileAlertContextSchema.safeParse({
      dateKey: "2026-08-04",
      hours: 12.4,
      requiredHours: 8,
      defaultSnoozeUntil: "2026-08-11T12:00:00.000Z",
    });
    expect(parsed.success).toBe(true);
  });

  test("alert policy schema rejects out-of-range thresholds", () => {
    expect(memberProfileAlertPolicySchema.safeParse(DEFAULT_ALERT_POLICY).success).toBe(true);
    expect(
      memberProfileAlertPolicySchema.safeParse({
        ...DEFAULT_ALERT_POLICY,
        wasteSpikePercent: 0,
      }).success,
    ).toBe(false);
    expect(
      memberProfileAlertPolicySchema.safeParse({
        ...DEFAULT_ALERT_POLICY,
        abnormalDayExtraHours: 25,
      }).success,
    ).toBe(false);
  });

  test("local today key matches entry bucketing offset", () => {
    // UTC+3 (JS offset -180): 2026-08-05 01:30Z is still Aug 5 locally.
    const instant = new Date("2026-08-05T01:30:00.000Z");
    expect(localDateKeyFromInstant(instant, -180)).toBe("2026-08-05");
    // Same instant at UTC-5 is still Aug 4.
    expect(localDateKeyFromInstant(instant, 300)).toBe("2026-08-04");
  });
});
