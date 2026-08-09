import { describe, expect, test } from "bun:test";

import { agencyEntityIdFromPath } from "./agency-segment-boot";

describe("agencyEntityIdFromPath", () => {
  test("reads nested entity ids and ignores list paths", () => {
    expect(agencyEntityIdFromPath("/agency/clients/cli_1", "clients")).toBe("cli_1");
    expect(agencyEntityIdFromPath("/agency/projects/prj%2F1", "projects")).toBe("prj/1");
    expect(agencyEntityIdFromPath("/agency/reports/rep_1/", "reports")).toBe("rep_1");
    expect(agencyEntityIdFromPath("/agency/clients", "clients")).toBeNull();
    expect(agencyEntityIdFromPath("/agency/clients/cli_1/extra", "clients")).toBeNull();
  });
});
