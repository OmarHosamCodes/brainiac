import { describe, expect, test } from "bun:test";

import {
  buildHourBreakdownFlowLayout,
  buildHourBreakdownSegments,
  deriveInternalSplit,
  MIN_FLOW_SHARE,
} from "./agency-hour-breakdown-flow";

const baseMetrics = {
  totalSeconds: 10_000,
  externalSeconds: 7_000,
  internalSeconds: 3_000,
  internalBillableSeconds: 2_000,
  paidSeconds: 5_000,
};

describe("deriveInternalSplit", () => {
  test("splits internal into billable and non-billable", () => {
    expect(deriveInternalSplit(baseMetrics)).toEqual({
      wasteSeconds: 2_000,
      internalBillableSeconds: 2_000,
      internalNonBillableSeconds: 1_000,
    });
  });

  test("clamps internal billable to the internal total", () => {
    expect(
      deriveInternalSplit({
        ...baseMetrics,
        internalBillableSeconds: 9_999,
      }).internalBillableSeconds,
    ).toBe(3_000);
  });
});

describe("buildHourBreakdownSegments", () => {
  test("exposes four destination segments including the internal split", () => {
    const segments = buildHourBreakdownSegments(baseMetrics);

    expect(segments.find((segment) => segment.id === "waste")?.seconds).toBe(2_000);
    expect(segments.find((segment) => segment.id === "paid")?.seconds).toBe(5_000);
    expect(segments.find((segment) => segment.id === "internalBillable")?.seconds).toBe(2_000);
    expect(segments.find((segment) => segment.id === "internalNonBillable")?.seconds).toBe(1_000);
  });
});

describe("buildHourBreakdownFlowLayout", () => {
  test("bar spans are contiguous and cover the full width", () => {
    const layout = buildHourBreakdownFlowLayout(baseMetrics);

    expect(layout.bar[0]?.span.x0).toBe(0);
    expect(layout.bar[0]?.span.x1).toBeCloseTo(layout.bar[1]?.span.x0 ?? -1);
    expect(layout.bar[1]?.span.x1).toBeCloseTo(layout.bar[2]?.span.x0 ?? -1);
    expect(layout.bar[2]?.span.x1).toBeCloseTo(layout.bar[3]?.span.x0 ?? -1);
    expect(layout.bar[3]?.span.x1).toBe(1);

    const shareSum =
      layout.shares.paid +
      layout.shares.waste +
      layout.shares.internalBillable +
      layout.shares.internalNonBillable;
    expect(shareSum).toBeCloseTo(1);
  });

  test("zero-second stages keep the minimum flow share", () => {
    const layout = buildHourBreakdownFlowLayout({
      totalSeconds: 3_600,
      externalSeconds: 3_600,
      internalSeconds: 0,
      internalBillableSeconds: 0,
      paidSeconds: 3_600,
    });

    expect(layout.shares.waste).toBe(MIN_FLOW_SHARE);
    expect(layout.shares.internalBillable).toBe(MIN_FLOW_SHARE);
    expect(layout.shares.internalNonBillable).toBe(MIN_FLOW_SHARE);
    expect(layout.shares.paid).toBeCloseTo(1 - 3 * MIN_FLOW_SHARE);
  });

  test("internal destination links split billable and non-billable", () => {
    const layout = buildHourBreakdownFlowLayout(baseMetrics);

    const billableLink = layout.destinationLinks.find((link) => link.id === "internal-billable");
    const nonBillableLink = layout.destinationLinks.find(
      (link) => link.id === "internal-non-billable",
    );

    expect(billableLink?.source.x0).toBeCloseTo(layout.nodes.internal.x0);
    expect(billableLink?.source.x1).toBeCloseTo(nonBillableLink?.source.x0 ?? -1);
    expect(nonBillableLink?.source.x1).toBeCloseTo(layout.nodes.internal.x1);

    expect(billableLink?.target).toEqual(layout.bar[2]?.span);
    expect(nonBillableLink?.target).toEqual(layout.bar[3]?.span);
  });
});
