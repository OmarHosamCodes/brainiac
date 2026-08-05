import { describe, expect, test } from "bun:test";

import {
  escapeCsvCell,
  leaveTypeLabel,
  localDateKey,
} from "@/features/resourcing/hooks/use-agency-resourcing-workload";

describe("localDateKey", () => {
  test("formats local calendar date without UTC shift", () => {
    expect(localDateKey(new Date(2026, 5, 30, 23, 30))).toBe("2026-06-30");
  });
});

describe("escapeCsvCell", () => {
  test("quotes values and escapes quotes", () => {
    expect(escapeCsvCell('Said "hello"')).toBe('"Said ""hello"""');
  });

  test("guards formula-leading cells", () => {
    expect(escapeCsvCell("=1+1")).toBe(`"'=1+1"`);
    expect(escapeCsvCell("+cmd")).toBe(`"'+cmd"`);
    expect(escapeCsvCell("-1")).toBe(`"'-1"`);
    expect(escapeCsvCell("@ref")).toBe(`"'@ref"`);
  });
});

describe("leaveTypeLabel", () => {
  test("maps known off-day types", () => {
    expect(leaveTypeLabel("pto")).toBe("Paid time off");
    expect(leaveTypeLabel("sick")).toBe("Sick");
    expect(leaveTypeLabel("team_holiday")).toBe("Team holiday");
    expect(leaveTypeLabel("other")).toBe("Personal");
  });
});
