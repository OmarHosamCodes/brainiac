import { describe, expect, test } from "bun:test";
import {
  filterSavedReports,
  formatCompactDateSpan,
  formatRelativeReportTime,
  formatReportHeaderMeta,
  formatReportPeriodDayMonth,
  getAgencyReportPeriodGroup,
  groupSavedReportsByPeriod,
  sanitizeReportFileName,
  suggestAgencyReportName,
} from "./agency-report-naming";

const labelContext = {
  clients: [{ id: "c1", name: "Acme" }],
  projects: [{ id: "p1", name: "Website" }],
  members: [{ userId: "u1", userName: "Sara" }],
};

const headerLabelContext = {
  clients: labelContext.clients,
  projects: labelContext.projects,
  members: labelContext.members,
};

describe("agency-report-naming", () => {
  test("formatReportPeriodDayMonth uses day-first compact labels", () => {
    expect(formatReportPeriodDayMonth("2026-05-26T00:00:00.000Z")).toBe("26 May");
    expect(formatReportPeriodDayMonth("2026-06-25T23:59:59.999Z")).toBe("25 Jun");
  });

  test("suggestAgencyReportName", () => {
    expect(
      suggestAgencyReportName(
        { range: { from: "2026-06-01T00:00:00.000Z", to: "2026-06-30T23:59:59.999Z" } },
        labelContext,
      ),
    ).toBe("Q2 2026");

    expect(
      suggestAgencyReportName(
        {
          range: { from: "2026-06-01T00:00:00.000Z", to: "2026-08-31T23:59:59.999Z" },
          clientId: "c1",
          memberUserId: "u1",
        },
        labelContext,
      ),
    ).toBe("Q2–Q3 2026 · Acme · Sara");

    expect(
      suggestAgencyReportName(
        {
          range: { from: "2025-10-01T00:00:00.000Z", to: "2026-03-31T23:59:59.999Z" },
        },
        labelContext,
      ),
    ).toBe("Q4 2025–Q1 2026");
  });

  test("getAgencyReportPeriodGroup", () => {
    const julyGroup = getAgencyReportPeriodGroup("2026-07-15T12:00:00.000Z");
    expect(julyGroup.label).toBe("2026 · Q3 · July");
    expect(julyGroup.key).toBe("2026-Q3-7");
  });

  test("saved reports grouping and filtering", () => {
    const reports = [
      {
        id: "r1",
        name: "Q3 2026 · Acme",
        rangeFrom: "2026-07-01T00:00:00.000Z",
        updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
        createdByUserName: "Sara",
        clientId: "c1",
        memberUserId: "",
      },
      {
        id: "r2",
        name: "Q2 2026",
        rangeFrom: "2026-04-01T00:00:00.000Z",
        updatedAt: new Date().toISOString(),
        createdByUserName: "Omar",
        clientId: "",
        memberUserId: "",
      },
    ];

    const grouped = groupSavedReportsByPeriod(reports);
    expect(grouped.length).toBe(2);
    expect(grouped[0]?.group.quarter).toBe(3);
    expect(grouped[1]?.group.quarter).toBe(2);

    expect(filterSavedReports(reports, "acme", labelContext).length).toBe(1);
    expect(filterSavedReports(reports, "sara", labelContext).length).toBe(1);
  });

  test("formatting utilities", () => {
    expect(formatRelativeReportTime(new Date(Date.now() - 90_000).toISOString())).toMatch(/m ago/);
    expect(sanitizeReportFileName("Q3 2026 · Acme")).toBe("Q3 2026 · Acme");
    expect(sanitizeReportFileName("  ")).toBe("report");

    expect(formatCompactDateSpan("2026-07-01T00:00:00.000Z", "2026-09-30T23:59:59.999Z")).toBe(
      "Jul 1 – Sep 30",
    );

    const headerMeta = formatReportHeaderMeta(
      {
        rangeFrom: "2026-07-01T00:00:00.000Z",
        rangeTo: "2026-09-30T23:59:59.999Z",
        clientId: "c1",
        memberUserId: "u1",
        createdByUserName: "Sara",
        visibleEntryCount: 142,
      },
      headerLabelContext,
    );
    expect(headerMeta.scopeLine).toBe("Q3 2026 · Jul 1 – Sep 30 · Acme · Sara · 142 entries");
    expect(headerMeta.attributionLine).toBe("Created by Sara");
  });
});
