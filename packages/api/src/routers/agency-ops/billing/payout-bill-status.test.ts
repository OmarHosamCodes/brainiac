import { describe, expect, test } from "bun:test";

import {
  payoutBillStatus,
  payoutLineStatusAfterPaid,
  payoutRemainingCents,
  payoutRunStatusFromLines,
  payoutStatusesForBillFilter,
} from "./payout-bill-status";

describe("payoutBillStatus", () => {
  test("maps draft to outstanding", () => {
    expect(payoutBillStatus("draft")).toBe("outstanding");
  });

  test("maps partial and paid 1:1", () => {
    expect(payoutBillStatus("partial")).toBe("partial");
    expect(payoutBillStatus("paid")).toBe("paid");
  });
});

describe("payoutRemainingCents", () => {
  test("clamps at zero", () => {
    expect(payoutRemainingCents(1000, 400)).toBe(600);
    expect(payoutRemainingCents(1000, 1000)).toBe(0);
    expect(payoutRemainingCents(1000, 1500)).toBe(0);
  });
});

describe("payoutStatusesForBillFilter", () => {
  test("outstanding is draft only", () => {
    expect(payoutStatusesForBillFilter("outstanding")).toEqual(["draft"]);
  });
});

describe("payoutLineStatusAfterPaid", () => {
  test("draft when nothing paid", () => {
    expect(payoutLineStatusAfterPaid(1000, 0)).toBe("draft");
  });

  test("partial when some paid", () => {
    expect(payoutLineStatusAfterPaid(1000, 250)).toBe("partial");
  });

  test("paid when fully paid", () => {
    expect(payoutLineStatusAfterPaid(1000, 1000)).toBe("paid");
  });
});

describe("payoutRunStatusFromLines", () => {
  test("draft when empty or all draft", () => {
    expect(payoutRunStatusFromLines([])).toBe("draft");
    expect(payoutRunStatusFromLines([{ status: "draft" }])).toBe("draft");
  });

  test("paying when any partial or mixed paid", () => {
    expect(payoutRunStatusFromLines([{ status: "partial" }])).toBe("paying");
    expect(payoutRunStatusFromLines([{ status: "draft" }, { status: "paid" }])).toBe("paying");
  });

  test("paid when every line paid", () => {
    expect(payoutRunStatusFromLines([{ status: "paid" }, { status: "paid" }])).toBe("paid");
  });
});
