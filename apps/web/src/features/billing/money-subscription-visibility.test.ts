import { describe, expect, test } from "bun:test";

import { filterSubscriptionCycles, subscriptionCountLabel } from "./money-subscription-visibility";

const dueCycle = { id: "due", state: "due" as const };
const paidCycle = { id: "paid", state: "paid" as const };
const cycles = [dueCycle, paidCycle];

describe("filterSubscriptionCycles", () => {
  test("supports due, paid, both, and neither", () => {
    expect(filterSubscriptionCycles(cycles, { due: true, paid: false })).toEqual([dueCycle]);
    expect(filterSubscriptionCycles(cycles, { due: false, paid: true })).toEqual([paidCycle]);
    expect(filterSubscriptionCycles(cycles, { due: true, paid: true })).toEqual(cycles);
    expect(filterSubscriptionCycles(cycles, { due: false, paid: false })).toEqual([]);
  });
});

describe("subscriptionCountLabel", () => {
  test("describes the active visibility", () => {
    expect(subscriptionCountLabel(2, { due: true, paid: false })).toBe("2 due");
    expect(subscriptionCountLabel(1, { due: false, paid: true })).toBe("1 paid");
    expect(subscriptionCountLabel(3, { due: true, paid: true })).toBe("3 shown");
    expect(subscriptionCountLabel(0, { due: false, paid: false })).toBe("0 shown");
  });
});
