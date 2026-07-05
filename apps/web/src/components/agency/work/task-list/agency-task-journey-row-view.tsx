import { Route } from "lucide-react";

import { AgencyMemberAvatar } from "@/components/agency/agency-member-avatar";
import type { AgencyProjectTask, AgencyTaskProject } from "@/lib/schemas/agency-work";
import {
  agencyFocusRingClass,
  agencyMetricClass,
  agencyTaskRowClass,
  agencyTaskRowProjectPillClass,
  agencyTaskRowSelectedClass,
} from "@/lib/utils/agency-ui";
import {
  collectMilestoneAssigneesForProject,
  dedupeAssignees,
  type JourneyProgressSummary,
} from "@/lib/utils/agency-task-journey";
import { cn } from "@/lib/utils";

const STACK_AVATAR_LIMIT = 4;

export type AgencyTaskJourneyRowViewProps = {
  task: AgencyProjectTask;
  projects: AgencyTaskProject[];
  allTasks: AgencyProjectTask[];
  selectedTaskId: string;
  journeyProgress?: JourneyProgressSummary;
  onSelect: (taskId: string) => void;
  onSelectProject?: (projectId: string) => void;
};

export function AgencyTaskJourneyRowView({
  task,
  projects,
  allTasks,
  selectedTaskId,
  journeyProgress,
  onSelect,
  onSelectProject,
}: AgencyTaskJourneyRowViewProps) {
  const project = projects.find((entry) => entry.id === task.projectId);
  const projectName = project?.name ?? "Project";
  const isSelected = task.id === selectedTaskId;
  const assignees = dedupeAssignees([
    ...task.assignees,
    ...collectMilestoneAssigneesForProject(allTasks, task.projectId),
  ]);
  const stackVisible = assignees.slice(0, STACK_AVATAR_LIMIT);
  const stackOverflow = assignees.length - stackVisible.length;
  const completedSteps = journeyProgress?.completedSteps;
  const totalSteps = journeyProgress?.totalSteps;
  const progressLabel =
    completedSteps !== undefined && totalSteps !== undefined
      ? `${completedSteps}/${totalSteps}`
      : "—";

  return (
    <li
      className={cn(
        "group/task-row",
        agencyTaskRowClass,
        isSelected && agencyTaskRowSelectedClass,
      )}
    >
      <div className="relative flex items-start gap-2 px-3 py-2.5">
        <button
          type="button"
          className={cn(
            "absolute inset-0 z-0 rounded-none",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
          )}
          aria-current={isSelected ? "true" : undefined}
          aria-label={`Open journey for ${projectName}`}
          onClick={() => onSelect(task.id)}
        />

        <div className="pointer-events-none relative z-10 flex w-full min-w-0 items-start gap-2">
          <span
            className="inline-flex size-4 shrink-0 items-center justify-center pt-0.5 text-info"
            aria-hidden
          >
            <Route className="size-3.5" strokeWidth={2.25} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-highlighted">
                {task.title}
              </span>
              <span
                className={cn(
                  agencyMetricClass,
                  "shrink-0 text-[11px] font-semibold text-muted",
                )}
                aria-label={`${progressLabel} steps complete`}
              >
                {progressLabel}
              </span>
            </div>

            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
              <span className="inline-flex shrink-0 items-center gap-1">
                {stackVisible.map((member, index) => (
                  <span
                    key={member.userId}
                    className={cn("relative", index > 0 && "-ml-2")}
                    style={{ zIndex: index + 1 }}
                  >
                    <AgencyMemberAvatar
                      name={member.userName}
                      avatarUrl={member.userAvatar}
                      size="sm"
                      className="size-6 rounded-full ring-2 ring-elevated"
                    />
                  </span>
                ))}
                {stackOverflow > 0 ? (
                  <span
                    className={cn(
                      "relative z-10 -ml-2 flex size-6 shrink-0 items-center justify-center rounded-full",
                      "bg-muted text-[9px] font-bold text-highlighted ring-2 ring-elevated",
                    )}
                    aria-hidden
                  >
                    +{stackOverflow}
                  </span>
                ) : null}
              </span>

              {onSelectProject ? (
                <button
                  type="button"
                  className={cn(
                    agencyTaskRowProjectPillClass,
                    agencyFocusRingClass,
                    "pointer-events-auto motion-reduce:transition-none",
                  )}
                  onClick={() => onSelectProject(task.projectId)}
                >
                  <span className="truncate">{projectName}</span>
                </button>
              ) : (
                <span className={cn(agencyTaskRowProjectPillClass, "truncate")}>{projectName}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
