import { describe, expect, test } from "bun:test";

import { buildAgencyMonthHoursArtifact } from "./agency-reports-canvas";

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
