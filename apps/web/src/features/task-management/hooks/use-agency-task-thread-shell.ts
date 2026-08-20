import { useEffect, useReducer, useState } from "react";

import {
  reduceAgencyTaskThreadOpen,
  type AgencyTaskThreadOpenState,
} from "@/features/task-management/task-thread/agency-task-thread-open";

export type AgencyTaskThreadTitlePayload = {
  id: string;
  title: string;
  projectId: string;
  projectName: string | null;
  assignedToTeam: boolean;
  assignees: Array<{
    userId: string;
    userName: string;
    userAvatar: string | null;
  }>;
};

export type AgencyTaskThreadOpenMeta = {
  title: string;
  projectId: string;
  projectName: string | null;
  assignedToTeam: boolean;
  assignees: AgencyTaskThreadTitlePayload["assignees"];
};

const initialOpen: AgencyTaskThreadOpenState = { openTaskId: null };

export function useAgencyTaskThreadShell() {
  const [open, dispatch] = useReducer(reduceAgencyTaskThreadOpen, initialOpen);
  const [openTaskMeta, setOpenTaskMeta] = useState<AgencyTaskThreadOpenMeta | null>(null);

  function onTitleOpenThread(task: AgencyTaskThreadTitlePayload) {
    const next = reduceAgencyTaskThreadOpen(open, { type: "title", taskId: task.id });
    dispatch({ type: "title", taskId: task.id });
    setOpenTaskMeta(
      next.openTaskId
        ? {
            title: task.title,
            projectId: task.projectId,
            projectName: task.projectName,
            assignedToTeam: task.assignedToTeam,
            assignees: task.assignees,
          }
        : null,
    );
  }

  function onBack() {
    dispatch({ type: "back" });
    setOpenTaskMeta(null);
  }

  useEffect(() => {
    if (!open.openTaskId) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      dispatch({ type: "escape" });
      setOpenTaskMeta(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open.openTaskId]);

  return {
    openTaskId: open.openTaskId,
    openTaskMeta,
    onTitleOpenThread,
    onBack,
  };
}
