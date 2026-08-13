/** Stack trigger: size-6 avatars, -ml-2 overlap, trailing plus with -ml-1 when empty. */
export const ASSIGNEE_STACK_AVATAR_PX = 24;
export const ASSIGNEE_STACK_OVERLAP_PX = 8;
export const ASSIGNEE_STACK_PLUS_OVERLAP_PX = 4;
/** Composer cap: 2 avatars, or 1 avatar + overflow. */
export const ASSIGNEE_STACK_MAX_WIDTH_PX = 48;

const STEP_PX = ASSIGNEE_STACK_AVATAR_PX - ASSIGNEE_STACK_OVERLAP_PX;
const PLUS_PX = ASSIGNEE_STACK_AVATAR_PX - ASSIGNEE_STACK_PLUS_OVERLAP_PX;

export type AssigneeStackFit = {
  visible: number;
  overflow: number;
};

export function assigneeStackWidthPx(visible: number, overflow: number, showPlus: boolean): number {
  const overflowChip = overflow > 0 ? 1 : 0;
  const placeholder = visible === 0 && overflow === 0 ? 1 : 0;
  const chips = visible + overflowChip + placeholder;
  const plus = showPlus ? PLUS_PX : 0;
  if (chips <= 0) return plus;
  return ASSIGNEE_STACK_AVATAR_PX + (chips - 1) * STEP_PX + plus;
}

export function fitAssigneeAvatarStack(memberCount: number, maxWidthPx: number): AssigneeStackFit {
  const count = Math.max(0, memberCount);
  if (count === 0) return { visible: 0, overflow: 0 };
  if (assigneeStackWidthPx(count, 0, false) <= maxWidthPx) {
    return { visible: count, overflow: 0 };
  }
  for (let visible = count - 1; visible >= 0; visible -= 1) {
    const overflow = count - visible;
    if (assigneeStackWidthPx(visible, overflow, false) <= maxWidthPx) {
      return { visible, overflow };
    }
  }
  return { visible: 0, overflow: count };
}
