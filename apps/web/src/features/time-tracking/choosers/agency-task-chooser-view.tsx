import { ChevronDown, Plus, Search } from "lucide-react";
import type { KeyboardEvent } from "react";

import { AgencyProjectHueDot } from "@/features/shared/agency-project-hue-dot";
import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import { AgencyTimeEntryProjectLabel } from "@/features/time-tracking/entries/agency-time-entry-project-label";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Skeleton } from "@/ui/skeleton";
import type { AgencyTaskChooserViewModel } from "@/features/time-tracking/hooks/use-agency-task-chooser";
import { agencyFocusRingClass, agencyInputPlaceholderClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTaskChooserViewProps = {
  view: AgencyTaskChooserViewModel;
};

export function AgencyTaskChooserView({ view }: AgencyTaskChooserViewProps) {
  const {
    mode,
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
    triggerProject,
    triggerTaskTitle,
    groupedProjects,
    searchInputRef,
    createInputRef,
    listRef,
    isProjectExpanded,
    isProjectSelectedForCreate,
    creatingInProjectId,
    createInputValue,
    onOpenChange,
    onSearchChange,
    onSelectTask,
    onToggleProject,
    onStartCreateInProject,
    onCancelCreateInProject,
    onCreateInputChange,
    onConfirmCreateInProject,
    statusDotClass,
    highlightSearch,
  } = view;

  const isCreateMode = mode === "create";

  function renderHighlightedLabel(text: string) {
    if (!highlightSearch) return text;
    return <AgencySearchHighlight text={text} query={searchTerm} />;
  }

  function handleCreateInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "Enter":
        event.preventDefault();
        onConfirmCreateInProject();
        return;
      case "Escape":
        event.preventDefault();
        onCancelCreateInProject();
        return;
      default:
        return;
    }
  }

  function renderTriggerLabel() {
    if (loading) {
      return <span className="min-w-0 truncate text-muted">Loading…</span>;
    }
    if (triggerFormat === "task-client") {
      if (triggerProject && triggerTaskTitle) {
        return (
          <AgencyTimeEntryProjectLabel
            format="task-client"
            projectId={triggerProject.id}
            projectName={triggerProject.name}
            clientName={triggerProject.clientName}
            taskTitle={triggerTaskTitle}
            className="min-w-0"
          />
        );
      }
      if (triggerProject) {
        return (
          <AgencyTimeEntryProjectLabel
            format="project-client"
            projectId={triggerProject.id}
            projectName={triggerProject.name}
            clientName={triggerProject.clientName}
            className="min-w-0"
          />
        );
      }
      return <span className="min-w-0 truncate text-muted">{placeholder}</span>;
    }
    if (triggerFormat === "project-client") {
      if (triggerProject) {
        return (
          <AgencyTimeEntryProjectLabel
            projectId={triggerProject.id}
            projectName={triggerProject.name}
            clientName={triggerProject.clientName}
            className="min-w-0"
          />
        );
      }
      return <span className="min-w-0 truncate text-muted">{placeholder}</span>;
    }
    if (triggerTaskTitle) {
      return <span className="min-w-0 truncate">{triggerTaskTitle}</span>;
    }
    return <span className="min-w-0 truncate text-muted">{placeholder}</span>;
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || loading}
          className={cn(
            "w-64 max-w-full justify-start",
            triggerFormat === "task-only" ? "gap-2" : "gap-1",
            className,
          )}
        >
          {renderTriggerLabel()}
        </Button>
      </PopoverTrigger>
      <PopoverContent align={contentAlign} className="w-[22rem] max-w-[calc(100vw-2rem)] p-0">
        <div className="border-b border-white/10 p-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
            <Input
              ref={searchInputRef}
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
        <div ref={listRef} className="max-h-[24rem] overflow-y-auto py-2">
          {loading ? (
            <div className="space-y-2 px-3 py-1">
              {[1, 2, 3, 4, 5].map((rowIndex) => (
                <Skeleton key={rowIndex} className="h-7 rounded-lg" />
              ))}
            </div>
          ) : groupedProjects.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted">
              {searchTerm.trim()
                ? isCreateMode
                  ? "No matching projects or tasks."
                  : "No matching active tasks."
                : isCreateMode
                  ? "Choose a project for this task."
                  : "No open or in-progress tasks."}
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
                  const projectSelected = isProjectSelectedForCreate(project.id);
                  const creatingHere = creatingInProjectId === project.id;
                  return (
                    <div key={project.id}>
                      <button
                        type="button"
                        data-selected-project={projectSelected ? "true" : undefined}
                        className={cn(
                          "flex w-full items-center gap-2 px-4 py-1.5 text-left text-sm transition-colors hover:bg-default/70",
                          projectSelected && "bg-primary/10 hover:bg-primary/10",
                          agencyFocusRingClass,
                          "motion-reduce:transition-none",
                        )}
                        onClick={() => onToggleProject(project.id)}
                        aria-expanded={expanded}
                      >
                        <AgencyProjectHueDot projectId={project.id} className="size-1.5" />
                        <span className="min-w-0 flex-1 truncate font-medium text-highlighted">
                          {renderHighlightedLabel(project.name)}
                        </span>
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
                            const selected = !isCreateMode && task.id === value;
                            return (
                              <button
                                key={task.id}
                                type="button"
                                data-selected-task={selected ? "true" : undefined}
                                className={cn(
                                  "group flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 pl-7 text-left transition-colors hover:bg-default/80",
                                  selected && "bg-primary/10 hover:bg-primary/10",
                                  agencyFocusRingClass,
                                  "motion-reduce:transition-none",
                                )}
                                onClick={() => onSelectTask(task.id)}
                              >
                                <span
                                  className={cn(
                                    "size-1.5 shrink-0 rounded-full",
                                    statusDotClass(task.status),
                                  )}
                                />
                                <span
                                  className={cn(
                                    "min-w-0 flex-1 truncate text-xs font-semibold",
                                    selected ? "text-primary" : "text-highlighted",
                                  )}
                                >
                                  {renderHighlightedLabel(task.title)}
                                </span>
                              </button>
                            );
                          })}

                          {isCreateMode ? (
                            creatingHere ? (
                              <div className="flex items-center gap-2 px-7 py-1">
                                <Input
                                  ref={createInputRef}
                                  value={createInputValue}
                                  onChange={(e) => onCreateInputChange(e.target.value)}
                                  onKeyDown={handleCreateInputKeyDown}
                                  placeholder="New task title"
                                  className={cn(
                                    "h-8 min-w-0 flex-1 rounded-lg border-default bg-default text-xs",
                                    agencyInputPlaceholderClass,
                                  )}
                                />
                                <button
                                  type="button"
                                  aria-label="Confirm new task"
                                  disabled={!createInputValue.trim()}
                                  className={cn(
                                    "inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-default text-muted transition-colors hover:bg-default hover:text-highlighted disabled:pointer-events-none disabled:opacity-40",
                                    agencyFocusRingClass,
                                    "motion-reduce:transition-none",
                                  )}
                                  onClick={() => onConfirmCreateInProject()}
                                >
                                  <Plus className="size-3.5" aria-hidden />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center py-1 pl-7">
                                <button
                                  type="button"
                                  aria-label="Create task"
                                  className={cn(
                                    "inline-flex size-6 items-center justify-center rounded-full border border-default text-muted transition-colors hover:bg-default hover:text-highlighted",
                                    agencyFocusRingClass,
                                    "motion-reduce:transition-none",
                                  )}
                                  onClick={() => onStartCreateInProject(project.id)}
                                >
                                  <Plus className="size-3.5" aria-hidden />
                                </button>
                              </div>
                            )
                          ) : null}
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
