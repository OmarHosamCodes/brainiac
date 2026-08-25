import { describe, expect, it } from "bun:test";

import {
  buildExpenseStripItems,
  expenseStripAmountLabel,
  expenseStripEmptyCopy,
  expenseStripFilterFromSearch,
  expenseStripFilterVisibility,
  expenseStripInsight,
  expenseStripItemMatchesSearch,
  expenseStripMeta,
  filterExpenseStripItems,
} from "./money-expenses-strip";

const sources = {
  recent: {
    count: 2,
    items: [
      {
        id: "one-1",
        expenseId: "one-1",
        name: "Supplies",
        kind: "one_time" as const,
        statusLabel: "Due",
        remainingAmount: 23000,
        remainingLabel: "EGP 230",
        amountLabel: "EGP 230",
        canRecordPayment: true,
        note: null,
      },
      {
        id: "one-paid",
        expenseId: "one-paid",
        name: "Travel",
        kind: "one_time" as const,
        statusLabel: "Paid",
        remainingAmount: 0,
        remainingLabel: "EGP 0",
        amountLabel: "EGP 500",
        canRecordPayment: false,
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
        remainingLabel: "EGP 3,200",
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
        remainingLabel: "EGP 3,200",
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
        remainingLabel: "EGP 0",
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
    expect(items.map((item) => item.id)).toEqual(["one-1", "one-paid", "sub-due", "sub-paid"]);
  });

  it("shows paid one-time expenses and subscriptions on paid filter", () => {
    const items = buildExpenseStripItems("paid", sources);
    expect(items.map((item) => item.id)).toEqual(["one-paid", "sub-paid"]);
  });

  it("includes one-time expenses in the due filter", () => {
    expect(buildExpenseStripItems("due", sources).map((item) => item.id)).toEqual([
      "one-1",
      "sub-due",
    ]);
  });
});

describe("expenseStripFilterFromSearch", () => {
  it("accepts known values and falls back to all", () => {
    expect(expenseStripFilterFromSearch("due")).toBe("due");
    expect(expenseStripFilterFromSearch("unknown")).toBe("all");
  });
});

describe("expenseStripEmptyCopy", () => {
  it("returns paid empty copy when paid filter has no rows", () => {
    expect(expenseStripEmptyCopy("paid", sources, 0)?.title).toBe("No paid expenses");
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
    expect(expenseStripEmptyCopy("all", sources, 0, "missing")?.title).toBe("No matching expenses");
  });
});

describe("expenseStripInsight", () => {
  it("summarizes due and paid counts", () => {
    expect(expenseStripInsight(sources)).toBe("2 due · 2 paid");
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
        remainingLabel: "EGP 1",
        amountLabel: "EGP 100",
        canRecordPayment: true,
        note: null,
      }),
    ).toBe("Monthly · Next 15 Aug 2026");
  });
});

describe("expenseStripAmountLabel", () => {
  it("shows the remaining balance for payable rows", () => {
    expect(
      expenseStripAmountLabel({
        ...sources.recent.items[0]!,
        amountLabel: "EGP 500",
        remainingLabel: "EGP 230",
      }),
    ).toBe("EGP 230");
  });

  it("shows the recorded amount for settled rows", () => {
    expect(expenseStripAmountLabel(sources.allSubscriptions.items[1]!)).toBe("EGP 500");
  });
});
