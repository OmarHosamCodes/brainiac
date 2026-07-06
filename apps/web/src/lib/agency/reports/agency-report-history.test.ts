import { describe, expect, test } from "bun:test";

import {
  formatAgencyReportHistoryLabel,
  pushAgencyReportHistory,
  type ReportHistoryLabelContext,
} from "@/lib/agency/reports/agency-report-history";
import type { AgencyTimeRangeFilterSnapshot } from "@/lib/agency/use-agency-time-range-filters";

const context: ReportHistoryLabelContext = {
  clients: [{ id: "client-1", name: "Acme" }],
  projects: [{ id: "project-1", name: "Portal" }],
  members: [{ userId: "user-1", userName: "Alex" }],
};

function makeSnapshot(
  overrides: Partial<AgencyTimeRangeFilterSnapshot> = {},
): AgencyTimeRangeFilterSnapshot {
  return {
    id: "snap-1",
    savedAt: "2026-07-01T10:00:00.000Z",
    rangePreset: "week",
    customFromDate: "2026-06-30",
    customToDate: "2026-07-06",
    clientId: "",
    projectId: "",
    memberUserId: "",
    fieldIds: ["project", "task", "description", "duration", "assignee"],
    range: { from: "2026-06-30T00:00:00.000Z", to: "2026-07-06T23:59:59.999Z" },
    ...overrides,
  };
}

describe("agency-report-history", () => {
  test("formats labels with resolved entity names", () => {
    const label = formatAgencyReportHistoryLabel(
      makeSnapshot({
        clientId: "client-1",
        projectId: "project-1",
        memberUserId: "user-1",
      }),
      context,
    );
    expect(label).toBe("This week · Acme · Portal · Alex");
  });

  test("dedupes identical snapshots on push", () => {
    const teamId = `team-test-${crypto.randomUUID()}`;
    const snapshot = makeSnapshot({ id: "a" });
    pushAgencyReportHistory(teamId, snapshot);
    const second = pushAgencyReportHistory(teamId, { ...snapshot, id: "b" });
    expect(second).toHaveLength(1);
    expect(second[0]?.id).toBe("b");
  });
});
