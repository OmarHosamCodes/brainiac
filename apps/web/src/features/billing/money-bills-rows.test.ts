import { describe, expect, test } from "bun:test";

import {
  buildMoneyBillRows,
  groupMoneyBillRows,
  moneyBillInitials,
  moneyBillListInsight,
  moneyBillRowFromInvoice,
  moneyBillsCreateFormValid,
  moneyBillsPartyShowsClients,
  moneyBillsPartyShowsMembers,
  moneyBillsPaymentCanSubmit,
  parseMoneyBillPaymentCents,
} from "./money-bills-rows";

describe("moneyBillsPartyShowsClients", () => {
  test("all and client show invoices", () => {
    expect(moneyBillsPartyShowsClients("all")).toBe(true);
    expect(moneyBillsPartyShowsClients("client")).toBe(true);
    expect(moneyBillsPartyShowsClients("team")).toBe(false);
    expect(moneyBillsPartyShowsClients("adjustments")).toBe(false);
  });
});

describe("moneyBillsPartyShowsMembers", () => {
  test("all and team show members", () => {
    expect(moneyBillsPartyShowsMembers("all")).toBe(true);
    expect(moneyBillsPartyShowsMembers("team")).toBe(true);
    expect(moneyBillsPartyShowsMembers("client")).toBe(false);
  });
});

describe("moneyBillRowFromInvoice", () => {
  test("marks draft sendable", () => {
    const row = moneyBillRowFromInvoice({
      id: "inv_1",
      clientId: "cli_1",
      clientName: "Acme",
      number: "INV-0001",
      status: "draft",
      billStatus: "outstanding",
      amountCents: 10_000,
      receivedCents: 0,
      remainingCents: 10_000,
      currency: "USD",
      periodStart: "2026-08-01T00:00:00.000Z",
      periodEnd: "2026-08-31T23:59:59.999Z",
    });
    expect(row.canSend).toBe(true);
    expect(row.canRecordPayment).toBe(false);
    expect(row.billStatusLabel).toBe("Outstanding");
  });
});

describe("buildMoneyBillRows", () => {
  test("default all includes uninvoiced clients and members", () => {
    const rows = buildMoneyBillRows({
      party: "all",
      statusFilter: null,
      invoices: [
        {
          id: "inv_1",
          clientId: "c1",
          clientName: "Acme",
          number: "INV-0001",
          status: "sent",
          billStatus: "outstanding",
          amountCents: 1000,
          receivedCents: 0,
          remainingCents: 1000,
          currency: "USD",
          periodStart: "2026-08-01T00:00:00.000Z",
          periodEnd: "2026-08-31T23:59:59.999Z",
        },
      ],
      clients: [
        { clientId: "c1", clientName: "Acme", durationSeconds: 3600 },
        { clientId: "c2", clientName: "Beta", durationSeconds: 1800 },
      ],
      members: [{ userId: "u1", userName: "Ada", userAvatar: null, durationSeconds: 7200 }],
    });
    expect(rows.map((row) => row.kind)).toEqual(["invoice", "client-activity", "member-activity"]);
    expect(rows[1]?.title).toBe("Beta");
    expect(rows[2]?.title).toBe("Ada");
  });

  test("team party shows only members", () => {
    const rows = buildMoneyBillRows({
      party: "team",
      statusFilter: null,
      invoices: [],
      clients: [{ clientId: "c1", clientName: "Acme", durationSeconds: 100 }],
      members: [
        { userId: "u1", userName: "Ada", userAvatar: "https://img/a.png", durationSeconds: 100 },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe("member-activity");
    if (rows[0]?.kind === "member-activity") {
      expect(rows[0].userAvatar).toBe("https://img/a.png");
    }
  });
});

describe("groupMoneyBillRows", () => {
  test("orders ready before invoices before team", () => {
    const rows = buildMoneyBillRows({
      party: "all",
      statusFilter: null,
      invoices: [
        {
          id: "inv_1",
          clientId: "c1",
          clientName: "Acme",
          number: "INV-0001",
          status: "sent",
          billStatus: "outstanding",
          amountCents: 1000,
          receivedCents: 0,
          remainingCents: 1000,
          currency: "USD",
          periodStart: "2026-08-01T00:00:00.000Z",
          periodEnd: "2026-08-31T23:59:59.999Z",
        },
      ],
      clients: [{ clientId: "c2", clientName: "Beta", durationSeconds: 1800 }],
      members: [{ userId: "u1", userName: "Ada", userAvatar: null, durationSeconds: 7200 }],
    });
    expect(groupMoneyBillRows(rows).map((section) => section.id)).toEqual([
      "ready",
      "invoices",
      "team",
    ]);
  });
});

describe("moneyBillListInsight", () => {
  test("summarizes unbilled clients", () => {
    const rows = buildMoneyBillRows({
      party: "client",
      statusFilter: null,
      invoices: [],
      clients: [
        { clientId: "c1", clientName: "Acme", durationSeconds: 3600 },
        { clientId: "c2", clientName: "Beta", durationSeconds: 1800 },
      ],
      members: [],
    });
    expect(moneyBillListInsight(rows)).toBe("2 clients ready · 01:30 unbilled");
  });
});

describe("moneyBillInitials", () => {
  test("uses first letters of two words", () => {
    expect(moneyBillInitials("DR El Nazzer")).toBe("DE");
    expect(moneyBillInitials("Consultation")).toBe("CO");
  });
});

describe("payment parse", () => {
  test("accepts major units within remaining", () => {
    expect(parseMoneyBillPaymentCents("25", 10_000)).toBe(2500);
    expect(moneyBillsPaymentCanSubmit("25", 10_000)).toBe(true);
    expect(moneyBillsPaymentCanSubmit("200", 10_000)).toBe(false);
  });
});

describe("moneyBillsCreateFormValid", () => {
  test("requires client and ordered dates", () => {
    expect(moneyBillsCreateFormValid("c1", "2026-08-01", "2026-08-31")).toBe(true);
    expect(moneyBillsCreateFormValid("", "2026-08-01", "2026-08-31")).toBe(false);
    expect(moneyBillsCreateFormValid("c1", "2026-08-31", "2026-08-01")).toBe(false);
  });
});
