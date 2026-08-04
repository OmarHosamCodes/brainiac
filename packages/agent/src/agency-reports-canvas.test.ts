import { describe, expect, test } from "bun:test";

import {
  agencyQuestionRetryNote,
  agencyToolRetryNote,
  agencyUiPresentRetryNote,
  buildAgencyMonthHoursArtifact,
  shouldBootstrapAgencyMonthReports,
} from "./agency-reports-canvas";

describe("buildAgencyMonthHoursArtifact", () => {
  test("builds a schema canvas with composition and tables", () => {
    const artifact = buildAgencyMonthHoursArtifact(
      {
        totalSeconds: 10_800,
        composition: {
          paidSeconds: 7_200,
          wasteSeconds: 1_800,
          internalSeconds: 1_800,
          totalSeconds: 10_800,
        },
        byClient: [],
        byProject: [
          {
            projectId: "p1",
            projectName: "Alpha",
            clientName: "Acme",
            seconds: 7_200,
            wasteSeconds: 1_800,
            nonWasteSeconds: 5_400,
          },
        ],
        byMember: [
          {
            userId: "u1",
            userName: "Omar",
            seconds: 10_800,
            wasteSeconds: 1_800,
            nonWasteSeconds: 9_000,
          },
        ],
      },
      "2026-08-01",
      "2026-08-04",
    );

    expect(artifact.kind).toBe("schema");
    expect(artifact.title).toContain("2026-08-01");
    if (artifact.kind !== "schema") throw new Error("expected schema artifact");
    expect(artifact.schema.root.type).toBe("stack");
  });
});

describe("agency month-reports bootstrap gates", () => {
  test("bootstraps Ask only", () => {
    expect(shouldBootstrapAgencyMonthReports("ask")).toBe(true);
    expect(shouldBootstrapAgencyMonthReports("plan")).toBe(false);
    expect(shouldBootstrapAgencyMonthReports("agent")).toBe(false);
  });

  test("retry notes prefer ui_present and steer Plan/Agent away from hours canvas", () => {
    expect(agencyToolRetryNote("ask")).toContain("ui_present a schema canvas");
    expect(agencyToolRetryNote("plan")).toContain("draft_agency_plan");
    expect(agencyToolRetryNote("plan")).toContain("ui_present a schema plan overview");
    expect(agencyToolRetryNote("plan")).toContain("dump a hours canvas");
    expect(agencyToolRetryNote("agent")).toContain("propose_agency_action");
    expect(agencyToolRetryNote("agent")).toContain("ui_present before/after");
  });

  test("ui_present retry notes require a canvas after tools ran", () => {
    expect(agencyUiPresentRetryNote("ask")).toContain("did not call ui_present");
    expect(agencyUiPresentRetryNote("plan")).toContain("schema overview of the plan");
    expect(agencyUiPresentRetryNote("agent")).toContain("before/after schema canvas");
  });

  test("question retry note is Plan-only", () => {
    expect(agencyQuestionRetryNote("ask")).toBeNull();
    expect(agencyQuestionRetryNote("agent")).toBeNull();
    expect(agencyQuestionRetryNote("plan")).toContain("ask_agency_question");
  });
});
