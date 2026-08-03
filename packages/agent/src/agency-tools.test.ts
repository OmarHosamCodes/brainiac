import { describe, expect, test } from "bun:test";

import {
  agencyDateRangeInputSchema,
  flattenAgencyDateRangeInput,
  takeTopNWithTruncated,
} from "./agency-tools";

describe("agencyDateRangeInputSchema", () => {
  test("accepts a two-key range", () => {
    expect(
      agencyDateRangeInputSchema.parse({
        from: "2026-08-01",
        to: "2026-08-04",
      }),
    ).toEqual({
      from: "2026-08-01",
      to: "2026-08-04",
    });
  });

  test("strips empty filter ids", () => {
    expect(
      agencyDateRangeInputSchema.parse({
        from: "2026-08-01",
        to: "2026-08-04",
        filter: {
          memberUserId: "",
          projectId: "  ",
          clientId: "client_1",
        },
      }),
    ).toEqual({
      from: "2026-08-01",
      to: "2026-08-04",
      filter: {
        clientId: "client_1",
      },
    });
  });
});

describe("takeTopNWithTruncated", () => {
  test("caps items and reports truncation", () => {
    expect(takeTopNWithTruncated([1, 2, 3, 4], 2)).toEqual({
      items: [1, 2],
      truncated: true,
      total: 4,
    });
    expect(takeTopNWithTruncated([1, 2], 5)).toEqual({
      items: [1, 2],
      truncated: false,
      total: 2,
    });
  });
});

describe("flattenAgencyDateRangeInput", () => {
  test("keeps a two-key range with no filter", () => {
    expect(
      flattenAgencyDateRangeInput({
        from: "2026-08-01",
        to: "2026-08-04",
      }),
    ).toEqual({
      from: "2026-08-01",
      to: "2026-08-04",
      memberUserId: undefined,
      projectId: undefined,
      clientId: undefined,
    });
  });

  test("flattens nested filter ids", () => {
    expect(
      flattenAgencyDateRangeInput({
        from: "2026-08-01",
        to: "2026-08-04",
        filter: {
          memberUserId: "user_1",
          projectId: "proj_1",
          clientId: "client_1",
        },
      }),
    ).toEqual({
      from: "2026-08-01",
      to: "2026-08-04",
      memberUserId: "user_1",
      projectId: "proj_1",
      clientId: "client_1",
    });
  });
});
