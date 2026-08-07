import { describe, expect, test } from "bun:test";

import { paginateItems } from "./list-pagination";

describe("paginateItems", () => {
  test("preserves the full list when page is omitted", () => {
    expect(paginateItems([1, 2, 3], {})).toEqual({
      items: [1, 2, 3],
      page: 1,
      pageSize: 3,
      total: 3,
    });
  });

  test("uses the default page size only when pagination is requested", () => {
    const values = Array.from({ length: 60 }, (_, index) => index + 1);
    expect(paginateItems(values, { page: 2 })).toEqual({
      items: values.slice(50),
      page: 2,
      pageSize: 50,
      total: 60,
    });
  });
});
