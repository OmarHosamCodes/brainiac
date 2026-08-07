import { describe, expect, test } from "bun:test";

import {
  appendAgencyPeriodQuery,
  buildAgencyMoneyPeriodHref,
  buildAgencyReportsPeriodHref,
  parseAgencyPeriodQuery,
} from "./agency-period-query";

describe("agency-period-query", () => {
  test("parses valid from/to", () => {
    const params = new URLSearchParams("from=2026-08-01&to=2026-08-31");
    expect(parseAgencyPeriodQuery(params)).toEqual({ from: "2026-08-01", to: "2026-08-31" });
  });

  test("rejects inverted ranges", () => {
    const params = new URLSearchParams("from=2026-08-31&to=2026-08-01");
    expect(parseAgencyPeriodQuery(params)).toBeNull();
  });

  test("builds Reports and Money handoff hrefs", () => {
    expect(buildAgencyReportsPeriodHref({ from: "2026-08-01", to: "2026-08-31" })).toBe(
      "/agency?from=2026-08-01&to=2026-08-31&section=reports",
    );
    expect(buildAgencyMoneyPeriodHref({ from: "2026-08-01", to: "2026-08-31" })).toContain(
      "manage=money",
    );
  });

  test("append keeps existing params", () => {
    const params = appendAgencyPeriodQuery(new URLSearchParams("section=reports"), {
      from: "2026-01-01T00:00:00.000Z",
      to: "2026-01-31T23:59:59.999Z",
    });
    expect(params.get("from")).toBe("2026-01-01");
    expect(params.get("to")).toBe("2026-01-31");
    expect(params.get("section")).toBe("reports");
  });
});
