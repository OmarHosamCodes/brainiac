import assert from "node:assert/strict";

import {
  applyDurationToDraft,
  applyEndTimeToDraft,
  applyStartTimeToDraft,
  draftSpansNextDay,
  draftToIsoRange,
  type TimeEntryDraft,
} from "./time-entry-draft";

const baseDraft: TimeEntryDraft = {
  taskId: "task-1",
  date: "2026-07-04",
  startTime: "23:00",
  endTime: "22:00",
  durationInput: "1:00",
  description: "",
};

const overnightRange = draftToIsoRange({
  ...baseDraft,
  endTime: "01:00",
  durationInput: "2:00",
});
assert.ok(!("error" in overnightRange));
assert.equal(overnightRange.durationSeconds, 7_200);
assert.equal(new Date(overnightRange.startAt).getDate(), 4);
assert.equal(new Date(overnightRange.endAt).getDate(), 5);

const endDraft = applyEndTimeToDraft(
  { ...baseDraft, startTime: "23:00", endTime: "22:00", durationInput: "1:00" },
  "01:00",
);
assert.equal(endDraft.date, "2026-07-04");
assert.equal(endDraft.endTime, "01:00");
assert.equal(endDraft.durationInput, "2:00:00");

const durationDraft = applyDurationToDraft(
  { ...baseDraft, startTime: "23:00", endTime: "22:00", durationInput: "1:00" },
  "2:00",
);
assert.equal(durationDraft.date, "2026-07-04");
assert.equal(durationDraft.endTime, "01:00");
assert.equal(durationDraft.durationInput, "2:00");

assert.equal(
  draftSpansNextDay({ ...baseDraft, startTime: "23:00", endTime: "01:00", durationInput: "2:00" }),
  true,
);

const sameDayRange = draftToIsoRange({
  ...baseDraft,
  startTime: "09:00",
  endTime: "17:00",
  durationInput: "8:00",
});
assert.ok(!("error" in sameDayRange));
assert.equal(sameDayRange.durationSeconds, 28_800);
assert.equal(new Date(sameDayRange.startAt).getDate(), 4);
assert.equal(new Date(sameDayRange.endAt).getDate(), 4);

const sameDayDraft = applyEndTimeToDraft(
  { ...baseDraft, startTime: "09:00", endTime: "08:00", durationInput: "1:00" },
  "17:00",
);
assert.equal(sameDayDraft.date, "2026-07-04");
assert.equal(sameDayDraft.endTime, "17:00");
assert.equal(sameDayDraft.durationInput, "8:00:00");
assert.equal(draftSpansNextDay(sameDayDraft), false);

const staleDurationRange = draftToIsoRange({
  ...baseDraft,
  startTime: "10:43",
  endTime: "13:32",
  durationInput: "13:32:00",
});
assert.ok(!("error" in staleDurationRange));
assert.equal(staleDurationRange.durationSeconds, 10_140);

const startDraft = applyStartTimeToDraft(
  { ...baseDraft, startTime: "10:43", endTime: "13:32", durationInput: "13:32:00" },
  "11:00",
);
assert.equal(startDraft.endTime, "13:32");
assert.equal(startDraft.durationInput, "2:32:00");

console.log("time-entry-draft: ok");
