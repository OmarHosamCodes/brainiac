import { describe, expect, test } from "bun:test";

import {
  agencyBootLabel,
  agencySegmentBootKey,
  isAgencySegmentBootReady,
} from "./use-agency-boot-gate";

describe("agencySegmentBootKey", () => {
  test("changes when the path changes so the loader holds across nested pages", () => {
    expect(
      agencySegmentBootKey({
        skipSegmentBoot: false,
        teamId: "tm_1",
        segment: "clients",
        pathname: "/agency/clients",
      }),
    ).not.toBe(
      agencySegmentBootKey({
        skipSegmentBoot: false,
        teamId: "tm_1",
        segment: "clients",
        pathname: "/agency/clients/cli_1",
      }),
    );
  });

  test("skip is stable and ready only when keys match", () => {
    expect(
      agencySegmentBootKey({
        skipSegmentBoot: true,
        teamId: "",
        segment: "work",
        pathname: "/agency",
      }),
    ).toBe("skip");
    expect(isAgencySegmentBootReady(null, "tm_1:clients:/agency/clients")).toBe(false);
    expect(
      isAgencySegmentBootReady("tm_1:clients:/agency/clients", "tm_1:clients:/agency/clients"),
    ).toBe(true);
  });
});

describe("agencyBootLabel", () => {
  test("names the surface and nested entity", () => {
    expect(agencyBootLabel("work", "/agency")).toBe("Opening Tracker");
    expect(agencyBootLabel("clients", "/agency/clients")).toBe("Opening Clients");
    expect(agencyBootLabel("clients", "/agency/clients/cli_1")).toBe("Opening client");
    expect(agencyBootLabel("projects", "/agency/projects/prj_1")).toBe("Opening project");
    expect(agencyBootLabel("reports", "/agency/reports/rep_1")).toBe("Opening report");
    expect(agencyBootLabel("management", "/agency/management/people")).toBe("Opening Management");
  });
});
