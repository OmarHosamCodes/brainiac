import assert from "node:assert/strict";

import {
  allAgencyReportFieldIds,
  areSameReportFieldSets,
  isReportCreatorSelectionHighlightField,
  parseReportFieldsParam,
  serializeReportFieldsParam,
} from "./agency-report-fields";

assert.deepEqual(allAgencyReportFieldIds(), [
  "project",
  "task",
  "description",
  "duration",
  "assignee",
]);
assert.equal(parseReportFieldsParam(null).length, 5);
assert.deepEqual(parseReportFieldsParam("project,duration"), ["project", "duration"]);
assert.deepEqual(parseReportFieldsParam("bad,values"), allAgencyReportFieldIds());
assert.equal(serializeReportFieldsParam(["project", "task"]), "project,task");
assert.equal(areSameReportFieldSets(["project", "task"], ["task", "project"]), true);
assert.equal(isReportCreatorSelectionHighlightField("project"), false);
assert.equal(isReportCreatorSelectionHighlightField("task"), true);
