import { describe, expect, it } from "bun:test";

import {
  buildExpenseStripItems,
  expenseStripEmptyCopy,
  expenseStripFilterVisibility,
  expenseStripInsight,
  expenseStripItemMatchesSearch,
  expenseStripMeta,
  filterExpenseStripItems,
} from "./money-expenses-strip";

const sources = {
  recent: {
    count: 1,
    items: [
      {
        id: "one-1",
        expenseId: "one-1",
        name: "Supplies",
        kind: "one_time" as const,
        statusLabel: "Due",
        remainingAmount: 23000,
        amountLabel: "EGP 230",
        canRecordPayment: true,
        note: null,
      },
    ],
  },
  upcoming: {
    count: 1,
    emptyTitle: "Nothing due soon",
    emptyBody: "Change visibility.",
    items: [
      {
        id: "sub-due",
        expenseId: "sub-1",
        name: "Notion",
        kind: "subscription" as const,
        statusLabel: "Due",
        remainingAmount: 320000,
        amountLabel: "EGP 3,200",
        canRecordPayment: true,
        note: null,
      },
    ],
    visibility: {
      onDueChange: () => {},
      onPaidChange: () => {},
    },
  },
  allSubscriptions: {
    items: [
      {
        id: "sub-due",
        expenseId: "sub-1",
        name: "Notion",
        kind: "subscription" as const,
        statusLabel: "Due",
        remainingAmount: 320000,
        amountLabel: "EGP 3,200",
        canRecordPayment: true,
        note: null,
      },
      {
        id: "sub-paid",
        expenseId: "sub-2",
        name: "Figma",
        kind: "subscription" as const,
        statusLabel: "Paid",
        remainingAmount: 0,
        amountLabel: "EGP 500",
        canRecordPayment: false,
        note: null,
      },
    ],
  },
};

describe("buildExpenseStripItems", () => {
  it("sorts one-time before subscriptions on all", () => {
    const items = buildExpenseStripItems("all", sources);
    expect(items.map((item) => item.id)).toEqual(["one-1", "sub-due", "sub-paid"]);
  });

  it("shows paid subscriptions only on paid filter", () => {
    const items = buildExpenseStripItems("paid", sources);
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("sub-paid");
  });
});

describe("expenseStripEmptyCopy", () => {
  it("returns paid empty copy when paid filter has no rows", () => {
    expect(expenseStripEmptyCopy("paid", sources, 0)?.title).toBe("No paid subscriptions");
  });
});

describe("expenseStripFilterVisibility", () => {
  it("maps all filter to due and paid visibility", () => {
    expect(expenseStripFilterVisibility("all")).toEqual({ due: true, paid: true });
  });
});

describe("expenseStripItemMatchesSearch", () => {
  it("matches name, meta, note, and amount label", () => {
    const item = sources.recent.items[0]!;
    expect(expenseStripItemMatchesSearch(item, "supplies")).toBe(true);
    expect(expenseStripItemMatchesSearch(item, "notion")).toBe(false);
    expect(expenseStripItemMatchesSearch(sources.allSubscriptions.items[1]!, "figma")).toBe(true);
  });
});

describe("filterExpenseStripItems", () => {
  it("returns all items when search is empty", () => {
    const items = buildExpenseStripItems("all", sources);
    expect(filterExpenseStripItems(items, "")).toHaveLength(items.length);
  });

  it("filters strip items by search term", () => {
    const items = buildExpenseStripItems("all", sources);
    expect(filterExpenseStripItems(items, "figma").map((item) => item.id)).toEqual(["sub-paid"]);
  });
});

describe("expenseStripEmptyCopy", () => {
  it("returns search empty copy when filtered list is empty", () => {
    expect(expenseStripEmptyCopy("all", sources, 0, "missing")?.title).toBe(
      "No matching expenses",
    );
  });
});

describe("expenseStripInsight", () => {
  it("summarizes due and paid counts", () => {
    expect(expenseStripInsight(sources)).toBe("2 due · 1 paid");
  });
});

describe("expenseStripMeta", () => {
  it("prefers row meta when present", () => {
    expect(
      expenseStripMeta({
        id: "sub-1",
        expenseId: "sub-1",
        name: "Notion",
        kind: "subscription",
        meta: "Monthly · Next 15 Aug 2026",
        statusLabel: "Due",
        remainingAmount: 100,
        amountLabel: "EGP 100",
        canRecordPayment: true,
        note: null,
      }),
    ).toBe("Monthly · Next 15 Aug 2026");
  });
});
