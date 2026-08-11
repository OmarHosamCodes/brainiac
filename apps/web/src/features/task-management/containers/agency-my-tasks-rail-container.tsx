import { AnimatePresence, MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";

import { agencyMyTasksClientGroupHeaderClass } from "@/features/shared/agency-ui";
import { useAgencyMyTasksRail } from "@/features/task-management/hooks/use-agency-my-tasks-rail";
import {
  railListContainerVariants,
  railListItemVariants,
  railStaggerIndex,
} from "@/features/task-management/my-tasks-rail/agency-my-tasks-rail-motion";
import { AgencyMyTasksRailRow } from "@/features/task-management/my-tasks-rail/agency-my-tasks-rail-row";
import { AgencyMyTasksRailView } from "@/features/task-management/my-tasks-rail/agency-my-tasks-rail-view";

type AgencyMyTasksRailProps = {
  teamId: string;
};

export function AgencyMyTasksRail({ teamId }: AgencyMyTasksRailProps) {
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
        >
          <AnimatePresence initial={false} mode="popLayout">
            {view.clientGroups.map((group) => (
              <motion.section
                key={group.clientId}
                aria-label={group.clientName}
                className="px-0.5"
                layout
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
              >
                <h3 className={agencyMyTasksClientGroupHeaderClass}>{group.clientName}</h3>
                <ul className="flex flex-col gap-0.5">
                  {group.tasks.map((task) => {
                    const stagger = railStaggerIndex(rowIndex++);
                    const project = view.projects.find((item) => item.id === task.projectId);
                    const assignedByLabel =
                      view.memberNameById.get(task.createdByUserId) ?? "Unknown";
                    return (
                      <AgencyMyTasksRailRow
                        key={task.id}
                        task={task}
                        view={view}
                        projectName={project?.name ?? "Project"}
                        assignedByLabel={assignedByLabel}
                        variants={railListItemVariants}
                        stagger={stagger}
                      />
                    );
                  })}
                </ul>
              </motion.section>
            ))}
          </AnimatePresence>
        </motion.div>
      </MotionConfig>
    );
  };

  return <AgencyMyTasksRailView view={view} renderList={renderList} />;
}
