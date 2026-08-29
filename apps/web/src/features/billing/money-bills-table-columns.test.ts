import { describe, expect, test } from "bun:test";

import { buildMoneyBillPersonGroups } from "./money-bill-obligation-rows";
import { formatMoneyBillPeriod } from "./money-bills-rows";
import {
  moneyBillGroupCarryCount,
  moneyBillGroupPeriodLabel,
  moneyBillTableShowsWaste,
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
