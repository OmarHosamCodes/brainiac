import { describe, expect, test } from "bun:test";

import { buildMoneyBillPersonGroups } from "./money-bill-obligation-rows";
import { formatMoneyBillPeriod } from "./money-bills-rows";
import {
  moneyBillAdjustmentSettleLabel,
  moneyBillGroupCarryCount,
  moneyBillGroupPeriodLabel,
  moneyBillGroupSettleLabel,
  moneyBillGroupStatusLabel,
  moneyBillSalaryPoolSettleLabel,
  moneyBillStatusBadgeVariant,
  moneyBillTableShowsCarry,
  moneyBillTableShowsWaste,
  moneyBillsSheetCaption,
} from "./money-bills-table-columns";

function personGroupFromClients(
  clients: Parameters<typeof buildMoneyBillPersonGroups>[0]["clients"],
) {
  const rows = buildMoneyBillPersonGroups({
    clients,
    members: [],
    adjustments: [],
    pendingAdjustments: [],
    statusFilter: null,
    includeClients: true,
    includeMembers: false,
    includeAdjustments: false,
  });
  const group = rows[0];
  expect(group?.kind).toBe("person-group");
  if (group?.kind !== "person-group") throw new Error("expected person-group");
  return group;
}

describe("moneyBillGroupCarryCount", () => {
  test("counts carry lines only", () => {
    const group = personGroupFromClients([
      {
        kind: "ready",
        id: "ready:1",
        clientId: "c1",
        clientName: "Northwind",
        periodStart: "2026-04-01T00:00:00.000Z",
        periodEnd: "2026-04-30T23:59:59.999Z",
        isCarry: false,
        amount: 1000,
        sourceAmount: 1000,
        rateCurrency: "USD",
        receivedAmount: 0,
        remainingAmount: 1000,
        wasteAmount: 0,
        durationSeconds: 0,
        number: null,
      },
      {
        kind: "invoice",
        id: "inv-1",
        clientId: "c1",
        clientName: "Northwind",
        periodStart: "2026-03-01T00:00:00.000Z",
        periodEnd: "2026-03-31T23:59:59.999Z",
        isCarry: true,
        amount: 2000,
        sourceAmount: 2000,
        rateCurrency: "USD",
        receivedAmount: 0,
        remainingAmount: 2000,
        wasteAmount: 0,
        durationSeconds: 0,
        number: "INV-1",
      },
      {
        kind: "invoice",
        id: "inv-2",
        clientId: "c1",
        clientName: "Northwind",
        periodStart: "2026-02-01T00:00:00.000Z",
        periodEnd: "2026-02-28T23:59:59.999Z",
        isCarry: true,
        amount: 500,
        sourceAmount: 500,
        rateCurrency: "USD",
        receivedAmount: 0,
        remainingAmount: 500,
        wasteAmount: 0,
        durationSeconds: 0,
        number: "INV-2",
      },
    ]);

    expect(moneyBillGroupCarryCount(group)).toBe(2);
  });

  test("returns zero when no carry lines", () => {
    const group = personGroupFromClients([
      {
        kind: "ready",
        id: "ready:1",
        clientId: "c1",
        clientName: "Northwind",
        periodStart: "2026-04-01T00:00:00.000Z",
        periodEnd: "2026-04-30T23:59:59.999Z",
        isCarry: false,
        amount: 1000,
        sourceAmount: 1000,
        rateCurrency: "USD",
        receivedAmount: 0,
        remainingAmount: 1000,
        wasteAmount: 0,
        durationSeconds: 0,
        number: null,
      },
    ]);

    expect(moneyBillGroupCarryCount(group)).toBe(0);
  });
});

describe("moneyBillGroupPeriodLabel", () => {
  test("formats a single non-carry period", () => {
    const group = personGroupFromClients([
      {
        kind: "ready",
        id: "ready:1",
        clientId: "c1",
        clientName: "Northwind",
        periodStart: "2026-04-01T00:00:00.000Z",
        periodEnd: "2026-04-30T23:59:59.999Z",
        isCarry: false,
        amount: 1000,
        sourceAmount: 1000,
        rateCurrency: "USD",
        receivedAmount: 0,
        remainingAmount: 1000,
        wasteAmount: 0,
        durationSeconds: 0,
        number: null,
      },
    ]);

    expect(moneyBillGroupPeriodLabel(group)).toBe(
      formatMoneyBillPeriod("2026-04-01T00:00:00.000Z", "2026-04-30T23:59:59.999Z"),
    );
  });

  test("ignores carry periods when non-carry lines share one range", () => {
    const group = personGroupFromClients([
      {
        kind: "ready",
        id: "ready:1",
        clientId: "c1",
        clientName: "Northwind",
        periodStart: "2026-04-01T00:00:00.000Z",
        periodEnd: "2026-04-30T23:59:59.999Z",
        isCarry: false,
        amount: 1000,
        sourceAmount: 1000,
        rateCurrency: "USD",
        receivedAmount: 0,
        remainingAmount: 1000,
        wasteAmount: 0,
        durationSeconds: 0,
        number: null,
      },
      {
        kind: "invoice",
        id: "inv-1",
        clientId: "c1",
        clientName: "Northwind",
        periodStart: "2026-03-01T00:00:00.000Z",
        periodEnd: "2026-03-31T23:59:59.999Z",
        isCarry: true,
        amount: 2000,
        sourceAmount: 2000,
        rateCurrency: "USD",
        receivedAmount: 0,
        remainingAmount: 2000,
        wasteAmount: 0,
        durationSeconds: 0,
        number: "INV-1",
      },
    ]);

    expect(moneyBillGroupPeriodLabel(group)).toBe(
      formatMoneyBillPeriod("2026-04-01T00:00:00.000Z", "2026-04-30T23:59:59.999Z"),
    );
  });

  test("returns Mixed when non-carry lines span multiple periods", () => {
    const group = personGroupFromClients([
      {
        kind: "ready",
        id: "ready:1",
        clientId: "c1",
        clientName: "Northwind",
        periodStart: "2026-04-01T00:00:00.000Z",
        periodEnd: "2026-04-30T23:59:59.999Z",
        isCarry: false,
        amount: 1000,
        sourceAmount: 1000,
        rateCurrency: "USD",
        receivedAmount: 0,
        remainingAmount: 1000,
        wasteAmount: 0,
        durationSeconds: 0,
        number: null,
      },
      {
        kind: "ready",
        id: "ready:2",
        clientId: "c1",
        clientName: "Northwind",
        periodStart: "2026-05-01T00:00:00.000Z",
        periodEnd: "2026-05-31T23:59:59.999Z",
        isCarry: false,
        amount: 500,
        sourceAmount: 500,
        rateCurrency: "USD",
        receivedAmount: 0,
        remainingAmount: 500,
        wasteAmount: 0,
        durationSeconds: 0,
        number: null,
      },
    ]);

    expect(moneyBillGroupPeriodLabel(group)).toBe("Mixed");
  });

  test("falls back to carry lines when no non-carry lines exist", () => {
    const group = personGroupFromClients([
      {
        kind: "invoice",
        id: "inv-1",
        clientId: "c1",
        clientName: "Northwind",
        periodStart: "2026-03-01T00:00:00.000Z",
        periodEnd: "2026-03-31T23:59:59.999Z",
        isCarry: true,
        amount: 2000,
        sourceAmount: 2000,
        rateCurrency: "USD",
        receivedAmount: 0,
        remainingAmount: 2000,
        wasteAmount: 0,
        durationSeconds: 0,
        number: "INV-1",
      },
    ]);

    expect(moneyBillGroupPeriodLabel(group)).toBe(
      formatMoneyBillPeriod("2026-03-01T00:00:00.000Z", "2026-03-31T23:59:59.999Z"),
    );
  });

  test("returns Mixed for carry-only lines with multiple periods", () => {
    const group = personGroupFromClients([
      {
        kind: "invoice",
        id: "inv-1",
        clientId: "c1",
        clientName: "Northwind",
        periodStart: "2026-03-01T00:00:00.000Z",
        periodEnd: "2026-03-31T23:59:59.999Z",
        isCarry: true,
        amount: 2000,
        sourceAmount: 2000,
        rateCurrency: "USD",
        receivedAmount: 0,
        remainingAmount: 2000,
        wasteAmount: 0,
        durationSeconds: 0,
        number: "INV-1",
      },
      {
        kind: "invoice",
        id: "inv-2",
        clientId: "c1",
        clientName: "Northwind",
        periodStart: "2026-02-01T00:00:00.000Z",
        periodEnd: "2026-02-28T23:59:59.999Z",
        isCarry: true,
        amount: 500,
        sourceAmount: 500,
        rateCurrency: "USD",
        receivedAmount: 0,
        remainingAmount: 500,
        wasteAmount: 0,
        durationSeconds: 0,
        number: "INV-2",
      },
    ]);

    expect(moneyBillGroupPeriodLabel(group)).toBe("Mixed");
  });

  test("returns empty string when lines are empty", () => {
    expect(
      moneyBillGroupPeriodLabel({
        lines: [],
      }),
    ).toBe("");
  });
});

describe("moneyBillTableShowsWaste", () => {
  test("returns false for empty rows", () => {
    expect(moneyBillTableShowsWaste([])).toBe(false);
  });

  test("returns false when all waste amounts are zero", () => {
    expect(moneyBillTableShowsWaste([{ wasteAmount: 0 }, { wasteAmount: 0 }])).toBe(false);
  });

  test("returns true when any waste amount is positive", () => {
    expect(moneyBillTableShowsWaste([{ wasteAmount: 0 }, { wasteAmount: 150 }])).toBe(true);
  });
});

describe("moneyBillTableShowsCarry", () => {
  test("returns false when no group has carry", () => {
    expect(moneyBillTableShowsCarry([{ lines: [{ isCarry: false }] }])).toBe(false);
  });

  test("returns true when any group has a carry line", () => {
    expect(
      moneyBillTableShowsCarry([{ lines: [{ isCarry: false }] }, { lines: [{ isCarry: true }] }]),
    ).toBe(true);
  });
});

describe("moneyBillGroupStatusLabel", () => {
  test("returns the shared status when every line matches", () => {
    expect(
      moneyBillGroupStatusLabel({
        lines: [{ statusLabel: "Outstanding" }, { statusLabel: "Outstanding" }],
      }),
    ).toBe("Outstanding");
  });

  test("returns Mixed when statuses differ", () => {
    expect(
      moneyBillGroupStatusLabel({
        lines: [{ statusLabel: "Outstanding" }, { statusLabel: "Paid" }],
      }),
    ).toBe("Mixed");
  });

  test("returns Ready when lines are empty", () => {
    expect(moneyBillGroupStatusLabel({ lines: [] })).toBe("Ready");
  });
});

describe("moneyBillStatusBadgeVariant", () => {
  test("maps action and settlement states", () => {
    expect(moneyBillStatusBadgeVariant("Paid")).toBe("success");
    expect(moneyBillStatusBadgeVariant("Outstanding")).toBe("warning");
    expect(moneyBillStatusBadgeVariant("Ready")).toBe("default");
    expect(moneyBillStatusBadgeVariant("Partial")).toBe("outline");
    expect(moneyBillStatusBadgeVariant("Mixed")).toBe("outline");
    expect(moneyBillStatusBadgeVariant("Refunded")).toBe("outline");
  });
});

describe("moneyBillGroupSettleLabel", () => {
  test("returns Collect or Pay only when remaining is open", () => {
    expect(moneyBillGroupSettleLabel("client", 1000)).toBe("Collect");
    expect(moneyBillGroupSettleLabel("team", 1000)).toBe("Pay");
    expect(moneyBillGroupSettleLabel("client", 0)).toBeNull();
    expect(moneyBillGroupSettleLabel("team", 0)).toBeNull();
  });
});

describe("moneyBillSalaryPoolSettleLabel", () => {
  test("returns Pay only when remaining is open and the actor can pay", () => {
    expect(moneyBillSalaryPoolSettleLabel(500, true)).toBe("Pay");
    expect(moneyBillSalaryPoolSettleLabel(500, false)).toBeNull();
    expect(moneyBillSalaryPoolSettleLabel(0, true)).toBeNull();
  });
});

describe("moneyBillAdjustmentSettleLabel", () => {
  test("prefers Record payment, then Mark paid, and hides when settled", () => {
    expect(
      moneyBillAdjustmentSettleLabel({
        remainingAmount: 200,
        canRecordPayment: true,
        canMarkPaid: true,
      }),
    ).toBe("Record payment");
    expect(
      moneyBillAdjustmentSettleLabel({
        remainingAmount: 200,
        canRecordPayment: false,
        canMarkPaid: true,
      }),
    ).toBe("Mark paid");
    expect(
      moneyBillAdjustmentSettleLabel({
        remainingAmount: 200,
        canRecordPayment: false,
        canMarkPaid: false,
      }),
    ).toBeNull();
    expect(
      moneyBillAdjustmentSettleLabel({
        remainingAmount: 0,
        canRecordPayment: true,
        canMarkPaid: true,
      }),
    ).toBeNull();
  });
});

describe("moneyBillsSheetCaption", () => {
  test("names the collect job when a client still owes, including prior periods", () => {
    expect(
      moneyBillsSheetCaption({
        kind: "group",
        remainingAmount: 1200,
        carryCount: 2,
        party: "client",
      }),
    ).toBe("Open balance, including prior periods");
  });

  test("names the pay job when a team member still has remaining", () => {
    expect(
      moneyBillsSheetCaption({
        kind: "group",
        remainingAmount: 500,
        carryCount: 0,
        party: "team",
      }),
    ).toBe("Open balance for this period");
  });

  test("names settled when remaining is zero", () => {
    expect(
      moneyBillsSheetCaption({
        kind: "group",
        remainingAmount: 0,
        carryCount: 0,
        party: "client",
      }),
    ).toBe("Settled for this period");
  });

  test("names adjustment and expense jobs", () => {
    expect(
      moneyBillsSheetCaption({
        kind: "adjustment",
        remainingAmount: 100,
        sectionTitle: "Debt",
      }),
    ).toBe("Debt still open");
    expect(
      moneyBillsSheetCaption({
        kind: "salary-pool",
        remainingAmount: 800,
      }),
    ).toBe("Shared salary pool still open");
    expect(
      moneyBillsSheetCaption({
        kind: "expense",
        remainingAmount: 230,
        expenseKind: "subscription",
        expenseStatus: "due",
      }),
    ).toBe("Subscription due this period");
  });
});
