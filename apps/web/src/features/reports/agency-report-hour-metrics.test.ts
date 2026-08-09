import { describe, expect, test } from "bun:test";

import {
  computeReportHourMetrics,
  metricsForAggregatedRows,
} from "@/features/reports/agency-report-hour-metrics";
import type { AggregatedReportRow } from "@/features/reports/agency-report-grouping";

describe("computeReportHourMetrics", () => {
  test("splits paid, waste, and internal from client category", () => {
    const metrics = computeReportHourMetrics(
      [
        {
          clientId: "ext",
          durationSeconds: 3600,
          projectName: "Portal",
          taskTitle: "Build",
          taskIsWaste: false,
          isWaste: false,
          isBillable: true,
        },
        {
          clientId: "ext",
          durationSeconds: 1800,
          projectName: "Portal",
          taskTitle: "Waste review",
          taskIsWaste: true,
          isWaste: true,
          isBillable: false,
        },
        {
          clientId: "int",
          durationSeconds: 1200,
          projectName: "Ops",
          taskTitle: "Standup",
          taskIsWaste: false,
          isWaste: false,
          isBillable: true,
        },
        {
          clientId: "int",
          durationSeconds: 600,
          projectName: "Ops",
          taskTitle: "Admin",
          taskIsWaste: false,
          isWaste: false,
          isBillable: false,
        },
      ],
      [
        { id: "ext", category: "external" },
        { id: "int", category: "internal" },
      ],
    );

    expect(metrics).toEqual({
      totalSeconds: 7200,
      externalSeconds: 5400,
      internalSeconds: 1800,
      internalBillableSeconds: 1200,
      paidSeconds: 3600,
      wasteSeconds: 1800,
      entryCount: 4,
    });
  });

  test("treats unknown client category as external", () => {
    const metrics = computeReportHourMetrics(
      [
        {
          clientId: "missing",
          durationSeconds: 900,
          projectName: "Portal",
          taskTitle: "Build",
          taskIsWaste: false,
          isWaste: false,
        },
      ],
      [],
    );

    expect(metrics.externalSeconds).toBe(900);
    expect(metrics.internalSeconds).toBe(0);
    expect(metrics.paidSeconds).toBe(900);
  });
});

describe("metricsForAggregatedRows", () => {
  test("flattens grouped rows then splits paid waste and internal", () => {
    const rows = [
      {
        entries: [
          {
            clientId: "ext",
            durationSeconds: 3600,
            projectName: "Portal",
            taskTitle: "Build",
            taskIsWaste: false,
            isWaste: false,
            isBillable: true,
          },
        ],
      },
      {
        entries: [
          {
            clientId: "int",
            durationSeconds: 1200,
            projectName: "Ops",
            taskTitle: "Standup",
            taskIsWaste: false,
            isWaste: false,
            isBillable: true,
          },
        ],
      },
    ] as AggregatedReportRow[];

    expect(
      metricsForAggregatedRows(rows, [
        { id: "ext", category: "external" },
        { id: "int", category: "internal" },
      ]),
    ).toMatchObject({
      totalSeconds: 4800,
      paidSeconds: 3600,
      internalSeconds: 1200,
      entryCount: 2,
    });
  });
});
