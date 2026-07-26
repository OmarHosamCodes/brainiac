import { describe, expect, test } from "bun:test";

import {
  computeProjectShareMetrics,
  isReportEntryWaste,
  isWasteLabel,
} from "./project-share-metrics";

describe("isWasteLabel", () => {
  test("matches waste in any format", () => {
    expect(isWasteLabel("waste")).toBe(true);
    expect(isWasteLabel("Waste")).toBe(true);
    expect(isWasteLabel("  WASTE  ")).toBe(true);
    expect(isWasteLabel("waste!")).toBe(true);
    expect(isWasteLabel("Daily waste")).toBe(true);
    expect(isWasteLabel("wasted effort")).toBe(false);
    expect(isWasteLabel("Research")).toBe(false);
    expect(isWasteLabel(null)).toBe(false);
  });
});

describe("isReportEntryWaste", () => {
  test("uses isWaste flag", () => {
    expect(isReportEntryWaste(true, "Research", "Ship")).toBe(true);
    expect(isReportEntryWaste(false, "Research", "Ship")).toBe(false);
    expect(isReportEntryWaste(null, null, "Ship")).toBe(false);
  });

  test("matches waste task or project names", () => {
    expect(isReportEntryWaste(false, "Waste", "Ship")).toBe(true);
    expect(isReportEntryWaste(false, "Ship", "Waste")).toBe(true);
    expect(isReportEntryWaste(false, "Ship", "Internal waste")).toBe(true);
    expect(isReportEntryWaste(false, "Ship", "Shipping")).toBe(false);
  });
});

describe("computeProjectShareMetrics", () => {
  test("splits internal/external and computes paid from external waste", () => {
    expect(
      computeProjectShareMetrics([
        {
          durationSeconds: 3_600,
          clientCategory: "external",
          taskIsWaste: false,
          taskTitle: "Ship",
          projectName: "Client work",
        },
        {
          durationSeconds: 1_800,
          clientCategory: "external",
          taskIsWaste: true,
          taskTitle: "Ship",
          projectName: "Client work",
        },
        {
          durationSeconds: 900,
          clientCategory: "external",
          taskIsWaste: false,
          taskTitle: "Waste",
          projectName: "Client work",
        },
        {
          durationSeconds: 600,
          clientCategory: "external",
          taskIsWaste: false,
          taskTitle: "Admin",
          projectName: "Waste",
        },
        {
          durationSeconds: 2_700,
          clientCategory: "internal",
          taskIsWaste: true,
          taskTitle: "waste",
          projectName: "Waste",
          isBillable: false,
        },
        {
          durationSeconds: 1_200,
          clientCategory: "internal",
          taskIsWaste: false,
          taskTitle: "Standup",
          projectName: "Ops",
          isBillable: true,
        },
      ]),
    ).toEqual({
      externalSeconds: 3_600 + 1_800 + 900 + 600,
      internalSeconds: 2_700 + 1_200,
      internalBillableSeconds: 1_200,
      paidSeconds: 3_600 + 1_800 + 900 + 600 - 1_800 - 900 - 600,
    });
  });

  test("treats missing isBillable as billable for internal hours", () => {
    expect(
      computeProjectShareMetrics([
        {
          durationSeconds: 3_600,
          clientCategory: "internal",
          taskIsWaste: false,
          taskTitle: "Ops",
          projectName: "Agency",
        },
      ]),
    ).toEqual({
      externalSeconds: 0,
      internalSeconds: 3_600,
      internalBillableSeconds: 3_600,
      paidSeconds: 0,
    });
  });
});
