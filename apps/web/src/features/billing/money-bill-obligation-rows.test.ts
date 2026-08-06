import { describe, expect, test } from "bun:test";

import {
  buildMoneyBillPersonGroups,
  filterComposeRowsByClientCategory,
  groupMoneyBillComposeDisplayRows,
} from "./money-bill-obligation-rows";

describe("money-bill-obligation-rows", () => {
  test("groups client current + carry lines under one person", () => {
    const rows = buildMoneyBillPersonGroups({
      clients: [
        {
          kind: "ready",
          id: "ready:client:c1:april",
          clientId: "c1",
          clientName: "Northwind",
          periodStart: "2026-04-01T00:00:00.000Z",
          periodEnd: "2026-04-30T23:59:59.999Z",
          isCarry: false,
          amount: 12_000,
          receivedAmount: 0,
          remainingAmount: 12_000,
          wasteAmount: 0,
          durationSeconds: 40 * 3600,
          number: null,
        },
        {
          kind: "invoice",
          id: "inv-031",
          clientId: "c1",
          clientName: "Northwind",
          periodStart: "2026-03-01T00:00:00.000Z",
          periodEnd: "2026-03-31T23:59:59.999Z",
          isCarry: true,
          amount: 40_000,
          receivedAmount: 21_500,
          remainingAmount: 18_500,
          wasteAmount: 0,
          durationSeconds: 0,
          number: "INV-031",
        },
      ],
      members: [],
      adjustments: [],
      pendingAdjustments: [
        {
          id: "adj-1",
          partyType: "client",
          partyId: "c1",
          kind: "discount",
          amount: 500,
          note: "Goodwill",
          periodStart: null,
          periodEnd: null,
        },
      ],
      statusFilter: null,
      includeClients: true,
      includeMembers: false,
      includeAdjustments: false,
    });

    expect(rows).toHaveLength(1);
    const group = rows[0];
    expect(group?.kind).toBe("person-group");
    if (group?.kind !== "person-group") return;
    expect(group.lines).toHaveLength(2);
    expect(group.lines[1]?.isCarry).toBe(true);
    expect(group.openCents).toBe(30_500);
    expect(group.pendingAdjustmentCents).toBe(-500);
  });

  test("groups compose rows into Clients / Team sections", () => {
    const rows = buildMoneyBillPersonGroups({
      clients: [
        {
          kind: "ready",
          id: "ready:client:c1",
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
      ],
      members: [
        {
          kind: "ready",
          id: "ready:member:u1",
          userId: "u1",
          userName: "Sara",
          userAvatar: null,
          periodStart: "2026-04-01T00:00:00.000Z",
          periodEnd: "2026-04-30T23:59:59.999Z",
          isCarry: false,
          amount: 2000,
          paidAmount: 0,
          remainingAmount: 2000,
          wasteAmount: 0,
          durationSeconds: 0,
        },
      ],
      adjustments: [],
      pendingAdjustments: [],
      statusFilter: null,
      includeClients: true,
      includeMembers: true,
      includeAdjustments: false,
    });

    expect(groupMoneyBillComposeDisplayRows(rows).map((section) => section.id)).toEqual([
      "clients",
      "team",
    ]);
  });

  test("filters client person-groups by external category", () => {
    const rows = buildMoneyBillPersonGroups({
      clients: [
        {
          kind: "ready",
          id: "ready:c1",
          clientId: "c1",
          clientName: "External Co",
          periodStart: "2026-04-01T00:00:00.000Z",
          periodEnd: "2026-04-30T23:59:59.999Z",
          isCarry: false,
          amount: 100,
          receivedAmount: 0,
          remainingAmount: 100,
          wasteAmount: 0,
          durationSeconds: 0,
          number: null,
        },
        {
          kind: "ready",
          id: "ready:c2",
          clientId: "c2",
          clientName: "Internal Co",
          periodStart: "2026-04-01T00:00:00.000Z",
          periodEnd: "2026-04-30T23:59:59.999Z",
          isCarry: false,
          amount: 200,
          receivedAmount: 0,
          remainingAmount: 200,
          wasteAmount: 0,
          durationSeconds: 0,
          number: null,
        },
      ],
      members: [],
      adjustments: [],
      pendingAdjustments: [],
      statusFilter: null,
      includeClients: true,
      includeMembers: false,
      includeAdjustments: false,
    });
    const filtered = filterComposeRowsByClientCategory(
      rows,
      "external",
      new Map([
        ["c1", "external"],
        ["c2", "internal"],
      ]),
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.kind === "person-group" ? filtered[0].clientId : null).toBe("c1");
  });
});
