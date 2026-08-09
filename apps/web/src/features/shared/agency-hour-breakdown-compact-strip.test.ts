import { describe, expect, test } from "bun:test";

import { compactHourCompositionItems } from "./agency-hour-breakdown-compact-strip";

describe("compactHourCompositionItems", () => {
  test("omits empty paid waste and internal buckets", () => {
    expect(
      compactHourCompositionItems({
        totalSeconds: 3600,
        externalSeconds: 3600,
        internalSeconds: 0,
        internalBillableSeconds: 0,
        paidSeconds: 3600,
      }).map((item) => item.id),
    ).toEqual(["paid"]);

    expect(
      compactHourCompositionItems({
        totalSeconds: 0,
        externalSeconds: 0,
        internalSeconds: 0,
        internalBillableSeconds: 0,
        paidSeconds: 0,
      }),
    ).toEqual([]);
  });
});
