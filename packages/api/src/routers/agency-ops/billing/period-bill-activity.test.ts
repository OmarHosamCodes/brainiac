import { describe, expect, test } from "bun:test";

import {
  aggregatePeriodClientActivity,
  aggregatePeriodMemberActivity,
  uninvoicedPeriodClients,
} from "./period-bill-activity";

describe("aggregatePeriodClientActivity", () => {
  test("sums seconds per client and sorts by name", () => {
    const items = aggregatePeriodClientActivity([
      { clientId: "c2", clientName: "Beta", durationSeconds: 100 },
      { clientId: "c1", clientName: "Acme", durationSeconds: 50 },
      { clientId: "c1", clientName: "Acme", durationSeconds: 25 },
    ]);
    expect(items).toEqual([
      { clientId: "c1", clientName: "Acme", durationSeconds: 75 },
      { clientId: "c2", clientName: "Beta", durationSeconds: 100 },
    ]);
  });
});

describe("aggregatePeriodMemberActivity", () => {
  test("sums seconds per member and keeps first avatar", () => {
    const items = aggregatePeriodMemberActivity([
      { userId: "u1", userName: "Ada", userAvatar: null, durationSeconds: 3600 },
      { userId: "u1", userName: "Ada", userAvatar: "https://img/a.png", durationSeconds: 1800 },
    ]);
    expect(items).toEqual([
      {
        userId: "u1",
        userName: "Ada",
        userAvatar: "https://img/a.png",
        durationSeconds: 5400,
      },
    ]);
  });
});

describe("uninvoicedPeriodClients", () => {
  test("drops clients that already have an invoice", () => {
    const clients = [
      { clientId: "c1", clientName: "Acme", durationSeconds: 100 },
      { clientId: "c2", clientName: "Beta", durationSeconds: 50 },
    ];
    expect(uninvoicedPeriodClients(clients, ["c1"]).map((c) => c.clientId)).toEqual(["c2"]);
  });
});
