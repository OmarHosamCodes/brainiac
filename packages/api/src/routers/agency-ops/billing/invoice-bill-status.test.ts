import { describe, expect, test } from "bun:test";

import {
  invoiceBillStatus,
  invoiceRemainingAmount,
  invoiceStatusAfterReceived,
  invoiceStatusesForBillFilter,
} from "./invoice-bill-status";

describe("invoiceBillStatus", () => {
  test("maps draft and sent to outstanding", () => {
    expect(invoiceBillStatus("draft")).toBe("outstanding");
    expect(invoiceBillStatus("sent")).toBe("outstanding");
  });

  test("maps partial, paid, refunded 1:1", () => {
    expect(invoiceBillStatus("partial")).toBe("partial");
    expect(invoiceBillStatus("paid")).toBe("paid");
    expect(invoiceBillStatus("refunded")).toBe("refunded");
  });
});

describe("invoiceRemainingAmount", () => {
  test("clamps at zero", () => {
    expect(invoiceRemainingAmount(1000, 400)).toBe(600);
    expect(invoiceRemainingAmount(1000, 1000)).toBe(0);
    expect(invoiceRemainingAmount(1000, 1500)).toBe(0);
  });
});

describe("invoiceStatusesForBillFilter", () => {
  test("outstanding includes draft and sent", () => {
    expect(invoiceStatusesForBillFilter("outstanding")).toEqual(["draft", "sent"]);
  });
});

describe("invoiceStatusAfterReceived", () => {
  test("partial when some cash received", () => {
    expect(invoiceStatusAfterReceived(1000, 250, "sent")).toBe("partial");
  });

  test("paid when fully received", () => {
    expect(invoiceStatusAfterReceived(1000, 1000, "partial")).toBe("paid");
  });

  test("refunded stays refunded", () => {
    expect(invoiceStatusAfterReceived(1000, 500, "refunded")).toBe("refunded");
  });
});
