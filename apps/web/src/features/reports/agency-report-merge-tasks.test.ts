import { describe, expect, test } from "bun:test";

import {
  DEFAULT_AGENCY_REPORT_MERGE_SAME_TASK_NAMES,
  parseMergeSameTaskNamesParam,
  serializeMergeSameTaskNamesParam,
} from "@/features/reports/agency-report-merge-tasks";

describe("merge same task names param", () => {
  test("defaults to on", () => {
    expect(DEFAULT_AGENCY_REPORT_MERGE_SAME_TASK_NAMES).toBe(true);
    expect(parseMergeSameTaskNamesParam(null)).toBe(true);
    expect(parseMergeSameTaskNamesParam("")).toBe(true);
  });

  test("parses off and on tokens", () => {
    expect(parseMergeSameTaskNamesParam("0")).toBe(false);
    expect(parseMergeSameTaskNamesParam("false")).toBe(false);
    expect(parseMergeSameTaskNamesParam("off")).toBe(false);
    expect(parseMergeSameTaskNamesParam("1")).toBe(true);
    expect(parseMergeSameTaskNamesParam("true")).toBe(true);
  });

  test("serializes only non-default values", () => {
    expect(serializeMergeSameTaskNamesParam(true)).toBe("");
    expect(serializeMergeSameTaskNamesParam(false)).toBe("0");
  });
});
