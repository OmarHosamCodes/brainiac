import { ChevronDown, ListChecks, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AgencyProjectHueDot } from "@/components/agency/agency-project-hue-dot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

type Project = {
  id: string;
  clientName: string;
  name: string;
};

type TaskStatus = "open" | "in_progress" | "done" | "archived";

type AgencyTask = {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  assigneeName?: string | null;
  dueDate?: string | null;
};

type AgencyTaskChooserProps = {
  value: string;
  onValueChange: (value: string) => void;
  projects: Project[];
  tasks: AgencyTask[];
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentAlign?: "start" | "center" | "end";
};

function statusLabel(status: TaskStatus | undefined) {
  switch (status) {
    case "in_progress":
      return "In progress";
    case "done":
      return "Done";
    case "archived":
      return "Archived";
    case "open":
    default:
      return "Open";
  }
}

function statusDotClass(status: TaskStatus | undefined) {
  switch (status) {
    case "in_progress":
      return "bg-primary";
    case "done":
      return "bg-success";
    case "archived":
      return "bg-muted";
    case "open":
    default:
      return "bg-muted";
  }
}

function formatDueDate(iso: string | null | undefined) {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function AgencyTaskChooser({
  value,
  onValueChange,
  projects,
  tasks,
  disabled = false,
  loading = false,
  placeholder = "Task",
  searchPlaceholder = "Search tasks, projects, or clients",
  className,
  open: controlledOpen,
  onOpenChange,
  contentAlign = "start",
}: AgencyTaskChooserProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const open = controlledOpen ?? uncontrolledOpen;

  function setOpen(nextOpen: boolean) {
    onOpenChange?.(nextOpen);
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }
  }

  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === value) ?? null,
    [tasks, value],
  );

  const selectedProject = useMemo(
    () => (selectedTask ? (projectsById.get(selectedTask.projectId) ?? null) : null),
    [projectsById, selectedTask],
  );

  const selectedLabel = useMemo(() => {
    if (!selectedTask) return "";
    if (!selectedProject) return selectedTask.title;
    return `${selectedTask.title} · ${selectedProject.name}`;
  }, [selectedProject, selectedTask]);

  const filteredTasks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return tasks;

    return tasks.filter((task) => {
      const project = projectsById.get(task.projectId);
      const searchableText = [
        task.title,
        task.status,
        task.assigneeName ?? "",
        project?.name ?? "",
        project?.clientName ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [projectsById, searchTerm, tasks]);

  const groupedProjects = useMemo(() => {
    const tasksByProject = new Map<string, AgencyTask[]>();

    for (const task of filteredTasks) {
      const existing = tasksByProject.get(task.projectId) ?? [];
      existing.push(task);
      tasksByProject.set(task.projectId, existing);
    }

    const sortedProjects = projects
      .filter((project) => tasksByProject.has(project.id))
      .sort((left, right) => {
        const clientSort = left.clientName.localeCompare(right.clientName);
        return clientSort || left.name.localeCompare(right.name);
      });

    const clientGroups: Array<{
      clientName: string;
      projects: Array<{ project: Project; tasks: AgencyTask[] }>;
    }> = [];
    let currentGroup: (typeof clientGroups)[number] | null = null;

    for (const project of sortedProjects) {
      if (!currentGroup || currentGroup.clientName !== project.clientName) {
        currentGroup = { clientName: project.clientName, projects: [] };
        clientGroups.push(currentGroup);
      }

      currentGroup.projects.push({
        project,
        tasks: [...(tasksByProject.get(project.id) ?? [])].sort((left, right) =>
          left.title.localeCompare(right.title),
        ),
      });
    }

    return clientGroups;
  }, [filteredTasks, projects]);

  const selectedProjectId = selectedTask?.projectId ?? "";
  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(() => new Set());
  const searchIsActive = searchTerm.trim().length > 0;

  useEffect(() => {
    if (!open) return;
    if (selectedProjectId) {
      setExpandedProjectIds((current) => {
        if (current.has(selectedProjectId)) return current;
        const next = new Set(current);
        next.add(selectedProjectId);
        return next;
      });
    }
  }, [open, selectedProjectId]);

  function selectTask(taskId: string) {
    onValueChange(taskId);
    setOpen(false);
  }

  function toggleProject(projectId: string) {
    setExpandedProjectIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || loading}
          className={cn("w-64 max-w-full justify-start gap-2", className)}
        >
          <ListChecks className="size-4 shrink-0 text-muted" />
          <span className={cn("min-w-0 truncate", selectedLabel ? "" : "text-dimmed")}>
            {loading ? "Loading…" : selectedLabel || placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={contentAlign} className="w-[22rem] max-w-[calc(100vw-2rem)] p-0">
        <div className="border-b border-default bg-elevated p-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
            <Input
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 rounded-lg border-default bg-default pl-8 text-sm placeholder:text-muted"
            />
          </div>
        </div>
        <div className="max-h-[24rem] overflow-y-auto bg-elevated py-2">
          {loading ? (
            <div className="space-y-2 px-3 py-1">
              {[1, 2, 3, 4, 5].map((rowIndex) => (
                <Skeleton key={rowIndex} className="h-7 rounded-lg" />
              ))}
            </div>
          ) : groupedProjects.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted">
              {searchTerm.trim() ? "No matching active tasks." : "No open or in-progress tasks."}
            </p>
          ) : (
            groupedProjects.map((group) => (
              <div key={group.clientName} className="py-1 first:pt-0">
                <div className="mb-1 flex items-center justify-between px-4 text-[11px] font-semibold text-muted">
                  <span className="uppercase tracking-[0.12em]">{group.clientName}</span>
                  <span className="font-mono tabular-nums">
                    {group.projects.reduce((total, entry) => total + entry.tasks.length, 0)} Tasks
                  </span>
                </div>

                {group.projects.map(({ project, tasks: projectTasks }) => {
                  const expanded = searchIsActive || expandedProjectIds.has(project.id);
                  return (
                    <div key={project.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 px-4 py-1.5 text-left text-sm transition-colors hover:bg-default/70",
                          agencyFocusRingClass,
                          "motion-reduce:transition-none",
                        )}
                        onClick={() => toggleProject(project.id)}
                        aria-expanded={expanded}
                      >
                        <AgencyProjectHueDot projectId={project.id} className="size-1.5" />
                        <span className="min-w-0 flex-1 truncate font-medium text-highlighted">
                          {project.name}
                        </span>
                        <span className="truncate text-xs text-muted">{project.clientName}</span>
                        <span className="ml-1 shrink-0 font-mono text-xs tabular-nums text-muted">
                          {projectTasks.length} {projectTasks.length === 1 ? "Task" : "Tasks"}
                        </span>
                        <ChevronDown
                          className={cn(
                            "size-3.5 shrink-0 text-muted transition-transform duration-200 motion-reduce:transition-none",
                            expanded && "rotate-180",
                          )}
                          aria-hidden
                        />
                      </button>

                      {expanded ? (
                        <div className="pb-1">
                          {projectTasks.map((task) => {
                            const selected = task.id === value;
                            return (
                              <button
                                key={task.id}
                                type="button"
                                className={cn(
                                  "group mx-2 flex w-[calc(100%-1rem)] items-start gap-2 rounded-lg py-1.5 pr-2 pl-7 text-left transition-colors hover:bg-default/80",
                                  selected && "bg-primary/10 hover:bg-primary/10",
                                  agencyFocusRingClass,
                                  "motion-reduce:transition-none",
                                )}
                                onClick={() => selectTask(task.id)}
                              >
                                <span
                                  className={[
                                    "mt-1.5 size-1.5 shrink-0 rounded-full",
                                    statusDotClass(task.status),
                                  ].join(" ")}
                                />
                                <span className="min-w-0 flex-1">
                                  <span
                                    className={cn(
                                      "block truncate text-xs font-semibold",
                                      selected ? "text-primary" : "text-highlighted",
                                    )}
                                  >
                                    {task.title}
                                  </span>
                                  <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
                                    <span>{statusLabel(task.status)}</span>
                                    {task.assigneeName ? (
                                      <span className="truncate">{task.assigneeName}</span>
                                    ) : null}
                                    {formatDueDate(task.dueDate) ? (
                                      <span>Due {formatDueDate(task.dueDate)}</span>
                                    ) : null}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
