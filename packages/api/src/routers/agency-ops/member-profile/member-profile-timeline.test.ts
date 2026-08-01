import { describe, expect, test } from "bun:test";

import { buildLeaveActivity, buildTimeEntryActivity } from "./member-profile-timeline";

describe("buildTimeEntryActivity", () => {
  test("maps waste entries to waste_marked", () => {
    const item = buildTimeEntryActivity({
      id: "te_1",
      date: "2026-07-29",
      createdAt: "2026-07-29T12:00:00.000Z",
      description: "Waiting",
      projectName: "SAAS",
      durationSeconds: 600,
      isWaste: true,
    });
    expect(item.eventType).toBe("waste_marked");
    expect(item.title).toBe("Waste marked");
    expect(item.body).toContain("10m");
    expect(item.meta).toBe("Project · SAAS");
  });

  test("maps normal entries to time_logged with description as title", () => {
    const item = buildTimeEntryActivity({
      id: "te_2",
      date: "2026-07-29",
      createdAt: "2026-07-29T12:00:00.000Z",
      description: "UX",
      projectName: "SAAS",
      durationSeconds: 3600,
      isWaste: false,
    });
    expect(item.eventType).toBe("time_logged");
    expect(item.title).toBe("UX");
    expect(item.body).toBe("Logged 1h 0m");
  });
});

describe("buildLeaveActivity", () => {
  test("emits on start date when range is inside the window", () => {
    const item = buildLeaveActivity({
      id: "lv_1",
      type: "pto",
      reason: "Annual leave",
      startDate: "2026-07-13",
      endDate: "2026-07-17",
      createdAt: "2026-07-01T00:00:00.000Z",
      windowStart: "2026-07-01",
      windowEnd: "2026-07-31",
    });
    expect(item?.date).toBe("2026-07-13");
    expect(item?.eventType).toBe("leave");
    expect(item?.title).toBe("PTO");
    expect(item?.meta).toBe("2026-07-13 → 2026-07-17");
  });

  test("clamps start into window and skips out-of-range leave", () => {
    const clamped = buildLeaveActivity({
      id: "lv_2",
      type: "team_holiday",
      reason: null,
      startDate: "2026-06-28",
      endDate: "2026-07-02",
      createdAt: "2026-06-01T00:00:00.000Z",
      windowStart: "2026-07-01",
      windowEnd: "2026-07-31",
    });
    expect(clamped?.date).toBe("2026-07-01");
    expect(clamped?.title).toBe("Team holiday");

    expect(
      buildLeaveActivity({
        id: "lv_3",
        type: "sick",
        reason: null,
        startDate: "2026-05-01",
        endDate: "2026-05-03",
        createdAt: "2026-05-01T00:00:00.000Z",
        windowStart: "2026-07-01",
        windowEnd: "2026-07-31",
      }),
    ).toBeNull();
  });
});
