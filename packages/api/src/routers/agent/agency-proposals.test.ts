import { describe, expect, test } from "bun:test";

import { buildAgencyActionAfter, loadAgencyActionBefore } from "./agency-proposals";

describe("agency proposal before/after nullability", () => {
  test("create actions use null before (DB columns must allow null)", async () => {
    const creates = [
      { type: "client.create" as const, name: "Acme" },
      { type: "project.create" as const, name: "P", clientId: "c1" },
      { type: "task.create" as const, title: "T", projectId: "p1" },
      { type: "tag.create" as const, name: "tag" },
      {
        type: "time_entry.create" as const,
        projectId: "p1",
        startAt: "2026-08-04T09:00:00.000Z",
        endAt: "2026-08-04T10:00:00.000Z",
      },
    ];

    for (const action of creates) {
      const before = await loadAgencyActionBefore("user", "team", action);
      expect(before).toBeNull();
      expect(buildAgencyActionAfter(before, action)).not.toBeNull();
    }
  });

  test("delete actions use null after", () => {
    const deletes = [
      { type: "time_entry.delete" as const, entryId: "e1" },
      { type: "task.delete" as const, taskId: "t1" },
      { type: "tag.delete" as const, tagId: "g1" },
      { type: "timer.stop" as const },
    ];

    for (const action of deletes) {
      expect(buildAgencyActionAfter({ id: "x" }, action)).toBeNull();
    }
  });
});
