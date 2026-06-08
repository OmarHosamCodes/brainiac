import * as React from "react";

type TimerState = {
  startedAt: number | null;
  description: string;
};

const storageKey = "brainiac.agency.timer";

export function usePersistentTimer() {
  const [state, setState] = React.useState<TimerState>(() => {
    if (typeof window === "undefined") {
      return { startedAt: null, description: "" };
    }

    try {
      return JSON.parse(window.localStorage.getItem(storageKey) ?? "") as TimerState;
    } catch {
      return { startedAt: null, description: "" };
    }
  });

  React.useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state]);

  return {
    ...state,
    isRunning: Boolean(state.startedAt),
    start: (description: string) => setState({ startedAt: Date.now(), description }),
    stop: () => setState({ startedAt: null, description: "" }),
  };
}
