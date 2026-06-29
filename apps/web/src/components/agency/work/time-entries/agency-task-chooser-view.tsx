import { ChevronDown, ListChecks, Search } from "lucide-react";

import { AgencyProjectHueDot } from "@/components/agency/agency-project-hue-dot";
import { AgencyTimeEntryProjectLabel } from "@/components/agency/agency-time-entry-project-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgencyTaskChooserViewModel } from "@/lib/agency/work/hooks/use-agency-task-chooser";
import { agencyFocusRingClass, agencyInputPlaceholderClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTaskChooserViewProps = {
  view: AgencyTaskChooserViewModel;
};

export function AgencyTaskChooserView({ view }: AgencyTaskChooserViewProps) {
  const {
    value,
    disabled,
    loading,
    placeholder,
    searchPlaceholder,
    className,
    contentAlign,
    triggerFormat,
    open,
    searchTerm,
    selectedProject,
    selectedLabel,
    groupedProjects,
    isProjectExpanded,
    onOpenChange,
    onSearchChange,
    onSelectTask,
    onToggleProject,
    statusLabel,
    statusDotClass,
    formatDueDate,
  } = view;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || loading}
          className={cn(
            "w-64 max-w-full justify-start",
            triggerFormat === "project-client" ? "gap-1" : "gap-2",
            className,
          )}
        >
          {triggerFormat === "project-client" ? (
            loading ? (
              <span className="min-w-0 truncate text-dimmed">Loading…</span>
            ) : selectedProject ? (
              <AgencyTimeEntryProjectLabel
                projectId={selectedProject.id}
                projectName={selectedProject.name}
                clientName={selectedProject.clientName}
                className="min-w-0"
              />
            ) : (
              <span className="min-w-0 truncate text-dimmed">{placeholder}</span>
            )
          ) : (
            <>
              <ListChecks className="size-4 shrink-0 text-muted" />
              <span className={cn("min-w-0 truncate", selectedLabel ? "" : "text-dimmed")}>
                {loading ? "Loading…" : selectedLabel || placeholder}
              </span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align={contentAlign} className="w-[22rem] max-w-[calc(100vw-2rem)] p-0">
        <div className="border-b border-default bg-elevated p-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
            <Input
              autoFocus
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className={cn(
                "h-9 rounded-lg border-default bg-default pl-8 text-sm",
                agencyInputPlaceholderClass,
              )}
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
                  const expanded = isProjectExpanded(project.id);
                  return (
                    <div key={project.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 px-4 py-1.5 text-left text-sm transition-colors hover:bg-default/70",
                          agencyFocusRingClass,
                          "motion-reduce:transition-none",
                        )}
                        onClick={() => onToggleProject(project.id)}
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
                                onClick={() => onSelectTask(task.id)}
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
