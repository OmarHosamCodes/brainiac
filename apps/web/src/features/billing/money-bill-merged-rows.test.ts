import { describe, expect, test } from "bun:test";

import {
  buildMergedMoneyBillDisplayRows,
  filterMergedRowsByClientCategory,
  groupMoneyBillDisplayRows,
  moneyBillRowFromMergedClient,
  moneyBillRowFromMergedMember,
} from "./money-bill-merged-rows";
import { moneyBillRowFromAdjustmentLine } from "./money-bills-rows";

describe("moneyBillRowFromMergedClient", () => {
  test("merges ready work with invoice into one conserved pool", () => {
    const row = moneyBillRowFromMergedClient({
      clientId: "c1",
      clientName: "DR El Nazzer",
      activity: {
        clientId: "c1",
        clientName: "DR El Nazzer",
        durationSeconds: 3600,
        billableAmount: 6_450_000,
        wasteAmount: 1_020_000,
        currency: "EGP",
      },
      invoices: [
        {
          id: "inv_1",
          clientId: "c1",
          clientName: "DR El Nazzer",
          number: "INV-0238",
          status: "partial",
          billStatus: "partial",
          amount: 4_000_000,
          receivedAmount: 2_800_000,
          remainingAmount: 1_200_000,
          currency: "EGP",
          periodStart: "2026-01-01T00:00:00.000Z",
          periodEnd: "2026-01-31T23:59:59.999Z",
        },
      ],
    });

    expect(row.kind).toBe("merged-client");
    expect(row.statusLabel).toBe("Mixed");
    expect(row.uninvoicedCents).toBe(6_450_000);
    expect(row.receivedAmount).toBe(2_800_000);
    expect(row.remainingAmount).toBe(1_200_000);
    expect(row.totalCents).toBe(10_450_000);
    expect(row.openCents).toBe(7_650_000);
    expect(row.wasteAmount).toBe(1_020_000);
    expect(row.canCreateInvoice).toBe(true);
    expect(row.primaryInvoiceId).toBe("inv_1");
    expect(row.subtitle).toContain("Ready");
    expect(row.subtitle).toContain("INV-0238");
  });

  test("ready-only subtitle uses duration instead of repeating Ready", () => {
    const row = moneyBillRowFromMergedClient({
      clientId: "c1",
      clientName: "Acme",
      activity: {
        clientId: "c1",
        clientName: "Acme",
        durationSeconds: 3661,
        billableAmount: 5000,
        wasteAmount: 0,
        currency: "USD",
      },
      invoices: [],
    });
    expect(row.statusLabel).toBe("Ready");
    expect(row.subtitle).not.toContain("Ready");
    expect(row.subtitle).toMatch(/1:01/);
  });
});

describe("moneyBillRowFromMergedMember", () => {
  test("merges ready payable with payout line", () => {
    const row = moneyBillRowFromMergedMember({
      userId: "u1",
      userName: "Ada",
      userAvatar: null,
      activity: {
        userId: "u1",
        userName: "Ada",
        userAvatar: null,
        durationSeconds: 7200,
        payableAmount: 50_000,
        wasteAmount: 0,
        currency: "USD",
      },
      payouts: [
        {
          id: "pay_1",
          sectionKey: "salaries",
          sectionTitle: "Salaries",
          userId: "u1",
          userName: "Ada",
          userAvatar: null,
          label: "Salary · Ada",
          status: "partial",
          billStatus: "partial",
          amount: 40_000,
          paidAmount: 10_000,
          remainingAmount: 30_000,
          currency: "USD",
          durationSeconds: 3600,
          periodStart: "2026-01-01T00:00:00.000Z",
          periodEnd: "2026-01-31T23:59:59.999Z",
        },
      ],
    });

    expect(row.kind).toBe("merged-member");
    expect(row.statusLabel).toBe("Mixed");
    expect(row.totalCents).toBe(90_000);
    expect(row.openCents).toBe(80_000);
    expect(row.canCreatePayout).toBe(true);
    expect(row.primaryPayoutId).toBe("pay_1");
    expect(row.paidTitle).toBe("Paid");
  });
});

describe("buildMergedMoneyBillDisplayRows", () => {
  test("keeps one row per client even when invoice already exists", () => {
    const rows = buildMergedMoneyBillDisplayRows({
      clients: [
        {
          clientId: "c1",
          clientName: "Acme",
          durationSeconds: 1800,
          billableAmount: 5000,
          wasteAmount: 100,
          currency: "USD",
        },
      ],
      invoices: [
        {
          id: "inv_1",
          clientId: "c1",
          clientName: "Acme",
          number: "INV-1",
          status: "sent",
          billStatus: "outstanding",
          amount: 2000,
          receivedAmount: 0,
          remainingAmount: 2000,
          currency: "USD",
          periodStart: "2026-01-01T00:00:00.000Z",
          periodEnd: "2026-01-31T23:59:59.999Z",
        },
      ],
      members: [],
      payouts: [],
      adjustments: [],
      statusFilter: null,
      includeClients: true,
      includeMembers: false,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe("merged-client");
    if (rows[0]?.kind === "merged-client") {
      expect(rows[0].uninvoicedCents).toBe(5000);
      expect(rows[0].remainingAmount).toBe(2000);
      expect(rows[0].totalCents).toBe(7000);
    }
  });

  test("groups clients, members, and adjustments into Approach 03 sections", () => {
    const rows = buildMergedMoneyBillDisplayRows({
      clients: [
        {
          clientId: "c1",
          clientName: "Acme",
          durationSeconds: 60,
          billableAmount: 100,
          wasteAmount: 0,
          currency: "USD",
        },
      ],
      invoices: [],
      members: [
        {
          userId: "u1",
          userName: "Ada",
          userAvatar: null,
          durationSeconds: 60,
          payableAmount: 200,
          wasteAmount: 0,
          currency: "USD",
        },
      ],
      payouts: [],
      adjustments: [
        moneyBillRowFromAdjustmentLine({
          id: "adj_1",
          sectionKey: "charity",
          sectionTitle: "Charity",
          userId: null,
          userName: "",
          userAvatar: null,
          label: "Charity",
          status: "draft",
          billStatus: "outstanding",
          amount: 1000,
          paidAmount: 0,
          remainingAmount: 1000,
          currency: "USD",
          durationSeconds: 0,
          periodStart: "2026-01-01T00:00:00.000Z",
          periodEnd: "2026-01-31T23:59:59.999Z",
          canDelete: true,
        }),
      ],
      statusFilter: null,
      includeClients: true,
      includeMembers: true,
    });

    expect(groupMoneyBillDisplayRows(rows).map((section) => section.id)).toEqual([
      "clients",
      "team",
      "adjustments",
    ]);
  });
});

describe("filterMergedRowsByClientCategory", () => {
  test("keeps only external clients when filtered", () => {
    const rows = buildMergedMoneyBillDisplayRows({
      clients: [
        {
          clientId: "ext",
          clientName: "External Co",
          durationSeconds: 60,
          billableAmount: 100,
          wasteAmount: 0,
          currency: "USD",
        },
        {
          clientId: "int",
          clientName: "Internal Co",
          durationSeconds: 60,
          billableAmount: 100,
          wasteAmount: 0,
          currency: "USD",
        },
      ],
      invoices: [],
      members: [],
      payouts: [],
      adjustments: [],
      statusFilter: null,
      includeClients: true,
      includeMembers: false,
    });
    const categories = new Map([
      ["ext", "external" as const],
      ["int", "internal" as const],
    ]);
    const filtered = filterMergedRowsByClientCategory(rows, "external", categories);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.kind === "merged-client" && filtered[0].clientId).toBe("ext");
  });
});
