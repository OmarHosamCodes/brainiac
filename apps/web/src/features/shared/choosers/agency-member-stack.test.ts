import { describe, expect, test } from "bun:test";

import {
  ASSIGNEE_STACK_MAX_WIDTH_PX,
  assigneeStackWidthPx,
  fitAssigneeAvatarStack,
} from "./agency-member-stack";

describe("fitAssigneeAvatarStack", () => {
  test("empty stays empty", () => {
    expect(fitAssigneeAvatarStack(0, ASSIGNEE_STACK_MAX_WIDTH_PX)).toEqual({
      visible: 0,
      overflow: 0,
    });
  });

  test("shows every avatar when the stack fits", () => {
    expect(fitAssigneeAvatarStack(2, ASSIGNEE_STACK_MAX_WIDTH_PX)).toEqual({
      visible: 2,
      overflow: 0,
    });
  });

  test("reserves a +N chip before dropping avatars", () => {
    const many = 8;
    const fit = fitAssigneeAvatarStack(many, ASSIGNEE_STACK_MAX_WIDTH_PX);
    expect(fit.visible + fit.overflow).toBe(many);
    expect(fit.overflow).toBeGreaterThan(0);
    expect(fit.visible).toBeGreaterThanOrEqual(0);
    expect(assigneeStackWidthPx(fit.visible, fit.overflow, false)).toBeLessThanOrEqual(
      ASSIGNEE_STACK_MAX_WIDTH_PX,
    );
    expect(assigneeStackWidthPx(fit.visible + 1, many - fit.visible - 1, false)).toBeGreaterThan(
      ASSIGNEE_STACK_MAX_WIDTH_PX,
    );
  });

  test("falls back to +N only when avatars cannot fit", () => {
    expect(fitAssigneeAvatarStack(5, 20)).toEqual({ visible: 0, overflow: 5 });
  });
});
