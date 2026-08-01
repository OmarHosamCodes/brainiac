import { describe, expect, test } from "bun:test";

import { formatAgendaRange } from "@/features/resourcing/agency-resourcing-workload-view";

describe("formatAgendaRange", () => {
  test("same day", () => {
    expect(formatAgendaRange("2026-08-03", "2026-08-03")).toBe("Aug 3");
  });

  test("same month span", () => {
    expect(formatAgendaRange("2026-08-01", "2026-08-31")).toBe("Aug 1–31");
  });

  test("cross-month span", () => {
    expect(formatAgendaRange("2026-08-01", "2026-12-31")).toBe("Aug 1 – Dec 31");
  });
});
