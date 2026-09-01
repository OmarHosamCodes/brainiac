import { describe, expect, test } from "bun:test";

import {
  buildClientObligations,
  buildMemberObligations,
  filterAdjustmentsForPeriod,
  groupObligationsForExport,
  isInvoiceObligationId,
  netClientAdjustmentAmount,
  readyAdjustmentMatchesExport,
  scoreboardClientAdjustmentNet,
  selectOpenPriorDocs,
  selectUncoveredReadySlices,
  signedClientAdjustmentAmount,
} from "./money-bill-carry";

describe("money-bill-carry", () => {
  const aprilStart = "2026-04-01T00:00:00.000Z";
  const aprilEnd = "2026-04-30T23:59:59.999Z";
  const marchStart = "2026-03-01T00:00:00.000Z";
  const marchEnd = "2026-03-31T23:59:59.999Z";

  test("signed and net client adjustments", () => {
    expect(signedClientAdjustmentAmount("discount", 500)).toBe(-500);
    expect(signedClientAdjustmentAmount("surcharge", 200)).toBe(200);
    expect(signedClientAdjustmentAmount("debt", 100)).toBe(100);
    expect(
      netClientAdjustmentAmount([
        { kind: "discount", amount: 500 },
        { kind: "surcharge", amount: 200 },
      ]),
    ).toBe(-300);
    expect(isInvoiceObligationId("inv-1")).toBe(true);
    expect(isInvoiceObligationId("ready:client:c1:a:b")).toBe(false);
  });

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
          sourceAmount: 4_200,
          rateCurrency: "USD",
          durationSeconds: 3600,
          wasteAmount: 0,
        },
        {
          partyId: "c1",
          partyName: "Northwind",
          periodStart: aprilStart,
          periodEnd: aprilEnd,
          amount: 12_000,
          sourceAmount: 12_000,
          rateCurrency: "USD",
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
          sourceAmount: 40_000,
          rateCurrency: "USD",
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
          sourceAmount: 12_000,
          rateCurrency: "USD",
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
          sourceAmount: 44_200,
          rateCurrency: "USD",
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

  test("ready surcharge is included in residual after invoice subtraction", () => {
    const rows = buildClientObligations({
      rangeStart: aprilStart,
      rangeEnd: aprilEnd,
      invoices: [],
      readySlices: [
        {
          clientId: "c1",
          clientName: "Northwind",
          periodStart: aprilStart,
          periodEnd: aprilEnd,
          amount: 10_000,
          sourceAmount: 10_000,
          rateCurrency: "USD",
          durationSeconds: 3600,
          wasteAmount: 0,
        },
      ],
      adjustments: [
        {
          partyId: "c1",
          obligationId: `ready:client:c1:${aprilStart}:${aprilEnd}`,
          appliedInvoiceId: null,
          periodStart: aprilStart,
          periodEnd: aprilEnd,
          kind: "surcharge",
          amount: 2_000,
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.amount).toBe(12_000);
    expect(rows[0]?.remainingAmount).toBe(12_000);
  });

  test("invoice-targeted adjustment does not also inflate ready residual", () => {
    const rows = buildClientObligations({
      rangeStart: aprilStart,
      rangeEnd: aprilEnd,
      invoices: [
        {
          id: "inv-1",
          clientId: "c1",
          clientName: "Northwind",
          number: "INV-1",
          periodStart: aprilStart,
          periodEnd: aprilEnd,
          amount: 12_000,
          sourceAmount: 12_000,
          rateCurrency: "USD",
          receivedAmount: 0,
          remainingAmount: 12_000,
        },
      ],
      readySlices: [
        {
          clientId: "c1",
          clientName: "Northwind",
          periodStart: aprilStart,
          periodEnd: aprilEnd,
          amount: 10_000,
          sourceAmount: 10_000,
          rateCurrency: "USD",
          durationSeconds: 0,
          wasteAmount: 0,
        },
      ],
      adjustments: [
        {
          partyId: "c1",
          obligationId: "inv-1",
          appliedInvoiceId: "inv-1",
          periodStart: aprilStart,
          periodEnd: aprilEnd,
          kind: "surcharge",
          amount: 2_000,
        },
      ],
    });
    expect(rows.map((r) => `${r.kind}:${r.amount}`)).toEqual(["invoice:12000"]);
  });

  test("filterAdjustmentsForPeriod keeps overlapping and legacy rows", () => {
    const kept = filterAdjustmentsForPeriod(
      [
        { periodStart: aprilStart, periodEnd: aprilEnd },
        { periodStart: marchStart, periodEnd: marchEnd },
        { periodStart: null, periodEnd: null },
      ],
      aprilStart,
      aprilEnd,
    );
    expect(kept).toHaveLength(2);
  });

  test("scoreboard net includes invoice apply and unapplied ready, skips exported ready", () => {
    expect(
      scoreboardClientAdjustmentNet([
        {
          kind: "surcharge",
          amount: 2_000,
          obligationId: "inv-1",
          appliedInvoiceId: "inv-1",
        },
        {
          kind: "surcharge",
          amount: 1_000,
          obligationId: "ready:client:c1:a:b",
          appliedInvoiceId: null,
        },
        {
          kind: "surcharge",
          amount: 500,
          obligationId: "ready:client:c1:a:b",
          appliedInvoiceId: "inv-exported",
        },
      ]),
    ).toBe(3_000);
  });

  test("readyAdjustmentMatchesExport is scoped to exported obligation ids", () => {
    const exported = [
      {
        obligationId: "ready:client:c1:april",
        periodStart: aprilStart,
        periodEnd: aprilEnd,
      },
    ];
    expect(
      readyAdjustmentMatchesExport(
        {
          obligationId: "ready:client:c1:april",
          appliedInvoiceId: null,
          periodStart: aprilStart,
          periodEnd: aprilEnd,
        },
        exported,
      ),
    ).toBe(true);
    expect(
      readyAdjustmentMatchesExport(
        {
          obligationId: "ready:client:c1:march",
          appliedInvoiceId: null,
          periodStart: marchStart,
          periodEnd: marchEnd,
        },
        exported,
      ),
    ).toBe(false);
    expect(
      readyAdjustmentMatchesExport(
        {
          obligationId: null,
          appliedInvoiceId: null,
          periodStart: aprilStart,
          periodEnd: aprilEnd,
        },
        exported,
      ),
    ).toBe(true);
  });
});
