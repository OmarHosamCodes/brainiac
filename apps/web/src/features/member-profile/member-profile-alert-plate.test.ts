import { describe, expect, test } from "bun:test";

import { buildAlertPlate } from "@/features/member-profile/member-profile-alert-plate";

describe("buildAlertPlate", () => {
  test("month pace uses projected hours and fill ratio", () => {
    const plate = buildAlertPlate("month_pace", { projectedHours: 83, requiredHours: 216 });
    expect(plate.metric).toBe("83h");
    expect(plate.shortLabel).toBe("Month pace");
    expect(plate.tone).toBe("warning");
    expect(plate.chartRatio).toBeCloseTo(83 / 216, 2);
  });

  test("abnormal day uses logged hours", () => {
    const plate = buildAlertPlate("abnormal_day", { hours: 12.3, requiredHours: 12 });
    expect(plate.metric).toBe("12.3h");
    expect(plate.tone).toBe("danger");
  });

  test("custom uses truncated title", () => {
    const plate = buildAlertPlate("custom", {}, { title: "Follow up on capacity" });
    expect(plate.metric).toBe("Follow u");
    expect(plate.shortLabel).toBe("Manager note");
  });
});
