export type AgencyTaskThreadOpenState = {
  openTaskId: string | null;
};

export type AgencyTaskThreadOpenAction =
  | { type: "title"; taskId: string }
  | { type: "back" }
  | { type: "escape" };

export function reduceAgencyTaskThreadOpen(
  state: AgencyTaskThreadOpenState,
  action: AgencyTaskThreadOpenAction,
): AgencyTaskThreadOpenState {
  switch (action.type) {
    case "title": {
      if (state.openTaskId === null) {
        return { openTaskId: action.taskId };
      }
      // Same title toggles closed; other title closes without switching.
      return { openTaskId: null };
    }
    case "back":
    case "escape":
      return { openTaskId: null };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
