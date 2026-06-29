import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronDown,
  ListChecks,
  PanelLeftOpen,
} from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import { AgencyTaskClientGroup } from "@/components/agency/agency-task-client-group";
import {
  AgencyTaskCreateInline,
  UNASSIGNED_ASSIGNEE_VALUE,
} from "@/components/agency/agency-task-create-inline";
import { AgencyTaskRailSummary } from "@/components/agency/agency-task-rail-summary";
import {
  AgencyTaskRowWithPending,
  type AgencyProjectTask,
  type AgencyTaskProject,
  type TaskStatus,
} from "@/components/agency/agency-task-row";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgencyProjectTasksQuery } from "@/lib/queries/agency";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { withAgencySyncQueryOptions } from "@/lib/utils/agency-query-options";
import {
  agencyFocusRingClass,
  agencyMetricClass,
  agencyTaskRailClass,
} from "@/lib/utils/agency-ui";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { groupTasksByClient } from "@/lib/utils/agency-task-utils";
import { selectIsCreatingTask, useAgencyOpsStore } from "@/stores/agency-ops";
import { cn } from "@/lib/utils";

type AgencyTaskListProps = {
  teamId: string;
  projects: AgencyTaskProject[];
  selectedTaskId: string;
  collapsed: boolean;
  onSelect: (taskId: string) => void;
  onCollapsedChange: (collapsed: boolean) => void;
  onSelectProject: (projectId: string) => void;
};

const ACTIVE_TASK_STATUSES: TaskStatus[] = ["open", "in_progress"];
const DONE_TASK_STATUSES: TaskStatus[] = ["done"];

export function AgencyTaskList({
  teamId,
  projects,
  selectedTaskId,
  collapsed,
  onSelect,
  onCollapsedChange,
  onSelectProject,
}: AgencyTaskListProps) {
  const agencyOps = useAgencyOpsStore();
  const isCreatingTask = useAgencyOpsStore(selectIsCreatingTask);
  const session = authClient.useSession();
  const currentUserId = session.data?.user?.id ?? "";
  const donePanelId = useId();

  const [createExpanded, setCreateExpanded] = useState(false);
  const [doneExpanded, setDoneExpanded] = useState(false);
  const [recentlyCompletedTaskId, setRecentlyCompletedTaskId] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [selectedProjectIdForCreate, setSelectedProjectIdForCreate] = useState("");
  const [selectedAssigneeIdForCreate, setSelectedAssigneeIdForCreate] = useState("");
  const [collapsedClients, setCollapsedClients] = useState<Set<string>>(() => new Set());

  const skipProjectStep = projects.length === 1;
  const titleSuggestionProjectId = createExpanded ? selectedProjectIdForCreate : "";

  const membersQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.taskThreads.members.list.queryOptions({
          input: { teamId },
        }),
        enabled: Boolean(teamId),
      },
      "warm",
    ),
  );

  const members = membersQuery.data?.items ?? [];

  const activeTasksQuery = useAgencyProjectTasksQuery(teamId, {
    assigneeUserId: currentUserId,
    statuses: ACTIVE_TASK_STATUSES,
  });

  const doneTasksQuery = useAgencyProjectTasksQuery(teamId, {
    assigneeUserId: currentUserId,
    statuses: DONE_TASK_STATUSES,
  });

  const titleSuggestionTasksQuery = useAgencyProjectTasksQuery(teamId, {
    projectId: titleSuggestionProjectId,
  });

  const activeTasks = activeTasksQuery.data?.items ?? [];
  const doneTasks = doneTasksQuery.data?.items ?? [];
  const titleSuggestionTasks = useMemo(() => {
    if (!createExpanded || !selectedProjectIdForCreate) return [];
    return (titleSuggestionTasksQuery.data?.items ?? []).filter(
      (task) => task.projectId === selectedProjectIdForCreate,
    );
  }, [createExpanded, selectedProjectIdForCreate, titleSuggestionTasksQuery.data?.items]);

  const activeCount = activeTasksQuery.isPending ? null : activeTasks.length;
  const doneCount = doneTasksQuery.isPending ? null : doneTasks.length;
  const totalCount =
    activeCount === null || doneCount === null ? null : activeCount + doneCount;

  const clientGroups = useMemo(
    () => groupTasksByClient(activeTasks, projects),
    [activeTasks, projects],
  );

  useEffect(() => {
    if (!recentlyCompletedTaskId) return;
    const clearHandle = setTimeout(() => setRecentlyCompletedTaskId(""), 900);
    return () => clearTimeout(clearHandle);
  }, [recentlyCompletedTaskId]);

  const collapseCreate = useCallback(() => {
    setCreateExpanded(false);
    setTitleDraft("");
    setSelectedProjectIdForCreate(skipProjectStep ? (projects[0]?.id ?? "") : "");
    setSelectedAssigneeIdForCreate(currentUserId);
  }, [currentUserId, projects, skipProjectStep]);

  function expandCreate() {
    setCreateExpanded(true);
    setSelectedAssigneeIdForCreate(currentUserId);
    if (skipProjectStep && projects[0]) {
      setSelectedProjectIdForCreate(projects[0].id);
    } else {
      setSelectedProjectIdForCreate("");
    }
    setTitleDraft("");
  }

  async function createTask() {
    const title = titleDraft.trim();
    const projectId = selectedProjectIdForCreate;
    if (!title || !projectId || !teamId) return;

    const assigneeUserId =
      selectedAssigneeIdForCreate === UNASSIGNED_ASSIGNEE_VALUE
        ? undefined
        : selectedAssigneeIdForCreate;

    const created = await agencyOps.createProjectTask({
      teamId,
      projectId,
      title,
      assigneeUserId,
    });

    if (created) {
      collapseCreate();
    }
  }

  async function updateTaskStatus(task: AgencyProjectTask, status: TaskStatus) {
    if (status === "done") {
      setDoneExpanded(true);
      setRecentlyCompletedTaskId(task.id);
    }
    await agencyOps.updateProjectTask({
      teamId,
      taskId: task.id,
      status,
    });
  }

  function setClientExpanded(clientId: string, expanded: boolean) {
    setCollapsedClients((previous) => {
      const next = new Set(previous);
      if (expanded) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  }

  if (!currentUserId) {
    return (
      <section className={agencyTaskRailClass}>
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <ListChecks className="size-6 text-muted" aria-hidden />
          <p className="mt-3 text-xs text-muted">Sign in to view your tasks.</p>
        </div>
      </section>
    );
  }

  if (collapsed) {
    return (
      <section className={cn(agencyTaskRailClass, "items-center gap-3 px-2 py-3")}>
        <button
          type="button"
          className={cn(
            "flex size-11 items-center justify-center rounded-xl border border-default bg-default text-muted transition-colors hover:bg-elevated hover:text-highlighted",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
          )}
          aria-label="Expand task list"
          onClick={() => onCollapsedChange(false)}
        >
          <PanelLeftOpen className="size-4" />
        </button>

        <div className="flex flex-col items-center gap-2" title="My tasks">
          <ListChecks className="size-4 text-muted" aria-hidden />
          <AgencyTaskRailSummary compact total={totalCount} done={doneCount} left={activeCount} />
        </div>
      </section>
    );
  }

  const isLoading = activeTasksQuery.isPending;

  return (
    <section className={agencyTaskRailClass}>
      <AgencyTaskRailSummary
        total={totalCount}
        done={doneCount}
        left={activeCount}
        onCollapse={() => onCollapsedChange(true)}
      />

      {isLoading ? (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
          {[1, 2, 3].map((rowIndex) => (
            <div key={rowIndex} className="space-y-2">
              <Skeleton className="h-8 w-full rounded-lg" />
              <Skeleton className="ml-2 h-14 rounded-lg" />
            </div>
          ))}
        </div>
      ) : activeTasksQuery.isError ? (
        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center"
          role="alert"
        >
          <AlertTriangle className="size-5 text-error" aria-hidden />
          <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load tasks.</p>
          <p className="mt-1 text-xs text-muted">
            {getErrorMessage(activeTasksQuery.error, "Try refreshing.")}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => void activeTasksQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : activeTasks.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-6 text-center">
          <ListChecks className="size-6 text-muted" aria-hidden />
          <p className="mt-3 text-xs text-muted">No tasks assigned to you.</p>
          <p className="mt-1 text-xs text-muted">Add one below to get started.</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto" aria-label="My tasks">
          {clientGroups.map((group) => (
            <AgencyTaskClientGroup
              key={group.clientId}
              clientName={group.clientName}
              tasks={group.tasks}
              expanded={!collapsedClients.has(group.clientId)}
              projects={projects}
              teamId={teamId}
              selectedTaskId={selectedTaskId}
              onExpandedChange={(expanded) => setClientExpanded(group.clientId, expanded)}
              onSelect={onSelect}
              onSelectProject={onSelectProject}
              onStatusChange={(nextTask, status) => void updateTaskStatus(nextTask, status)}
            />
          ))}
        </div>
      )}

      <AgencyTaskCreateInline
        expanded={createExpanded}
        skipProjectStep={skipProjectStep}
        projects={projects}
        members={members}
        titleSuggestionTasks={titleSuggestionTasks}
        titleDraft={titleDraft}
        selectedProjectId={selectedProjectIdForCreate}
        selectedAssigneeId={selectedAssigneeIdForCreate}
        disabled={!teamId || membersQuery.isPending}
        isCreatingTask={isCreatingTask}
        onExpand={expandCreate}
        onCollapse={collapseCreate}
        onTitleChange={setTitleDraft}
        onProjectChange={setSelectedProjectIdForCreate}
        onAssigneeChange={setSelectedAssigneeIdForCreate}
        onSubmit={() => void createTask()}
      />

      <div className="shrink-0 border-t border-default">
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-between px-4 py-2 text-xs transition-colors hover:bg-default/60",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
          )}
          aria-expanded={doneExpanded}
          aria-controls={donePanelId}
          onClick={() => setDoneExpanded((open) => !open)}
        >
          <span className="font-semibold text-muted">Done</span>
          <span className="flex items-center gap-1.5">
            <span className={cn(agencyMetricClass, "text-[11px] text-muted")}>
              {doneCount === null ? "—" : doneCount}
            </span>
            <ChevronDown
              className={cn(
                "size-3.5 text-muted motion-safe:transition-transform motion-safe:duration-200",
                doneExpanded && "rotate-180",
              )}
              aria-hidden
            />
          </span>
        </button>

        {doneExpanded ? (
          <div id={donePanelId}>
            {doneTasksQuery.isPending ? (
              <div className="space-y-2 border-t border-default px-3 py-2">
                {[1, 2].map((rowIndex) => (
                  <Skeleton key={rowIndex} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : doneTasksQuery.isError ? (
              <div className="border-t border-default px-4 py-3 text-center" role="alert">
                <p className="text-xs text-muted">
                  {getErrorMessage(doneTasksQuery.error, "Couldn't load done tasks.")}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={() => void doneTasksQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : doneTasks.length === 0 ? (
              <div className="border-t border-default px-4 py-3 text-center">
                <p className="text-xs text-muted">Nothing completed yet.</p>
              </div>
            ) : (
              <ul className="max-h-48 overflow-y-auto border-t border-default" aria-label="Done tasks">
                {doneTasks.map((task) => (
                  <AgencyTaskRowWithPending
                    key={task.id}
                    task={task}
                    projects={projects}
                    teamId={teamId}
                    selectedTaskId={selectedTaskId}
                    highlight={recentlyCompletedTaskId === task.id}
                    readOnly
                    onSelect={onSelect}
                    onSelectProject={onSelectProject}
                  />
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
