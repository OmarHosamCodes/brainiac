import { describe, expect, test } from "bun:test";

import { agencyActionLabel, agencyActionSchema, agencyDraftPlanSchema } from "./agency-actions";

describe("agencyActionSchema", () => {
  test("accepts time entry create", () => {
    const action = agencyActionSchema.parse({
      type: "time_entry.create",
      projectId: "proj_1",
      startAt: "2026-08-01T09:00:00.000Z",
      endAt: "2026-08-01T10:00:00.000Z",
      description: "Work",
    });
    expect(agencyActionLabel(action)).toBe("Create time entry");
  });

  test("rejects unknown action type", () => {
    expect(() =>
      agencyActionSchema.parse({
        type: "invoice.create",
        name: "Nope",
      }),
    ).toThrow();
  });
});

describe("agencyDraftPlanSchema", () => {
  test("requires at least one step", () => {
    expect(() =>
      agencyDraftPlanSchema.parse({
        planId: "aplan-1",
        title: "Empty",
        summary: "No steps",
        steps: [],
      }),
    ).toThrow();
  });
});
