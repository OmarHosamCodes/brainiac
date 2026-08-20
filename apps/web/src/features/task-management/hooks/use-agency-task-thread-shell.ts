import { useEffect, useReducer, useState } from "react";

import {
  reduceAgencyTaskThreadOpen,
  type AgencyTaskThreadOpenState,
} from "@/features/task-management/task-thread/agency-task-thread-open";

export type AgencyTaskThreadTitlePayload = {
  id: string;
  title: string;
};

const initialOpen: AgencyTaskThreadOpenState = { openTaskId: null };

export function useAgencyTaskThreadShell() {
  const [open, dispatch] = useReducer(reduceAgencyTaskThreadOpen, initialOpen);
  const [openTaskTitle, setOpenTaskTitle] = useState<string | null>(null);

  function onTitleOpenThread(task: AgencyTaskThreadTitlePayload) {
    const next = reduceAgencyTaskThreadOpen(open, { type: "title", taskId: task.id });
    dispatch({ type: "title", taskId: task.id });
    setOpenTaskTitle(next.openTaskId ? task.title : null);
  }

  function onBack() {
    dispatch({ type: "back" });
    setOpenTaskTitle(null);
  }

  useEffect(() => {
    if (!open.openTaskId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      dispatch({ type: "escape" });
      setOpenTaskTitle(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open.openTaskId]);

  return {
    openTaskId: open.openTaskId,
    openTaskTitle,
    onTitleOpenThread,
    onBack,
  };
}
