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

  test("parses money.export_client", () => {
    const action = agencyActionSchema.parse({
      type: "money.export_client",
      clientId: "client-1",
      periodStart: "2026-08-01T00:00:00.000Z",
      periodEnd: "2026-08-31T23:59:59.000Z",
      mode: "combine",
    });
    expect(agencyActionLabel(action)).toBe("Export client bill");
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
