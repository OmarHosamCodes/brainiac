import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ListChecks, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AgencyMiniTimer } from "@/components/agency/agency-mini-timer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { withAgencyLiveQueryOptions } from "@/lib/utils/agency-query-options";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  selectIsTaskMutationPending,
  useAgencyOpsStore,
} from "@/stores/agency-ops";

type Project = {
  id: string;
  clientName: string;
  name: string;
};

type AgencyProjectTask = {
  id: string;
  teamId: string;
  projectId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "archived";
  assigneeUserId: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  dueDate: string | null;
};

type TaskStatus = AgencyProjectTask["status"];

const ALL_ASSIGNEES_VALUE = "__all_assignees__";
const ALL_PROJECTS_VALUE = "__all_projects__";
const UNASSIGNED_ASSIGNEE_VALUE = "__unassigned__";

type AgencyTaskListProps = {
  teamId: string;
  projects: Project[];
  selectedTaskId: string;
  onSelect: (taskId: string) => void;
  onSelectProject: (projectId: string) => void;
};

const STATUS_OPTIONS: Array<{ label: string; value: TaskStatus }> = [
  { label: "Open", value: "open" },
  { label: "In progress", value: "in_progress" },
  { label: "Done", value: "done" },
  { label: "Archived", value: "archived" },
];

function statusDotColor(status: string) {
  switch (status) {
    case "open":
      return "bg-muted";
    case "in_progress":
      return "bg-primary";
    case "done":
      return "bg-success";
    case "archived":
      return "bg-muted";
    default:
      return "bg-muted";
  }
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function toDueDateIso(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T12:00:00.000Z`).toISOString();
}

function formatDueDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return date.setHours(23, 59, 59, 999) < Date.now();
}

function getProjectHue(projectId: string, projects: Project[]) {
  const index = projects.findIndex((p) => p.id === projectId);
  if (index === -1) return "bg-neutral-400";
  const hues = [
    "bg-rose-400",
    "bg-amber-400",
    "bg-emerald-400",
    "bg-sky-400",
    "bg-violet-400",
    "bg-fuchsia-400",
  ];
  return hues[index % hues.length];
}

export function AgencyTaskList({
  teamId,
  projects,
  selectedTaskId,
  onSelect,
}: AgencyTaskListProps) {
  const agencyOps = useAgencyOpsStore();
  const isTaskMutationPending = useAgencyOpsStore(selectIsTaskMutationPending);
  const session = authClient.useSession();
  const currentUserId = session.data?.user?.id ?? "";

  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>(["open", "in_progress"]);
  const [assigneeFilter, setAssigneeFilter] = useState(ALL_ASSIGNEES_VALUE);
  const [projectFilter, setProjectFilter] = useState(ALL_PROJECTS_VALUE);
  const [search, setSearch] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [selectedProjectIdForCreate, setSelectedProjectIdForCreate] = useState("");

  useEffect(() => {
    if (currentUserId && assigneeFilter === ALL_ASSIGNEES_VALUE) {
      setAssigneeFilter(currentUserId);
    }
  }, [currentUserId, assigneeFilter]);

  const selectedStatusFilter = statusFilter.length > 0 ? statusFilter : undefined;
  const selectedAssigneeFilter =
    assigneeFilter === ALL_ASSIGNEES_VALUE ? undefined : assigneeFilter;

  const membersQuery = useQuery(
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.taskThreads.members.list.queryOptions({ input: { teamId } }),
      enabled: Boolean(teamId),
    }),
  );

  const tasksQuery = useQuery(
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.projectTasks.list.queryOptions({
        input: {
          teamId,
          statuses: selectedStatusFilter,
          assigneeUserId: selectedAssigneeFilter,
          search: search || undefined,
        },
      }),
      enabled: Boolean(teamId),
    }),
  );

  const tasksQueryKey = orpc.agencyOps.projectTasks.list.queryOptions({
    input: {
      teamId,
      statuses: selectedStatusFilter,
      assigneeUserId: selectedAssigneeFilter,
      search: search || undefined,
    },
  }).queryKey;

  useEffect(() => {
    if (!teamId) return;
    agencyOps.registerProjectTasksQuery({ queryKey: tasksQueryKey, teamId });
    return () => agencyOps.unregisterProjectTasksQuery(tasksQueryKey);
  }, [teamId, tasksQueryKey, agencyOps]);

  const tasks = useMemo(() => {
    let items = tasksQuery.data?.items ?? [];
    if (projectFilter !== ALL_PROJECTS_VALUE) {
      items = items.filter((t) => t.projectId === projectFilter);
    }
    return items;
  }, [tasksQuery.data?.items, projectFilter]);

  const members = membersQuery.data?.items ?? [];

  async function createTask() {
    const title = titleDraft.trim();
    const projectId = selectedProjectIdForCreate;
    if (!title || !projectId || !teamId) return;

    setTitleDraft("");
    setSelectedProjectIdForCreate("");

    await agencyOps.createProjectTask({ teamId, projectId, title });
  }

  async function updateTask(
    task: AgencyProjectTask,
    patch: Partial<Pick<AgencyProjectTask, "status" | "assigneeUserId" | "dueDate">>,
  ) {
    try {
      await agencyOps.updateProjectTask({
        teamId,
        taskId: task.id,
        ...patch,
      });
    } catch {
      // Store surfaces the toast.
    }
  }

  return (
    <section className="flex h-full flex-col rounded-2xl border border-default bg-default">
      <header className="border-b border-default px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks"
              className="pl-9"
            />
          </div>
          <select
            multiple
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                Array.from(e.target.selectedOptions).map((opt) => opt.value as TaskStatus),
              )
            }
            className="h-9 w-36 rounded-md border border-default bg-background px-2 text-xs"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-9 w-32 rounded-md border border-default bg-background px-2 text-xs"
          >
            <option value={ALL_ASSIGNEES_VALUE}>All assignees</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.userName}
              </option>
            ))}
          </select>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="h-9 w-40 rounded-md border border-default bg-background px-2 text-xs"
          >
            <option value={ALL_PROJECTS_VALUE}>All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.clientName} · {project.name}
              </option>
            ))}
          </select>
        </div>

        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void createTask();
          }}
        >
          <select
            value={selectedProjectIdForCreate}
            onChange={(e) => setSelectedProjectIdForCreate(e.target.value)}
            className="h-9 w-40 rounded-md border border-default bg-background px-2 text-xs"
          >
            <option value="">Project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.clientName} · {project.name}
              </option>
            ))}
          </select>
          <Input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            placeholder="Add a task"
            className="min-w-0 flex-1"
          />
          <Button
            type="submit"
            size="sm"
            aria-label="Add task"
            disabled={!titleDraft.trim() || !selectedProjectIdForCreate || isTaskMutationPending}
          >
            <Plus />
          </Button>
        </form>
      </header>

      {tasksQuery.isPending ? (
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {[1, 2, 3, 4, 5].map((rowIndex) => (
            <Skeleton key={rowIndex} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : tasksQuery.isError ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center" role="alert">
          <AlertTriangle className="size-5 text-error" />
          <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load tasks.</p>
          <p className="mt-1 text-xs text-muted">
            {getErrorMessage(tasksQuery.error, "Try refreshing.")}
          </p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => void tasksQuery.refetch()}>
            Retry
          </Button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <ListChecks className="size-6 text-muted" />
          <p className="mt-3 text-xs text-muted">No tasks match your filters.</p>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-default overflow-y-auto" role="listbox" aria-label="Tasks">
          {tasks.map((task) => (
            <li
              key={task.id}
              role="option"
              aria-selected={task.id === selectedTaskId}
              className={[
                "cursor-pointer px-4 py-3 transition-colors hover:bg-elevated/50 focus-visible:bg-elevated/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20 focus-visible:ring-inset",
                task.id === selectedTaskId ? "bg-primary/5" : "",
              ].join(" ")}
              tabIndex={0}
              onClick={() => onSelect(task.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(task.id);
                }
              }}
            >
              <div className="flex items-start gap-3">
                <span
                  className={["mt-1.5 size-2 shrink-0 rounded-full", statusDotColor(task.status)].join(
                    " ",
                  )}
                  title={task.status}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-highlighted">{task.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <span
                        className={["size-1.5 rounded-full", getProjectHue(task.projectId, projects)].join(
                          " ",
                        )}
                      />
                      {projects.find((p) => p.id === task.projectId)?.name ?? "Project"}
                    </span>
                    {task.assigneeName ? (
                      <span className="inline-flex items-center gap-1 truncate">
                        · {task.assigneeName}
                      </span>
                    ) : null}
                    {task.dueDate ? (
                      <span className={isOverdue(task.dueDate) ? "text-error" : ""}>
                        · {formatDueDate(task.dueDate)}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={task.status}
                      disabled={isTaskMutationPending}
                      onChange={(e) =>
                        void updateTask(task, {
                          status: e.target.value as AgencyProjectTask["status"],
                        })
                      }
                      className="h-8 rounded-md border border-default bg-background px-1 text-[11px]"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={task.assigneeUserId ?? UNASSIGNED_ASSIGNEE_VALUE}
                      disabled={membersQuery.isPending || isTaskMutationPending}
                      onChange={(e) =>
                        void updateTask(task, {
                          assigneeUserId:
                            e.target.value === UNASSIGNED_ASSIGNEE_VALUE ? null : e.target.value,
                        })
                      }
                      className="h-8 rounded-md border border-default bg-background px-1 text-[11px]"
                    >
                      <option value={UNASSIGNED_ASSIGNEE_VALUE}>Unassigned</option>
                      {members.map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.userName}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="date"
                      value={toDateInputValue(task.dueDate)}
                      disabled={isTaskMutationPending}
                      onChange={(e) =>
                        void updateTask(task, { dueDate: toDueDateIso(e.target.value) })
                      }
                      className="h-8 px-1 text-[11px]"
                    />
                    <div onClick={(e) => e.stopPropagation()}>
                      <AgencyMiniTimer
                        teamId={teamId}
                        taskId={task.id}
                        projectId={task.projectId}
                        taskTitle={task.title}
                        projectName={projects.find((p) => p.id === task.projectId)?.name}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
