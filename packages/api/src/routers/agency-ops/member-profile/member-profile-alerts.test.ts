import { describe, expect, test } from "bun:test";

import { notificationTypeSchema } from "../../../schemas/notifications";
import { memberProfileAlertPolicySchema } from "./schemas";
import {
  abnormalDayThresholdHours,
  alertFingerprintAliases,
  DEFAULT_ALERT_POLICY,
  detectAbnormalDays,
  detectMonthPace,
  detectQuarterPace,
  detectSystemAlerts,
  detectWasteSpike,
} from "./member-profile-alerts";

const schedule = { requiredDailyHours: 8, weekStartsOn: 1, weekendDurationDays: 2 };
const calendar = { fiscalYearStartMonth: 1, fiscalYearStartDay: 1 };
const monthlyMinHours = 200;
const offDayReduceHours = 8;

describe("member-profile-alerts detectors", () => {
  test("member.alert is a registered notification type", () => {
    expect(notificationTypeSchema.safeParse("member.alert").success).toBe(true);
  });

  test("abnormal day threshold is required plus extra hours", () => {
    expect(abnormalDayThresholdHours(8)).toBe(12);
    expect(abnormalDayThresholdHours(4)).toBe(8);
    expect(abnormalDayThresholdHours(8, 6)).toBe(14);
  });

  test("detectAbnormalDays flags days over threshold", () => {
    const alerts = detectAbnormalDays({
      todayKey: "2026-08-05",
      requiredDailyHours: 8,
      days: [
        { dateKey: "2026-08-04", totalSeconds: 13 * 3600, wasteSeconds: 0 },
        { dateKey: "2026-08-03", totalSeconds: 8 * 3600, wasteSeconds: 0 },
      ],
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.fingerprint).toBe("abnormal_day:2026-08-04");
  });

  test("alertFingerprintAliases links legacy and tm month pace keys", () => {
    expect(alertFingerprintAliases("month_pace:2026-08")).toEqual([
      "month_pace:2026-08",
      "month_pace:tm:2026-08-01",
    ]);
    expect(alertFingerprintAliases("month_pace:tm:2026-08-01")).toEqual([
      "month_pace:tm:2026-08-01",
      "month_pace:2026-08",
    ]);
  });

  test("detectMonthPace fires when projected under 85% after midpoint", () => {
    const days = [
      { dateKey: "2026-08-03", totalSeconds: 3600, wasteSeconds: 0 },
      { dateKey: "2026-08-10", totalSeconds: 3600, wasteSeconds: 0 },
    ];
    const alert = detectMonthPace({
      days,
      schedule,
      monthlyMinHours,
      offDayReduceHours,
      todayKey: "2026-08-20",
    });
    expect(alert?.kind).toBe("month_pace");
    expect(alert?.fingerprint).toBe("month_pace:tm:2026-08-01");
  });

  test("detectMonthPace uses tenure month bounds when fiscal year starts on the 26th", () => {
    const days = [
      { dateKey: "2026-08-03", totalSeconds: 3600, wasteSeconds: 0 },
      { dateKey: "2026-08-10", totalSeconds: 3600, wasteSeconds: 0 },
    ];
    const alert = detectMonthPace({
      days,
      schedule,
      monthlyMinHours,
      offDayReduceHours,
      todayKey: "2026-08-20",
      tenureEnabled: true,
      fiscalCalendar: { fiscalYearStartMonth: 12, fiscalYearStartDay: 26 },
    });
    expect(alert?.fingerprint).toBe("month_pace:tm:2026-07-26");
  });

  test("detectMonthPace uses policy monthly minimum in alert copy", () => {
    const days = [
      { dateKey: "2026-08-03", totalSeconds: 3600, wasteSeconds: 0 },
      { dateKey: "2026-08-10", totalSeconds: 3600, wasteSeconds: 0 },
    ];
    const alert = detectMonthPace({
      days,
      schedule,
      monthlyMinHours: 175,
      offDayReduceHours,
      todayKey: "2026-08-20",
    });
    expect(alert?.body).toContain("vs 175h month minimum");
    expect(alert?.context.requiredHours).toBe(175);
  });

  test("detectMonthPace skips early in month", () => {
    const alert = detectMonthPace({
      days: [{ dateKey: "2026-08-03", totalSeconds: 0, wasteSeconds: 0 }],
      schedule,
      monthlyMinHours,
      offDayReduceHours,
      todayKey: "2026-08-03",
    });
    expect(alert).toBeNull();
  });

  test("detectQuarterPace fires when projected under minimum", () => {
    const days = [{ dateKey: "2026-07-15", totalSeconds: 10 * 3600, wasteSeconds: 0 }];
    const alert = detectQuarterPace({
      days,
      schedule,
      calendar,
      quarterlyMinHours: 525,
      offDayReduceHours,
      todayKey: "2026-08-20",
    });
    expect(alert?.kind).toBe("quarter_pace");
    expect(alert?.fingerprint).toContain("quarter_pace:2026-Q3");
  });

  test("detectWasteSpike fires above 20%", () => {
    const alert = detectWasteSpike({
      todayKey: "2026-08-20",
      schedule,
      days: [{ dateKey: "2026-08-10", totalSeconds: 10_000, wasteSeconds: 3_000 }],
    });
    expect(alert?.kind).toBe("waste_spike");
  });

  test("removed fingerprint suppresses system alerts", () => {
    const alerts = detectSystemAlerts({
      todayKey: "2026-08-05",
      schedule,
      calendar,
      monthlyMinHours,
      quarterlyMinHours: 525,
      offDayReduceHours,
      suppressedFingerprints: new Set(["abnormal_day:2026-08-04"]),
      days: [{ dateKey: "2026-08-04", totalSeconds: 13 * 3600, wasteSeconds: 0 }],
    });
    expect(alerts.every((a) => a.fingerprint !== "abnormal_day:2026-08-04")).toBe(true);
  });

  test("default alert policy matches the API schema", () => {
    expect(memberProfileAlertPolicySchema.parse(DEFAULT_ALERT_POLICY)).toEqual(
      DEFAULT_ALERT_POLICY,
    );
  });

  test("disabled abnormal day detector returns no alerts", () => {
    const alerts = detectAbnormalDays({
      todayKey: "2026-08-05",
      requiredDailyHours: 8,
      policy: { ...DEFAULT_ALERT_POLICY, abnormalDayEnabled: false },
      days: [{ dateKey: "2026-08-04", totalSeconds: 13 * 3600, wasteSeconds: 0 }],
    });
    expect(alerts).toHaveLength(0);
  });

  test("disabled month pace returns null", () => {
    const days = [
      { dateKey: "2026-08-03", totalSeconds: 3600, wasteSeconds: 0 },
      { dateKey: "2026-08-10", totalSeconds: 3600, wasteSeconds: 0 },
    ];
    const alert = detectMonthPace({
      days,
      schedule,
      monthlyMinHours,
      offDayReduceHours,
      todayKey: "2026-08-20",
      policy: { ...DEFAULT_ALERT_POLICY, monthPaceEnabled: false },
    });
    expect(alert).toBeNull();
  });

  test("disabled quarter pace returns null", () => {
    const days = [{ dateKey: "2026-07-15", totalSeconds: 10 * 3600, wasteSeconds: 0 }];
    const alert = detectQuarterPace({
      days,
      schedule,
      calendar,
      quarterlyMinHours: 525,
      offDayReduceHours,
      todayKey: "2026-08-20",
      policy: { ...DEFAULT_ALERT_POLICY, quarterPaceEnabled: false },
    });
    expect(alert).toBeNull();
  });

  test("custom extra hours changes the abnormal day cutoff", () => {
    const alerts = detectAbnormalDays({
      todayKey: "2026-08-05",
      requiredDailyHours: 8,
      policy: { ...DEFAULT_ALERT_POLICY, abnormalDayExtraHours: 6 },
      days: [
        { dateKey: "2026-08-04", totalSeconds: 13 * 3600, wasteSeconds: 0 },
        { dateKey: "2026-08-03", totalSeconds: 15 * 3600, wasteSeconds: 0 },
      ],
    });
    expect(alerts.map((alert) => alert.fingerprint)).toEqual(["abnormal_day:2026-08-03"]);
  });

  test("custom waste percent skips a 30% spike", () => {
    const alert = detectWasteSpike({
      todayKey: "2026-08-20",
      schedule,
      policy: { ...DEFAULT_ALERT_POLICY, wasteSpikePercent: 50 },
      days: [{ dateKey: "2026-08-10", totalSeconds: 10_000, wasteSeconds: 3_000 }],
    });
    expect(alert).toBeNull();
  });

  test("disabled waste spike returns null", () => {
    const alert = detectWasteSpike({
      todayKey: "2026-08-20",
      schedule,
      policy: { ...DEFAULT_ALERT_POLICY, wasteSpikeEnabled: false },
      days: [{ dateKey: "2026-08-10", totalSeconds: 10_000, wasteSeconds: 3_000 }],
    });
    expect(alert).toBeNull();
  });

  test("detectMonthPace uses adjusted minimum when off days are present", () => {
    const days = [
      { dateKey: "2026-08-03", totalSeconds: 3600, wasteSeconds: 0 },
      { dateKey: "2026-08-10", totalSeconds: 3600, wasteSeconds: 0 },
    ];
    const leaveByDate = new Map<string, unknown>([
      ["2026-08-04", {}],
      ["2026-08-05", {}],
      ["2026-08-06", {}],
    ]);
    const alert = detectMonthPace({
      days,
      schedule,
      monthlyMinHours: 200,
      offDayReduceHours: 8,
      leaveByDate,
      todayKey: "2026-08-20",
    });
    expect(alert?.context.requiredHours).toBe(176);
  });

  test("detectSystemAlerts skips disabled kinds", () => {
    const alerts = detectSystemAlerts({
      todayKey: "2026-08-05",
      schedule,
      calendar,
      monthlyMinHours,
      quarterlyMinHours: 525,
      offDayReduceHours,
      suppressedFingerprints: new Set(),
      policy: { ...DEFAULT_ALERT_POLICY, abnormalDayEnabled: false },
      days: [{ dateKey: "2026-08-04", totalSeconds: 13 * 3600, wasteSeconds: 0 }],
    });
    expect(alerts).toHaveLength(0);
  });
});
