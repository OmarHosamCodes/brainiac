import { describe, expect, test } from "bun:test";

import {
  reduceAgencyTaskThreadOpen,
  type AgencyTaskThreadOpenState,
} from "./agency-task-thread-open";

const closed: AgencyTaskThreadOpenState = { openTaskId: null };

describe("reduceAgencyTaskThreadOpen", () => {
  test("title when closed opens that task", () => {
    expect(reduceAgencyTaskThreadOpen(closed, { type: "title", taskId: "a" })).toEqual({
      openTaskId: "a",
    });
  });

  test("title when same task is open toggles closed", () => {
    expect(reduceAgencyTaskThreadOpen({ openTaskId: "a" }, { type: "title", taskId: "a" })).toEqual(
      { openTaskId: null },
    );
  });

  test("title when a different task is open closes without switching", () => {
    expect(reduceAgencyTaskThreadOpen({ openTaskId: "a" }, { type: "title", taskId: "b" })).toEqual(
      { openTaskId: null },
    );
  });

  test("back closes", () => {
    expect(reduceAgencyTaskThreadOpen({ openTaskId: "a" }, { type: "back" })).toEqual({
      openTaskId: null,
    });
  });

  test("escape closes", () => {
    expect(reduceAgencyTaskThreadOpen({ openTaskId: "a" }, { type: "escape" })).toEqual({
      openTaskId: null,
    });
  });
});
