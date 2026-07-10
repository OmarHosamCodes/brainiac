import { useMemo } from "react";

import { groupTasksByRecency } from "@/features/task-management/group-tasks-by-recency";
import type { AgencyTaskListViewModel } from "@/features/task-management/hooks/use-agency-task-list";

type ReadyTaskListView = Extract<AgencyTaskListViewModel, { status: "ready" }>;

export type AgencyWorkSurfaceDoneViewModel = {
  view: ReadyTaskListView;
  sections: ReturnType<typeof groupTasksByRecency>;
  visibleCount: number;
};

export function useAgencyWorkSurfaceDone(view: ReadyTaskListView): AgencyWorkSurfaceDoneViewModel {
  const sections = useMemo(
    () => groupTasksByRecency(view.doneTasks, (task) => task.updatedAt),
    [view.doneTasks],
  );

  return {
    view,
    sections,
    visibleCount: sections.reduce((sum, section) => sum + section.tasks.length, 0),
  };
}
