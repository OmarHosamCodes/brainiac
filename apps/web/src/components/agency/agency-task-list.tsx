import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, ListChecks, Plus } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { AgencyMiniTimer } from "@/components/agency/agency-mini-timer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgencyProjectTasksQuery } from "@/hooks/use-agency-queries";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { withAgencySyncQueryOptions } from "@/lib/utils/agency-query-options";
import { agencyFocusRingClass, agencyLabelClass, agencyMetricClass } from "@/lib/utils/agency-ui";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  selectIsCreatingTask,
  selectIsTaskRowPending,
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

type AgencyTaskListProps = {
  teamId: string;
  projects: Project[];
  selectedTaskId: string;
  onSelect: (taskId: string) => void;
  onSelectProject: (projectId: string) => void;
};

const UNASSIGNED_ASSIGNEE_VALUE = "__unassigned__";

type CreateStep = "project" | "name" | "assignee" | "confirm";

type TeamMember = {
  userId: string;
  userName: string;
};

const CREATE_STEP_LABELS: Record<CreateStep, string> = {
  project: "Task",
  name: "Name",
  assignee: "Assignee",
  confirm: "Confirm",
};

function createStepOrder(skipProject: boolean): CreateStep[] {
  return skipProject
    ? ["name", "assignee", "confirm"]
    : ["project", "name", "assignee", "confirm"];
}

function firstCreateStep(skipProject: boolean): CreateStep {
  return skipProject ? "name" : "project";
}

const ACTIVE_STATUS_OPTIONS: Array<{ label: string; value: TaskStatus }> = [
  { label: "Open", value: "open" },
  { label: "In progress", value: "in_progress" },
  { label: "Done", value: "done" },
];

const agencySelectClass =
  "h-8 min-w-0 flex-1 rounded-md border border-default bg-background px-2 text-xs";

const rowInteractiveClass = [
  "w-full rounded-md px-1 py-0.5 text-left transition-colors",
  "hover:bg-elevated/40",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
].join(" ");

function statusDotColor(status: TaskStatus) {
  switch (status) {
    case "open":
      return "bg-muted";
    case "in_progress":
      return "bg-primary";
    case "done":
      return "bg-success";
    case "archived":
      return "bg-muted";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function statusLabel(status: TaskStatus) {
  switch (status) {
    case "open":
      return "Open";
    case "in_progress":
      return "In progress";
    case "done":
      return "Done";
    case "archived":
      return "Archived";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
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
  if (index === -1) return "bg-muted";
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

function AgencyTaskSectionHeader({
  label,
  count,
}: {
  label: string;
  count: number | null;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-default px-4 py-2">
      <p className={agencyLabelClass}>{label}</p>
      <span className={[agencyMetricClass, "text-xs text-muted"].join(" ")}>
        {count === null ? "—" : count}
      </span>
    </div>
  );
}

type AgencyTaskRowProps = {
  task: AgencyProjectTask;
  projects: Project[];
  teamId: string;
  selectedTaskId: string;
  readOnly?: boolean;
  isRowPending: boolean;
  onSelect: (taskId: string) => void;
  onStatusChange?: (task: AgencyProjectTask, status: TaskStatus) => void;
};

function AgencyTaskRow({
  task,
  projects,
  teamId,
  selectedTaskId,
  readOnly = false,
  isRowPending,
  onSelect,
  onStatusChange,
}: AgencyTaskRowProps) {
  const projectName = projects.find((p) => p.id === task.projectId)?.name ?? "Project";
  const isSelected = task.id === selectedTaskId;

  return (
    <li
      className={[
        "border-b border-default last:border-b-0",
        isSelected ? "bg-primary/5" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span
          className={["mt-1.5 size-2 shrink-0 rounded-full", statusDotColor(task.status)].join(" ")}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            className={rowInteractiveClass}
            aria-current={isSelected ? "true" : undefined}
            onClick={() => onSelect(task.id)}
          >
            <p className="truncate text-sm font-bold text-highlighted">{task.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <span
                  className={["size-1.5 rounded-full", getProjectHue(task.projectId, projects)].join(
                    " ",
                  )}
                  aria-hidden
                />
                {projectName}
              </span>
              {task.dueDate ? (
                <span className={isOverdue(task.dueDate) ? "text-error" : ""}>
                  · Due {formatDueDate(task.dueDate)}
                </span>
              ) : null}
            </div>
          </button>
          {!readOnly ? (
            <div className="mt-2 flex items-center gap-2">
              <select
                value={task.status}
                disabled={isRowPending}
                onChange={(e) =>
                  onStatusChange?.(task, e.target.value as AgencyProjectTask["status"])
                }
                className={agencySelectClass}
                aria-label={`Status for ${task.title}`}
              >
                {ACTIVE_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <AgencyMiniTimer
                teamId={teamId}
                taskId={task.id}
                projectId={task.projectId}
                taskTitle={task.title}
                projectName={projectName}
              />
            </div>
          ) : (
            <p className="mt-1 text-xs text-muted">{statusLabel(task.status)}</p>
          )}
        </div>
      </div>
    </li>
  );
}

type AgencyTaskCreateZoneProps = {
  expanded: boolean;
  step: CreateStep;
  skipProjectStep: boolean;
  projects: Project[];
  members: TeamMember[];
  titleDraft: string;
  selectedProjectId: string;
  selectedAssigneeId: string;
  disabled: boolean;
  isCreatingTask: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onStepChange: (step: CreateStep) => void;
  onTitleChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  onAssigneeChange: (value: string) => void;
  onSubmit: () => void;
};

function AgencyTaskCreateZone({
  expanded,
  step,
  skipProjectStep,
  projects,
  members,
  titleDraft,
  selectedProjectId,
  selectedAssigneeId,
  disabled,
  isCreatingTask,
  onExpand,
  onCollapse,
  onStepChange,
  onTitleChange,
  onProjectChange,
  onAssigneeChange,
  onSubmit,
}: AgencyTaskCreateZoneProps) {
  const projectSelectRef = useRef<HTMLSelectElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const zoneId = useId();

  const steps = createStepOrder(skipProjectStep);
  const stepIndex = steps.indexOf(step);
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const assigneeLabel =
    selectedAssigneeId === UNASSIGNED_ASSIGNEE_VALUE
      ? "Unassigned"
      : (members.find((member) => member.userId === selectedAssigneeId)?.userName ?? "You");

  useEffect(() => {
    if (!expanded) return;

    if (step === "project") {
      projectSelectRef.current?.focus();
    } else if (step === "name") {
      titleInputRef.current?.focus();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCollapse();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded, step, onCollapse]);

  function goBack() {
    if (stepIndex <= 0) {
      onCollapse();
      return;
    }
    onStepChange(steps[stepIndex - 1]!);
  }

  function goNext() {
    if (step === "project" && !selectedProjectId) return;
    if (step === "name" && !titleDraft.trim()) return;
    if (step === "confirm") {
      onSubmit();
      return;
    }
    onStepChange(steps[stepIndex + 1]!);
  }

  const canAdvance =
    step === "project"
      ? Boolean(selectedProjectId)
      : step === "name"
        ? Boolean(titleDraft.trim())
        : true;

  if (!expanded) {
    return (
      <div className="shrink-0 border-y border-default">
        <button
          type="button"
          className={[
            "flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-muted",
            "transition-colors hover:bg-elevated/50 hover:text-highlighted",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
          ].join(" ")}
          onClick={onExpand}
          disabled={disabled}
          aria-controls={zoneId}
          aria-expanded={false}
        >
          <Plus className="size-4 shrink-0" aria-hidden />
          New task
        </button>
      </div>
    );
  }

  return (
    <div
      id={zoneId}
      role="region"
      aria-label="New task"
      className="shrink-0 border-y border-default px-4 py-3"
    >
      <p className={agencyLabelClass}>
        Step {stepIndex + 1} of {steps.length} · {CREATE_STEP_LABELS[step]}
      </p>

      <div className="mt-3 space-y-3">
        {step === "project" ? (
          <select
            ref={projectSelectRef}
            value={selectedProjectId}
            onChange={(e) => onProjectChange(e.target.value)}
            className="h-9 w-full rounded-md border border-default bg-background px-2 text-xs"
            aria-label="Project"
          >
            <option value="">Choose a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.clientName} · {project.name}
              </option>
            ))}
          </select>
        ) : null}

        {step === "name" ? (
          <Input
            ref={titleInputRef}
            value={titleDraft}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="What needs doing?"
            aria-label="Task name"
            onKeyDown={(event) => {
              if (event.key === "Enter" && titleDraft.trim()) {
                event.preventDefault();
                goNext();
              }
            }}
          />
        ) : null}

        {step === "assignee" ? (
          <select
            value={selectedAssigneeId}
            onChange={(e) => onAssigneeChange(e.target.value)}
            className="h-9 w-full rounded-md border border-default bg-background px-2 text-xs"
            aria-label="Assignee"
          >
            <option value={UNASSIGNED_ASSIGNEE_VALUE}>Unassigned</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.userName}
              </option>
            ))}
          </select>
        ) : null}

        {step === "confirm" ? (
          <dl className="space-y-2 rounded-lg border border-default bg-elevated/30 px-3 py-2 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Task</dt>
              <dd className="truncate text-right font-semibold text-highlighted">
                {selectedProject
                  ? `${selectedProject.clientName} · ${selectedProject.name}`
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Name</dt>
              <dd className="truncate text-right font-semibold text-highlighted">{titleDraft}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Assignee</dt>
              <dd className="truncate text-right font-semibold text-highlighted">{assigneeLabel}</dd>
            </div>
          </dl>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <Button type="button" variant="ghost" size="sm" className="text-xs text-muted" onClick={goBack}>
          {stepIndex === 0 ? "Cancel" : "Back"}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={
            !canAdvance ||
            isCreatingTask ||
            disabled ||
            (step === "confirm" && (!titleDraft.trim() || !selectedProjectId))
          }
          onClick={goNext}
        >
          {step === "confirm" ? (isCreatingTask ? "Adding…" : "Create task") : "Next"}
        </Button>
      </div>
    </div>
  );
}

function AgencyTaskRowWithPending({
  task,
  ...props
}: Omit<AgencyTaskRowProps, "isRowPending">) {
  const isRowPending = useAgencyOpsStore(selectIsTaskRowPending(task.id));
  return <AgencyTaskRow {...props} task={task} isRowPending={isRowPending} />;
}

const ACTIVE_TASK_STATUSES: TaskStatus[] = ["open", "in_progress"];
const DONE_TASK_STATUSES: TaskStatus[] = ["done"];

export function AgencyTaskList({
  teamId,
  projects,
  selectedTaskId,
  onSelect,
}: AgencyTaskListProps) {
  const agencyOps = useAgencyOpsStore();
  const isCreatingTask = useAgencyOpsStore(selectIsCreatingTask);
  const session = authClient.useSession();
  const currentUserId = session.data?.user?.id ?? "";
  const donePanelId = useId();

  const [createExpanded, setCreateExpanded] = useState(false);
  const [createStep, setCreateStep] = useState<CreateStep>("project");
  const [doneExpanded, setDoneExpanded] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [selectedProjectIdForCreate, setSelectedProjectIdForCreate] = useState("");
  const [selectedAssigneeIdForCreate, setSelectedAssigneeIdForCreate] = useState("");

  const skipProjectStep = projects.length === 1;

  const membersQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.taskThreads.members.list.queryOptions({ input: { teamId } }),
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

  const activeTasks = activeTasksQuery.data?.items ?? [];
  const doneTasks = doneTasksQuery.data?.items ?? [];

  const activeCount = activeTasksQuery.isPending ? null : activeTasks.length;
  const doneCount = doneTasksQuery.isPending ? null : doneTasks.length;

  const collapseCreate = useCallback(() => {
    setCreateExpanded(false);
    setCreateStep(firstCreateStep(skipProjectStep));
    setTitleDraft("");
    setSelectedProjectIdForCreate(skipProjectStep ? (projects[0]?.id ?? "") : "");
    setSelectedAssigneeIdForCreate(currentUserId);
  }, [currentUserId, projects, skipProjectStep]);

  function expandCreate() {
    setCreateExpanded(true);
    setCreateStep(firstCreateStep(skipProjectStep));
    setSelectedAssigneeIdForCreate(currentUserId);
    if (skipProjectStep) {
      setSelectedProjectIdForCreate(projects[0]!.id);
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
    try {
      await agencyOps.updateProjectTask({
        teamId,
        taskId: task.id,
        status,
      });
      if (status === "done") {
        setDoneExpanded(true);
      }
    } catch {
      // Store surfaces the toast.
    }
  }

  if (!currentUserId) {
    return (
      <section className="flex h-full flex-col rounded-2xl border border-default bg-default">
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <ListChecks className="size-6 text-muted" aria-hidden />
          <p className="mt-3 text-xs text-muted">Sign in to view your tasks.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full flex-col rounded-2xl border border-default bg-default">
      <AgencyTaskSectionHeader label="My tasks" count={activeCount} />

      {activeTasksQuery.isPending ? (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {[1, 2, 3, 4].map((rowIndex) => (
            <Skeleton key={rowIndex} className="h-16 rounded-xl" />
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
        <ul className="min-h-0 flex-1 overflow-y-auto" aria-label="My tasks">
          {activeTasks.map((task) => (
            <AgencyTaskRowWithPending
              key={task.id}
              task={task}
              projects={projects}
              teamId={teamId}
              selectedTaskId={selectedTaskId}
              onSelect={onSelect}
              onStatusChange={(nextTask, status) => void updateTaskStatus(nextTask, status)}
            />
          ))}
        </ul>
      )}

      <AgencyTaskCreateZone
        expanded={createExpanded}
        step={createStep}
        skipProjectStep={skipProjectStep}
        projects={projects}
        members={members}
        titleDraft={titleDraft}
        selectedProjectId={selectedProjectIdForCreate}
        selectedAssigneeId={selectedAssigneeIdForCreate}
        disabled={!teamId || membersQuery.isPending}
        isCreatingTask={isCreatingTask}
        onExpand={expandCreate}
        onCollapse={collapseCreate}
        onStepChange={setCreateStep}
        onTitleChange={setTitleDraft}
        onProjectChange={setSelectedProjectIdForCreate}
        onAssigneeChange={setSelectedAssigneeIdForCreate}
        onSubmit={() => void createTask()}
      />

      <div className="shrink-0 border-t border-default">
        <button
          type="button"
          className={[
            "flex w-full items-center justify-between px-4 py-2 transition-colors hover:bg-elevated/50",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
          ].join(" ")}
          aria-expanded={doneExpanded}
          aria-controls={donePanelId}
          onClick={() => setDoneExpanded((open) => !open)}
        >
          <span className={agencyLabelClass}>Done</span>
          <span className="flex items-center gap-2">
            <span className={[agencyMetricClass, "text-xs text-muted"].join(" ")}>
              {doneCount === null ? "—" : doneCount}
            </span>
            <ChevronDown
              className={[
                "size-4 text-muted",
                doneExpanded
                  ? "rotate-180 motion-safe:transition-transform motion-safe:duration-200"
                  : "motion-safe:transition-transform motion-safe:duration-200",
              ].join(" ")}
              aria-hidden
            />
          </span>
        </button>

        {doneExpanded ? (
          <div id={donePanelId}>
            {doneTasksQuery.isPending ? (
              <div className="space-y-2 border-t border-default px-4 py-3">
                {[1, 2].map((rowIndex) => (
                  <Skeleton key={rowIndex} className="h-12 rounded-xl" />
                ))}
              </div>
            ) : doneTasksQuery.isError ? (
              <div className="border-t border-default px-4 py-4 text-center" role="alert">
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
              <div className="border-t border-default px-4 py-4 text-center">
                <p className="text-xs text-muted">Nothing completed yet.</p>
              </div>
            ) : (
              <ul
                className="max-h-48 overflow-y-auto border-t border-default"
                aria-label="Done tasks"
              >
                {doneTasks.map((task) => (
                  <AgencyTaskRowWithPending
                    key={task.id}
                    task={task}
                    projects={projects}
                    teamId={teamId}
                    selectedTaskId={selectedTaskId}
                    readOnly
                    onSelect={onSelect}
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
