import { describe, expect, test } from "bun:test";

import { buildMarketplaceQueryInput } from "./marketplace-query-contracts";

describe("buildMarketplaceQueryInput", () => {
  test("omits the cursor for the first page", () => {
    expect(
      buildMarketplaceQueryInput({ cursor: null, limit: 20, kind: "all", search: undefined }),
    ).toEqual({ cursor: undefined, limit: 20, kind: "all", search: undefined });
  });

  test("preserves pagination, type, and search filters", () => {
    expect(
      buildMarketplaceQueryInput({ cursor: "next", limit: 20, kind: "block", search: " roadmap " }),
    ).toEqual({ cursor: "next", limit: 20, kind: "block", search: " roadmap " });
  });
});
