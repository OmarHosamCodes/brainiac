import { describe, expect, test } from "bun:test";

import {
  buildMoneyBillRows,
  groupMoneyBillRows,
  moneyBillInitials,
  moneyBillListInsight,
  moneyBillPartyHref,
  moneyBillRowFromInvoice,
  moneyBillRowFromPayoutLine,
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

describe("moneyBillRowFromPayoutLine", () => {
  test("draft can record payment and mark paid", () => {
    const row = moneyBillRowFromPayoutLine({
      id: "pay_1",
      sectionKey: "salaries",
      sectionTitle: "Salaries",
      userId: "u1",
      userName: "Ada",
      userAvatar: null,
      label: "Salary · Ada",
      status: "draft",
      billStatus: "outstanding",
      amountCents: 5000,
      paidCents: 0,
      remainingCents: 5000,
      currency: "USD",
      durationSeconds: 3600,
      periodStart: "2026-08-01T00:00:00.000Z",
      periodEnd: "2026-08-31T23:59:59.999Z",
    });
    expect(row.kind).toBe("team-payout");
    expect(row.canRecordPayment).toBe(true);
    expect(row.canMarkPaid).toBe(true);
    expect(row.billStatusLabel).toBe("Outstanding");
  });
});

describe("buildMoneyBillRows", () => {
  test("default all includes uninvoiced clients and ready members", () => {
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
      payouts: [],
    });
    expect(rows.map((row) => row.kind)).toEqual(["invoice", "client-activity", "member-activity"]);
    expect(rows[1]?.title).toBe("Beta");
    expect(rows[2]?.title).toBe("Ada");
    expect(rows[2]?.canCreatePayout).toBe(true);
  });

  test("excludes members who already have a payout line", () => {
    const rows = buildMoneyBillRows({
      party: "team",
      statusFilter: null,
      invoices: [],
      clients: [],
      members: [
        { userId: "u1", userName: "Ada", userAvatar: null, durationSeconds: 7200 },
        { userId: "u2", userName: "Bob", userAvatar: null, durationSeconds: 3600 },
      ],
      payouts: [
        {
          id: "pay_1",
          sectionKey: "salaries",
          sectionTitle: "Salaries",
          userId: "u1",
          userName: "Ada",
          userAvatar: null,
          label: "Salary · Ada",
          status: "draft",
          billStatus: "outstanding",
          amountCents: 5000,
          paidCents: 0,
          remainingCents: 5000,
          currency: "USD",
          durationSeconds: 7200,
          periodStart: "2026-08-01T00:00:00.000Z",
          periodEnd: "2026-08-31T23:59:59.999Z",
        },
      ],
    });
    expect(rows.map((row) => row.kind)).toEqual(["team-payout", "member-activity"]);
    expect(rows[1]?.title).toBe("Bob");
  });

  test("paid status filter hides ready members", () => {
    const rows = buildMoneyBillRows({
      party: "team",
      statusFilter: "paid",
      invoices: [],
      clients: [],
      members: [{ userId: "u1", userName: "Ada", userAvatar: null, durationSeconds: 100 }],
      payouts: [
        {
          id: "pay_1",
          sectionKey: "salaries",
          sectionTitle: "Salaries",
          userId: "u2",
          userName: "Bob",
          userAvatar: null,
          label: "Salary · Bob",
          status: "paid",
          billStatus: "paid",
          amountCents: 1000,
          paidCents: 1000,
          remainingCents: 0,
          currency: "USD",
          durationSeconds: 100,
          periodStart: "2026-08-01T00:00:00.000Z",
          periodEnd: "2026-08-31T23:59:59.999Z",
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.kind).toBe("team-payout");
  });
});

describe("groupMoneyBillRows", () => {
  test("orders ready before invoices before ready-payout before team", () => {
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
      payouts: [
        {
          id: "pay_1",
          sectionKey: "salaries",
          sectionTitle: "Salaries",
          userId: "u2",
          userName: "Bob",
          userAvatar: null,
          label: "Salary · Bob",
          status: "draft",
          billStatus: "outstanding",
          amountCents: 2000,
          paidCents: 0,
          remainingCents: 2000,
          currency: "USD",
          durationSeconds: 3600,
          periodStart: "2026-08-01T00:00:00.000Z",
          periodEnd: "2026-08-31T23:59:59.999Z",
        },
      ],
    });
    expect(groupMoneyBillRows(rows).map((section) => section.id)).toEqual([
      "ready",
      "invoices",
      "ready-payout",
      "team",
    ]);
  });
});

describe("moneyBillListInsight", () => {
  test("summarizes unbilled clients and ready payouts", () => {
    const rows = buildMoneyBillRows({
      party: "all",
      statusFilter: null,
      invoices: [],
      clients: [
        { clientId: "c1", clientName: "Acme", durationSeconds: 3600 },
        { clientId: "c2", clientName: "Beta", durationSeconds: 1800 },
      ],
      members: [{ userId: "u1", userName: "Ada", userAvatar: null, durationSeconds: 100 }],
      payouts: [],
    });
    expect(moneyBillListInsight(rows)).toBe(
      "2 clients ready · 01:30 unbilled · 1 member ready to pay",
    );
  });
});

describe("moneyBillInitials", () => {
  test("uses first letters of two words", () => {
    expect(moneyBillInitials("DR El Nazzer")).toBe("DE");
    expect(moneyBillInitials("Consultation")).toBe("CO");
  });
});

describe("moneyBillPartyHref", () => {
  test("clients open Clients segment with client id", () => {
    const row = moneyBillRowFromInvoice({
      id: "inv_1",
      clientId: "cli_1",
      clientName: "Acme",
      number: "INV-0001",
      status: "draft",
      billStatus: "outstanding",
      amountCents: 1000,
      receivedCents: 0,
      remainingCents: 1000,
      currency: "USD",
      periodStart: "2026-08-01T00:00:00.000Z",
      periodEnd: "2026-08-31T23:59:59.999Z",
    });
    expect(moneyBillPartyHref(row)).toBe("/agency?section=clients&client=cli_1");
  });

  test("members open member profile", () => {
    const row = moneyBillRowFromPayoutLine({
      id: "pay_1",
      sectionKey: "salaries",
      sectionTitle: "Salaries",
      userId: "u1",
      userName: "Ada",
      userAvatar: null,
      label: "Salary · Ada",
      status: "draft",
      billStatus: "outstanding",
      amountCents: 5000,
      paidCents: 0,
      remainingCents: 5000,
      currency: "USD",
      durationSeconds: 3600,
      periodStart: "2026-08-01T00:00:00.000Z",
      periodEnd: "2026-08-31T23:59:59.999Z",
    });
    expect(moneyBillPartyHref(row)).toBe("/agency/members/u1");
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
