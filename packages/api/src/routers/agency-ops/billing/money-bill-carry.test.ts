import { describe, expect, test } from "bun:test";

import {
  buildClientObligations,
  buildMemberObligations,
  groupObligationsForExport,
  selectOpenPriorDocs,
  selectUncoveredReadySlices,
} from "./money-bill-carry";

describe("money-bill-carry", () => {
  const aprilStart = "2026-04-01T00:00:00.000Z";
  const aprilEnd = "2026-04-30T23:59:59.999Z";
  const marchStart = "2026-03-01T00:00:00.000Z";
  const marchEnd = "2026-03-31T23:59:59.999Z";

  test("selectOpenPriorDocs keeps remaining prior invoices only", () => {
    const open = selectOpenPriorDocs(
      [
        {
          id: "inv-031",
          periodStart: marchStart,
          periodEnd: marchEnd,
          remainingAmount: 18_500,
          amount: 40_000,
          receivedOrPaidAmount: 21_500,
        },
        {
          id: "inv-paid",
          periodStart: marchStart,
          periodEnd: marchEnd,
          remainingAmount: 0,
          amount: 10_000,
          receivedOrPaidAmount: 10_000,
        },
        {
          id: "inv-april",
          periodStart: aprilStart,
          periodEnd: aprilEnd,
          remainingAmount: 5_000,
          amount: 5_000,
          receivedOrPaidAmount: 0,
        },
      ],
      aprilStart,
    );
    expect(open.map((d) => d.id)).toEqual(["inv-031"]);
  });

  test("selectUncoveredReadySlices skips slices covered by a document", () => {
    const uncovered = selectUncoveredReadySlices(
      [
        {
          partyId: "c1",
          partyName: "Northwind",
          periodStart: marchStart,
          periodEnd: marchEnd,
          amount: 4_200,
          durationSeconds: 3600,
          wasteAmount: 0,
        },
        {
          partyId: "c1",
          partyName: "Northwind",
          periodStart: aprilStart,
          periodEnd: aprilEnd,
          amount: 12_000,
          durationSeconds: 40 * 3600,
          wasteAmount: 0,
        },
      ],
      [{ periodStart: marchStart, periodEnd: marchEnd }],
    );
    expect(uncovered).toHaveLength(1);
    expect(uncovered[0]?.periodStart).toBe(aprilStart);
  });

  test("buildClientObligations emits April Ready + March invoice + residual March Ready", () => {
    const rows = buildClientObligations({
      rangeStart: aprilStart,
      rangeEnd: aprilEnd,
      invoices: [
        {
          id: "inv-031",
          clientId: "c1",
          clientName: "Northwind",
          number: "INV-031",
          periodStart: marchStart,
          periodEnd: marchEnd,
          amount: 40_000,
          receivedAmount: 21_500,
          remainingAmount: 18_500,
        },
      ],
      readySlices: [
        {
          clientId: "c1",
          clientName: "Northwind",
          periodStart: aprilStart,
          periodEnd: aprilEnd,
          amount: 12_000,
          durationSeconds: 40 * 3600,
          wasteAmount: 0,
        },
        {
          clientId: "c1",
          clientName: "Northwind",
          periodStart: marchStart,
          periodEnd: marchEnd,
          // Activity 44_200 − invoice 40_000 → Ready 4_200
          amount: 44_200,
          durationSeconds: 3600,
          wasteAmount: 0,
        },
      ],
    });

    expect(rows.map((r) => `${r.kind}:${r.isCarry}:${r.remainingAmount}`)).toEqual([
      "ready:false:12000",
      "invoice:true:18500",
      "ready:true:4200",
    ]);
  });

  test("buildMemberObligations emits April Ready + March partial + residual March Ready", () => {
    const rows = buildMemberObligations({
      rangeStart: aprilStart,
      rangeEnd: aprilEnd,
      payouts: [
        {
          id: "pl-1",
          userId: "u1",
          userName: "Sara",
          userAvatar: null,
          periodStart: marchStart,
          periodEnd: marchEnd,
          amount: 25_000,
          paidAmount: 15_000,
          remainingAmount: 10_000,
          durationSeconds: 0,
        },
      ],
      readySlices: [
        {
          userId: "u1",
          userName: "Sara",
          userAvatar: null,
          periodStart: aprilStart,
          periodEnd: aprilEnd,
          amount: 25_000,
          durationSeconds: 0,
          wasteAmount: 0,
        },
        {
          userId: "u1",
          userName: "Sara",
          userAvatar: null,
          periodStart: marchStart,
          periodEnd: marchEnd,
          // Activity 27_500 − payout 25_000 → Ready 2_500
          amount: 27_500,
          durationSeconds: 0,
          wasteAmount: 0,
        },
      ],
    });

    expect(rows.map((r) => `${r.kind}:${r.isCarry}:${r.remainingAmount}`)).toEqual([
      "ready:false:25000",
      "payout:true:10000",
      "ready:true:2500",
    ]);
  });

  test("groupObligationsForExport combine vs split", () => {
    const items = [
      { periodStart: aprilStart, periodEnd: aprilEnd },
      { periodStart: marchStart, periodEnd: marchEnd },
      { periodStart: marchStart, periodEnd: marchEnd },
    ];
    expect(groupObligationsForExport(items, "combine")).toHaveLength(1);
    expect(groupObligationsForExport(items, "split")).toHaveLength(2);
  });
});
