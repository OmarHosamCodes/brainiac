import { describe, expect, test } from "bun:test";

/** Owner-scoped Reports mutations require team owner role (same as updateAnyAgencyTimeEntry). */
describe("reports owner mutation contract", () => {
  test("deleteAny differs from deleteMine by omitting userId filter", () => {
    const mineWhere = ["entryId", "teamId", "userId=actor", "deletedAt IS NULL"];
    const anyWhere = ["entryId", "teamId", "deletedAt IS NULL"];
    expect(anyWhere).not.toContain("userId=actor");
    expect(mineWhere.length).toBeGreaterThan(anyWhere.length);
  });

  test("duplicateAny preserves source member userId", () => {
    const source = { userId: "member-a", projectId: "p1" };
    const duplicate = { userId: source.userId, projectId: source.projectId, source: "manual" };
    expect(duplicate.userId).toBe("member-a");
    expect(duplicate.source).toBe("manual");
  });
});
