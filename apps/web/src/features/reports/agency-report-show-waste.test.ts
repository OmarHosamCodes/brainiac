import { describe, expect, test } from "bun:test";

import {
  DEFAULT_AGENCY_REPORT_SHOW_WASTE,
  parseShowWasteParam,
  serializeShowWasteParam,
} from "@/features/reports/agency-report-show-waste";

describe("show waste param", () => {
  test("defaults to all off", () => {
    expect(parseShowWasteParam(null)).toEqual(DEFAULT_AGENCY_REPORT_SHOW_WASTE);
    expect(parseShowWasteParam("")).toEqual(DEFAULT_AGENCY_REPORT_SHOW_WASTE);
  });

  test("parses enabled sources", () => {
    expect(parseShowWasteParam("projects,entries")).toEqual({
      projects: true,
      tasks: false,
      entries: true,
    });
  });

  test("ignores unknown tokens", () => {
    expect(parseShowWasteParam("projects,nope")).toEqual({
      projects: true,
      tasks: false,
      entries: false,
    });
  });

  test("serializes only enabled sources", () => {
    expect(serializeShowWasteParam(DEFAULT_AGENCY_REPORT_SHOW_WASTE)).toBe("");
    expect(
      serializeShowWasteParam({
        projects: true,
        tasks: true,
        entries: false,
      }),
    ).toBe("projects,tasks");
  });
});
