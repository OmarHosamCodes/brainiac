import { describe, expect, test } from "bun:test";

import { parameterizeTransactionName } from "./sentry-transaction-name";

describe("parameterizeTransactionName", () => {
  test("rewrites known agency and canvas id segments", () => {
    expect(parameterizeTransactionName("/agency/members/usr_abc")).toBe("/agency/members/:userId");
    expect(parameterizeTransactionName("/agency/projects/proj_1/tasks")).toBe(
      "/agency/projects/:projectId/tasks",
    );
    expect(parameterizeTransactionName("/node/n1")).toBe("/node/:id");
  });

  test("collapses UUID leftover ids without touching static routes", () => {
    expect(parameterizeTransactionName("/canvas")).toBe("/canvas");
    expect(parameterizeTransactionName("/orphan/550e8400-e29b-41d4-a716-446655440000")).toBe(
      "/orphan/:id",
    );
  });
});
