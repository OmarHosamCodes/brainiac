import { Route } from "lucide-react";

import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import type { AgencyProjectTask, AgencyTaskProject } from "@/features/task-management/agency-work";
import {
  agencyAvatarStackRingClass,
  agencyFocusRingClass,
  agencyMetricClass,
  agencyTaskRowClass,
  agencyTaskRowContentClass,
  agencyTaskRowNestedContentClass,
  agencyTaskRowProjectPillClass,
  agencyTaskRowSelectedClass,
} from "@/features/shared/agency-ui";
import {
  collectMilestoneAssigneesForProject,
  dedupeAssignees,
  type JourneyProgressSummary,
} from "@/features/projects/agency-task-journey";
import { cn } from "@/lib/utils";

const STACK_AVATAR_LIMIT = 4;

export type AgencyTaskJourneyRowViewProps = {
  task: AgencyProjectTask;
  projects: AgencyTaskProject[];
  allTasks: AgencyProjectTask[];
  selectedTaskId: string;
  journeyProgress?: JourneyProgressSummary;
  nested?: boolean;
  onSelect: (taskId: string) => void;
  onSelectProject?: (projectId: string) => void;
};

export function AgencyTaskJourneyRowView({
  task,
  projects,
  allTasks,
  selectedTaskId,
  journeyProgress,
  nested = false,
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
  const showSecondaryMeta = !nested && (assignees.length > 0 || Boolean(onSelectProject));
  const isSingleLineRow = nested || !showSecondaryMeta;

  return (
    <li
      className={cn("group/task-row", agencyTaskRowClass, isSelected && agencyTaskRowSelectedClass)}
    >
      <div
        className={cn(
          nested ? agencyTaskRowNestedContentClass : agencyTaskRowContentClass,
          isSingleLineRow ? "items-center" : "items-start",
        )}
      >
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

        <div
          className={cn(
            "pointer-events-none relative z-10 flex w-full min-w-0 gap-1.5",
            isSingleLineRow ? "items-center" : "items-start",
          )}
        >
          <span
            className={cn(
              "inline-flex size-3.5 shrink-0 items-center justify-center text-info",
              !isSingleLineRow && nested && "pt-px",
            )}
            aria-hidden
          >
            <Route className="size-3" strokeWidth={2.25} />
          </span>

          <div
            className={cn(
              "min-w-0 flex-1",
              !isSingleLineRow && cn("flex flex-col", nested ? "gap-0.5" : "gap-1.5"),
            )}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-sm leading-tight text-highlighted",
                  nested ? "font-medium" : "font-semibold",
                )}
              >
                {task.title}
              </span>
              {!nested ? (
                <span
                  className={cn(agencyMetricClass, "shrink-0 text-[11px] font-semibold text-muted")}
                  aria-label={`${progressLabel} steps complete`}
                >
                  {progressLabel}
                </span>
              ) : null}
            </div>

            {showSecondaryMeta ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
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
                        className={cn("size-6 rounded-full", agencyAvatarStackRingClass)}
                      />
                    </span>
                  ))}
                  {stackOverflow > 0 ? (
                    <span
                      className={cn(
                        "relative z-10 -ml-2 flex size-6 shrink-0 items-center justify-center rounded-full",
                        "bg-muted text-[9px] font-bold text-foreground",
                        agencyAvatarStackRingClass,
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
                  <span className={cn(agencyTaskRowProjectPillClass, "truncate")}>
                    {projectName}
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
