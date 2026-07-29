import { describe, expect, test } from "bun:test";

import type { DisplayClientGroup } from "@/features/reports/agency-report-grouping";
import {
  buildAgencyReportExportFileName,
  planAgencyReportExportJobs,
  resolveAgencyReportExportBaseName,
} from "@/features/reports/export-agency-report-xlsx";

function makeClientGroup(
  overrides: Partial<DisplayClientGroup> & Pick<DisplayClientGroup, "clientId" | "clientName">,
): DisplayClientGroup {
  return {
    projects: [],
    totalSeconds: 0,
    ...overrides,
  };
}

describe("agency report export planning", () => {
  test("resolves base name from report name or team id", () => {
    expect(resolveAgencyReportExportBaseName("team-1", "Q1 Acme")).toBe("Q1 Acme");
    expect(resolveAgencyReportExportBaseName("team-1")).toBe("agency-report-team-1");
  });

  test("builds combined and per-client filenames", () => {
    expect(buildAgencyReportExportFileName("Report", "2026-07-29")).toBe("Report-2026-07-29.xlsx");
    expect(buildAgencyReportExportFileName("Report", "2026-07-29", "Acme Corp")).toBe(
      "Report-Acme Corp-2026-07-29.xlsx",
    );
  });

  test("combined mode yields one job with all clients", () => {
    const clients = [
      makeClientGroup({ clientId: "c1", clientName: "Acme", totalSeconds: 100 }),
      makeClientGroup({ clientId: "c2", clientName: "Beta", totalSeconds: 200 }),
    ];
    const jobs = planAgencyReportExportJobs(clients, "combined", "Report", "2026-07-29");
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.fileName).toBe("Report-2026-07-29.xlsx");
    expect(jobs[0]?.clientGroups).toHaveLength(2);
  });

  test("per-client mode yields one job per client with client in filename", () => {
    const clients = [
      makeClientGroup({ clientId: "c1", clientName: "Acme", totalSeconds: 100 }),
      makeClientGroup({ clientId: "c2", clientName: "Beta", totalSeconds: 200 }),
    ];
    const jobs = planAgencyReportExportJobs(clients, "per-client", "Report", "2026-07-29");
    expect(jobs).toHaveLength(2);
    expect(jobs.map((job) => job.fileName)).toEqual([
      "Report-Acme-2026-07-29.xlsx",
      "Report-Beta-2026-07-29.xlsx",
    ]);
    expect(jobs[0]?.clientGroups).toEqual([clients[0]]);
    expect(jobs[1]?.clientGroups).toEqual([clients[1]]);
  });

  test("per-client mode with no clients yields zero jobs", () => {
    expect(planAgencyReportExportJobs([], "per-client", "Report", "2026-07-29")).toEqual([]);
  });
});
