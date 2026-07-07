import assert from "node:assert/strict";

import {
  filterSavedReports,
  formatCompactDateSpan,
  formatRelativeReportTime,
  formatReportHeaderMeta,
  getAgencyReportPeriodGroup,
  groupSavedReportsByPeriod,
  sanitizeReportFileName,
  suggestAgencyReportName,
} from "./agency-report-naming";

const labelContext = {
  clients: [{ id: "c1", name: "Acme" }],
  projects: [{ id: "p1", name: "Website" }],
  members: [{ userId: "u1", userName: "Sara" }],
};

const headerLabelContext = {
  clients: labelContext.clients,
  projects: labelContext.projects,
  members: labelContext.members,
};

assert.equal(
  suggestAgencyReportName(
    { range: { from: "2026-06-01T00:00:00.000Z", to: "2026-06-30T23:59:59.999Z" } },
    labelContext,
  ),
  "Q2 2026",
);

assert.equal(
  suggestAgencyReportName(
    {
      range: { from: "2026-06-01T00:00:00.000Z", to: "2026-08-31T23:59:59.999Z" },
      clientId: "c1",
      memberUserId: "u1",
    },
    labelContext,
  ),
  "Q2–Q3 2026 · Acme · Sara",
);

assert.equal(
  suggestAgencyReportName(
    {
      range: { from: "2025-10-01T00:00:00.000Z", to: "2026-03-31T23:59:59.999Z" },
    },
    labelContext,
  ),
  "Q4 2025–Q1 2026",
);

const julyGroup = getAgencyReportPeriodGroup("2026-07-15T12:00:00.000Z");
assert.equal(julyGroup.label, "2026 · Q3 · July");
assert.equal(julyGroup.key, "2026-Q3-7");

const reports = [
  {
    id: "r1",
    name: "Q3 2026 · Acme",
    rangeFrom: "2026-07-01T00:00:00.000Z",
    updatedAt: new Date(Date.now() - 3_600_000).toISOString(),
    createdByUserName: "Sara",
    clientId: "c1",
    memberUserId: "",
  },
  {
    id: "r2",
    name: "Q2 2026",
    rangeFrom: "2026-04-01T00:00:00.000Z",
    updatedAt: new Date().toISOString(),
    createdByUserName: "Omar",
    clientId: "",
    memberUserId: "",
  },
];

const grouped = groupSavedReportsByPeriod(reports);
assert.equal(grouped.length, 2);
assert.equal(grouped[0]?.group.quarter, 3);
assert.equal(grouped[1]?.group.quarter, 2);

assert.equal(filterSavedReports(reports, "acme", labelContext).length, 1);
assert.equal(filterSavedReports(reports, "sara", labelContext).length, 1);

assert.match(formatRelativeReportTime(new Date(Date.now() - 90_000).toISOString()), /m ago/);
assert.equal(sanitizeReportFileName("Q3 2026 · Acme"), "Q3 2026 · Acme");
assert.equal(sanitizeReportFileName("  "), "report");

assert.equal(
  formatCompactDateSpan("2026-07-01T00:00:00.000Z", "2026-09-30T23:59:59.999Z"),
  "Jul 1 – Sep 30",
);

const headerMeta = formatReportHeaderMeta(
  {
    rangeFrom: "2026-07-01T00:00:00.000Z",
    rangeTo: "2026-09-30T23:59:59.999Z",
    clientId: "c1",
    memberUserId: "u1",
    createdByUserName: "Sara",
    visibleEntryCount: 142,
  },
  headerLabelContext,
);
assert.equal(headerMeta.scopeLine, "Q3 2026 · Jul 1 – Sep 30 · Acme · Sara · 142 entries");
assert.equal(headerMeta.attributionLine, "Created by Sara");
