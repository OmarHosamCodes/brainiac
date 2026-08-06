import { describe, expect, test } from "bun:test";

import {
  formatPayoutRunSectionMeta,
  groupPayoutLinesByCohort,
  moneyPayoutRunStatusLabel,
} from "./money-payout-run";

describe("moneyPayoutRunStatusLabel", () => {
  test("labels statuses", () => {
    expect(moneyPayoutRunStatusLabel("draft")).toBe("Draft");
    expect(moneyPayoutRunStatusLabel("paying")).toBe("Paying");
    expect(moneyPayoutRunStatusLabel("paid")).toBe("Paid");
  });
});

describe("groupPayoutLinesByCohort", () => {
  test("buckets by cohortKey with Ungrouped fallback", () => {
    const groups = groupPayoutLinesByCohort([
      {
        id: "1",
        sectionKey: "charity",
        label: "A",
        userName: "A",
        cohortKey: "core-ft",
        amount: 100,
        paidAmount: 0,
        remainingAmount: 100,
        currency: "USD",
        status: "draft",
        canRecordPayment: true,
        canMarkPaid: true,
      },
      {
        id: "2",
        sectionKey: "charity",
        label: "B",
        userName: "B",
        cohortKey: null,
        amount: 50,
        paidAmount: 0,
        remainingAmount: 50,
        currency: "USD",
        status: "draft",
        canRecordPayment: true,
        canMarkPaid: true,
      },
    ]);
    expect(groups.map((g) => g.title)).toEqual(["core-ft", "Ungrouped"]);
    expect(groups[0]?.lines).toHaveLength(1);
    expect(groups[1]?.lines[0]?.id).toBe("2");
  });
});

describe("formatPayoutRunSectionMeta", () => {
  test("empty section", () => {
    expect(
      formatPayoutRunSectionMeta(
        {
          id: "s1",
          key: "salaries",
          title: "Salaries",
          sortOrder: 0,
          lineCount: 0,
          dueAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
        },
        "USD",
      ),
    ).toBe("No lines");
  });
});
