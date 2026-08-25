import { describe, expect, test } from "bun:test";

import {
  buildMoneyPayoutRunSections,
  deriveMoneyPayoutRunStatus,
} from "./build-money-payout-run-view-model";

describe("buildMoneyPayoutRunSections", () => {
  test("aggregates lines by section", () => {
    const sections = buildMoneyPayoutRunSections([
      {
        id: "1",
        sectionKey: "salaries",
        sectionTitle: "Salaries",
        userName: "Alex",
        label: "Salary",
        cohortKey: null,
        amount: 100_000,
        paidAmount: 40_000,
        remainingAmount: 60_000,
        currency: "EGP",
        status: "partial",
      },
      {
        id: "2",
        sectionKey: "charity",
        sectionTitle: "Charity",
        userName: "Team",
        label: "Charity",
        cohortKey: null,
        amount: 2_000,
        paidAmount: 0,
        remainingAmount: 2_000,
        currency: "EGP",
        status: "draft",
      },
    ]);

    expect(sections).toHaveLength(2);
    expect(sections[0]?.key).toBe("salaries");
    expect(sections[0]?.dueAmount).toBe(100_000);
    expect(sections[1]?.key).toBe("charity");
  });
});

describe("deriveMoneyPayoutRunStatus", () => {
  test("returns paid when nothing remains", () => {
    expect(
      deriveMoneyPayoutRunStatus([
        {
          id: "salaries",
          key: "salaries",
          title: "Salaries",
          sortOrder: 0,
          lineCount: 1,
          dueAmount: 100,
          paidAmount: 100,
          remainingAmount: 0,
        },
      ]),
    ).toBe("paid");
  });
});
