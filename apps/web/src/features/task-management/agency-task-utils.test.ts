import { describe, expect, test } from "bun:test";

import { formatEstimateMinutes, parseEstimateInput } from "./agency-task-utils";

describe("parseEstimateInput", () => {
  test("parses bare minutes", () => {
    expect(parseEstimateInput("90")).toBe(90);
    expect(parseEstimateInput("45")).toBe(45);
  });

  test("parses minute and hour suffixes", () => {
    expect(parseEstimateInput("45m")).toBe(45);
    expect(parseEstimateInput("1h")).toBe(60);
    expect(parseEstimateInput("2.5h")).toBe(150);
    expect(parseEstimateInput("1h 30m")).toBe(90);
  });

  test("parses clock-style input", () => {
    expect(parseEstimateInput("1:30")).toBe(90);
    expect(parseEstimateInput("0:45")).toBe(45);
  });

  test("rejects empty and out-of-range values", () => {
    expect(parseEstimateInput("")).toBeNull();
    expect(parseEstimateInput("0")).toBeNull();
    expect(parseEstimateInput("1500")).toBeNull();
    expect(parseEstimateInput("nope")).toBeNull();
  });
});

describe("formatEstimateMinutes", () => {
  test("formats compact labels", () => {
    expect(formatEstimateMinutes(45)).toBe("45m");
    expect(formatEstimateMinutes(60)).toBe("1h");
    expect(formatEstimateMinutes(90)).toBe("1h 30m");
  });
});
