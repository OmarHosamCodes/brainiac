import assert from "node:assert/strict";

import {
  AGENCY_TASK_ROW_DELETE_ACTION_WIDTH,
  clampAgencyTaskRowSwipeOffset,
  snapAgencyTaskRowSwipeOffset,
} from "./agency-task-row-swipe";

assert.equal(clampAgencyTaskRowSwipeOffset(0), 0);
assert.equal(clampAgencyTaskRowSwipeOffset(-200), -AGENCY_TASK_ROW_DELETE_ACTION_WIDTH);
assert.equal(clampAgencyTaskRowSwipeOffset(12), 0);

assert.deepEqual(snapAgencyTaskRowSwipeOffset(-10), { offset: 0, open: false });
assert.deepEqual(snapAgencyTaskRowSwipeOffset(-30), {
  offset: -AGENCY_TASK_ROW_DELETE_ACTION_WIDTH,
  open: true,
});
assert.deepEqual(snapAgencyTaskRowSwipeOffset(-70), {
  offset: -AGENCY_TASK_ROW_DELETE_ACTION_WIDTH,
  open: true,
});

console.log("agency-task-row-swipe: ok");
