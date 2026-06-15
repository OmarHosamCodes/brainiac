import { ListChecks, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
}: AgencyTaskChooserProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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

  const groupedItems = useMemo(() => {
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

    const items: Array<
      | { kind: "client"; label: string }
      | { kind: "project"; label: string }
      | { kind: "task"; task: AgencyTask; project: Project }
    > = [];

    let currentClientName = "";

    for (const project of sortedProjects) {
      if (project.clientName !== currentClientName) {
        currentClientName = project.clientName;
        items.push({ kind: "client", label: project.clientName });
      }

      items.push({ kind: "project", label: project.name });

      for (const task of [...(tasksByProject.get(project.id) ?? [])].sort((left, right) =>
        left.title.localeCompare(right.title),
      )) {
        items.push({ kind: "task", task, project });
      }
    }

    return items;
  }, [filteredTasks, projects]);

  function selectTask(taskId: string) {
    onValueChange(taskId);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || loading}
          className={["w-64 max-w-full justify-start gap-2", className].filter(Boolean).join(" ")}
        >
          <ListChecks className="size-4 shrink-0 text-muted" />
          <span className={selectedLabel ? "truncate" : "truncate text-dimmed"}>
            {loading ? "Loading…" : selectedLabel || placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[34rem] min-w-[20rem] max-w-[calc(100vw-2rem)] p-0">
        <div className="border-b border-default p-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {groupedItems.length === 0 ? (
            <p className="p-4 text-xs text-muted">
              {searchTerm.trim()
                ? "No matching active tasks."
                : "No open or in-progress tasks."}
            </p>
          ) : (
            groupedItems.map((item, index) => {
              if (item.kind === "client") {
                return (
                  <p
                    key={`client-${item.label}-${index}`}
                    className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted first:pt-1"
                  >
                    {item.label}
                  </p>
                );
              }

              if (item.kind === "project") {
                return (
                  <p
                    key={`project-${item.label}-${index}`}
                    className="px-3 py-1 text-[11px] font-semibold text-highlighted"
                  >
                    {item.label}
                  </p>
                );
              }

              const { task } = item;
              return (
                <button
                  key={task.id}
                  type="button"
                  className="mx-1 flex w-[calc(100%-0.5rem)] rounded-lg py-2 ps-6 pe-2 text-left transition-colors hover:bg-elevated/70"
                  onClick={() => selectTask(task.id)}
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={["size-1.5 shrink-0 rounded-full", statusDotClass(task.status)].join(
                          " ",
                        )}
                      />
                      <span className="truncate text-sm font-semibold text-highlighted">
                        {task.title}
                      </span>
                    </div>
                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
                      <span>{statusLabel(task.status)}</span>
                      {task.assigneeName ? (
                        <span className="truncate">{task.assigneeName}</span>
                      ) : null}
                      {formatDueDate(task.dueDate) ? (
                        <span>Due {formatDueDate(task.dueDate)}</span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
