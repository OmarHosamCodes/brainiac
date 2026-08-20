import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";

import { agencyMyTasksClientGroupHeaderClass } from "@/features/shared/agency-ui";
import type { AgencyTaskThreadTitlePayload } from "@/features/task-management/hooks/use-agency-task-thread-shell";
import { useAgencyMyTasksRail } from "@/features/task-management/hooks/use-agency-my-tasks-rail";
import {
  railLayoutTransition,
  railListContainerVariants,
  railListItemVariants,
  railSectionExit,
  railStaggerIndex,
} from "@/features/task-management/my-tasks-rail/agency-my-tasks-rail-motion";
import { AgencyMyTasksEditDialog } from "@/features/task-management/my-tasks-rail/agency-my-tasks-edit-dialog";
import { AgencyMyTasksRailRow } from "@/features/task-management/my-tasks-rail/agency-my-tasks-rail-row";
import { AgencyMyTasksRailView } from "@/features/task-management/my-tasks-rail/agency-my-tasks-rail-view";

type AgencyMyTasksRailProps = {
  teamId: string;
  openThreadTaskId: string | null;
  onTitleOpenThread: (task: AgencyTaskThreadTitlePayload) => void;
};

function projectLabelForTask(
  projects: { id: string; name: string; clientName?: string | null }[],
  projectId: string,
): string {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return "Project";
  if (project.clientName) return `${project.name} · ${project.clientName}`;
  return project.name;
}

export function AgencyMyTasksRail({
  teamId,
  openThreadTaskId,
  onTitleOpenThread,
}: AgencyMyTasksRailProps) {
  const view = useAgencyMyTasksRail({ teamId });

  const renderList = (): ReactNode => {
    let rowIndex = 0;
    return (
      <MotionConfig reducedMotion="user">
        <motion.div
          className="flex flex-col gap-3"
          variants={railListContainerVariants}
          initial={false}
          animate="show"
          layout
          transition={railLayoutTransition}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {view.clientGroups.map((group) => (
              <motion.section
                key={group.clientId}
                aria-label={group.clientName}
                className="px-0.5"
                layout
                transition={railLayoutTransition}
                exit={railSectionExit}
              >
                <motion.h3 layout="position" className={agencyMyTasksClientGroupHeaderClass}>
                  {group.clientName}
                </motion.h3>
                <motion.ul
                  layout
                  className="flex flex-col gap-0.5"
                  transition={railLayoutTransition}
                >
                  <AnimatePresence initial={false} mode="popLayout">
                    {group.tasks.map((task) => {
                      const stagger = railStaggerIndex(rowIndex++);
                      const project = view.projects.find((item) => item.id === task.projectId);
                      const assignerMember =
                        view.members.find((member) => member.userId === task.createdByUserId) ??
                        null;
                      return (
                        <AgencyMyTasksRailRow
                          key={task.id}
                          task={task}
                          view={view}
                          projectName={project?.name ?? "Project"}
                          assignerMember={assignerMember}
                          variants={railListItemVariants}
                          stagger={stagger}
                          isThreadOpen={openThreadTaskId === task.id}
                          onOpenThread={() =>
                            onTitleOpenThread({
                              id: task.id,
                              title: task.title,
                              projectId: task.projectId,
                              projectName: project?.name ?? null,
                              assignedToTeam: task.assignedToTeam,
                              assignees: task.assignedToTeam
                                ? []
                                : task.assignees.map((assignee) => ({
                                    userId: assignee.userId,
                                    userName: assignee.userName,
                                    userAvatar: assignee.userAvatar,
                                  })),
                            })
                          }
                        />
                      );
                    })}
                  </AnimatePresence>
                </motion.ul>
              </motion.section>
            ))}
          </AnimatePresence>
        </motion.div>
      </MotionConfig>
    );
  };

  return (
    <>
      <AgencyMyTasksRailView view={view} renderList={renderList} />
      {view.editingTask ? (
        <AgencyMyTasksEditDialog
          open
          onOpenChange={view.onEditOpenChange}
          teamId={view.teamId}
          task={view.editingTask}
          projectLabel={projectLabelForTask(view.projects, view.editingTask.projectId)}
          members={view.members}
        />
      ) : null}
    </>
  );
}
