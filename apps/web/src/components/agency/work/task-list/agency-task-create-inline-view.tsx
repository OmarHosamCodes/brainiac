import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { AgencyMemberChooser } from "@/components/agency/agency-member-chooser";
import { AgencyProjectChooser } from "@/components/agency/agency-project-chooser";
import { AgencyProjectHueDot } from "@/components/agency/agency-project-hue-dot";
import type { AgencyTaskListCreateViewModel } from "@/lib/agency/work/hooks/use-agency-task-list";
import type { AgencyProjectTask, AgencyTaskProject, TaskStatus } from "@/lib/schemas/agency-work";
import { Input } from "@/components/ui/input";
import { agencyFocusRingClass, agencyInputPlaceholderClass } from "@/lib/utils/agency-ui";
import { statusChipClass, statusLabel } from "@/lib/utils/agency-task-status";
import {
  filterTasksByTitleSearch,
  taskTitleExactlyMatches,
} from "@/lib/utils/agency-task-title-filter";
import { cn } from "@/lib/utils";

type AgencyTaskCreateInlineViewProps = {
  projects: AgencyTaskProject[];
  create: AgencyTaskListCreateViewModel;
};

const suggestionPanelClass =
  "absolute inset-x-0 bottom-full z-20 mb-1 rounded-lg border border-default bg-elevated shadow-md";

const BROWSE_TASK_LIMIT = 8;

function QuickAddSuggestions({
  listboxId,
  titleDraft,
  tasks,
  loading,
  activeIndex,
  onActiveIndexChange,
  onPickTask,
  onCreateFromDraft,
}: {
  listboxId: string;
  titleDraft: string;
  tasks: AgencyProjectTask[];
  loading: boolean;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onPickTask: (task: AgencyProjectTask) => void;
  onCreateFromDraft: () => void;
}) {
  const trimmedTitle = titleDraft.trim();
  const filteredTasks = useMemo(() => {
    const matches = filterTasksByTitleSearch(tasks, titleDraft);
    return trimmedTitle ? matches : matches.slice(0, BROWSE_TASK_LIMIT);
  }, [tasks, titleDraft, trimmedTitle]);
  const showCreateRow =
    Boolean(trimmedTitle) && !taskTitleExactlyMatches(tasks, trimmedTitle);
  const showCreateInList = showCreateRow && filteredTasks.length === 0;

  if (loading) {
    return (
      <div className={cn(suggestionPanelClass, "p-2")}>
        <p className="px-2 py-1.5 text-xs text-muted">Loading tasks…</p>
      </div>
    );
  }

  if (filteredTasks.length === 0 && !showCreateInList) {
    return (
      <div className={cn(suggestionPanelClass, "p-2")}>
        <p className="px-2 py-3 text-center text-xs text-muted">
          {trimmedTitle ? "No matching tasks. Shift+Enter to create." : "No tasks in this project yet."}
        </p>
      </div>
    );
  }

  return (
    <ul
      id={listboxId}
      role="listbox"
      aria-label="Task suggestions"
      className={cn(suggestionPanelClass, "max-h-48 overflow-y-auto py-1")}
    >
      {!trimmedTitle ? (
        <>
          <li className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
            Recent tasks
          </li>
          <li className="px-3 pb-1.5 text-[10px] text-muted">Click or Enter to choose</li>
        </>
      ) : null}

      {showCreateRow && filteredTasks.length > 0 ? (
        <li className="px-3 pb-1.5 pt-1 text-[10px] text-muted">
          Enter to choose · Shift+Enter for new
        </li>
      ) : null}

      {filteredTasks.map((task, index) => {
        const active = index === activeIndex;
        return (
          <li key={task.id} role="presentation">
            <button
              id={`${listboxId}-option-${index}`}
              type="button"
              role="option"
              aria-selected={active}
              className={cn(
                "flex w-full min-w-0 items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-default/80",
                active && "bg-primary/10",
                agencyFocusRingClass,
                "motion-reduce:transition-none",
              )}
              onMouseEnter={() => onActiveIndexChange(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onPickTask(task)}
            >
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-xs font-semibold",
                  active ? "text-primary" : "text-highlighted",
                )}
              >
                {task.title}
              </span>
              <span
                className={statusChipClass(task.status as TaskStatus)}
                aria-label={`${statusLabel(task.status as TaskStatus)} status`}
              >
                {statusLabel(task.status as TaskStatus)}
              </span>
            </button>
          </li>
        );
      })}

      {showCreateInList ? (
        <li role="presentation">
          <button
            id={`${listboxId}-create`}
            type="button"
            role="option"
            aria-selected={activeIndex === 0}
            className={cn(
              "flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-default/80",
              activeIndex === 0 && "bg-primary/10",
              agencyFocusRingClass,
              "motion-reduce:transition-none",
            )}
            onMouseEnter={() => onActiveIndexChange(0)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onCreateFromDraft}
          >
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-highlighted">
              Create &ldquo;{trimmedTitle}&rdquo;
            </span>
          </button>
        </li>
      ) : null}
    </ul>
  );
}

export function AgencyTaskCreateInlineView({ projects, create }: AgencyTaskCreateInlineViewProps) {
  const listboxId = useId();
  const [activeIndex, setActiveIndex] = useState(0);

  const {
    titleDraft,
    descriptionDraft,
    createOptionsExpanded,
    quickAddFocused,
    selectedProjectId,
    projectNeedsChoice,
    members,
    assignedToTeam,
    selectedAssigneeIds,
    createTasks,
    createTasksLoading,
    existingOpenTask,
    disabled,
    noProjects,
    membersLoading,
    isCreatingTask,
    zoneId,
    quickAddInputRef,
    canSubmit,
    onQuickAddFocusChange,
    onToggleCreateOptions,
    onTitleChange,
    onDescriptionChange,
    onProjectChange,
    onAssignedToTeamChange,
    onAssigneeIdsChange,
    onPickSuggestion,
    onSubmit,
  } = create;

  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const trimmedTitle = titleDraft.trim();
  const showSuggestions = quickAddFocused && !noProjects && !createOptionsExpanded;

  const filteredTasks = useMemo(() => {
    const matches = filterTasksByTitleSearch(createTasks, titleDraft);
    return trimmedTitle ? matches : matches.slice(0, BROWSE_TASK_LIMIT);
  }, [createTasks, titleDraft, trimmedTitle]);
  const showCreateRow =
    Boolean(trimmedTitle) && !taskTitleExactlyMatches(createTasks, trimmedTitle);
  const hasExistingMatches = filteredTasks.length > 0;

  useEffect(() => {
    if (hasExistingMatches) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex(showCreateRow ? 0 : -1);
  }, [hasExistingMatches, showCreateRow, titleDraft]);

  const handlePickSuggestion = useCallback(
    (task: AgencyProjectTask) => {
      void onPickSuggestion(task);
      setActiveIndex(0);
    },
    [onPickSuggestion],
  );

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    onSubmit();
    setActiveIndex(0);
  }, [canSubmit, onSubmit]);

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onTitleChange("");
        onDescriptionChange("");
        quickAddInputRef.current?.blur();
        return;
      }

      if (event.key === "Enter" && event.shiftKey) {
        if (!trimmedTitle) return;
        event.preventDefault();
        handleSubmit();
        return;
      }

      if (showSuggestions && hasExistingMatches) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setActiveIndex((current) =>
            current < filteredTasks.length - 1 ? current + 1 : 0,
          );
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setActiveIndex((current) =>
            current > 0 ? current - 1 : filteredTasks.length - 1,
          );
          return;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          const index =
            activeIndex >= 0 && activeIndex < filteredTasks.length ? activeIndex : 0;
          handlePickSuggestion(filteredTasks[index]!);
          return;
        }
        return;
      }

      if (event.key === "Enter" && trimmedTitle) {
        event.preventDefault();
        handleSubmit();
      }
    },
    [
      activeIndex,
      filteredTasks,
      handlePickSuggestion,
      handleSubmit,
      hasExistingMatches,
      onDescriptionChange,
      onTitleChange,
      quickAddInputRef,
      showSuggestions,
      trimmedTitle,
    ],
  );

  return (
    <div
      id={zoneId}
      role="region"
      aria-label="Add task"
      className="shrink-0 border-t border-default bg-default/55 px-3 py-2.5"
    >
      <div className="relative min-w-0">
        {showSuggestions ? (
          <QuickAddSuggestions
            listboxId={listboxId}
            titleDraft={titleDraft}
            tasks={createTasks}
            loading={createTasksLoading}
            activeIndex={activeIndex}
            onActiveIndexChange={setActiveIndex}
            onPickTask={handlePickSuggestion}
            onCreateFromDraft={handleSubmit}
          />
        ) : null}

        <div
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-xl border bg-elevated px-2 py-1.5 transition-colors",
            projectNeedsChoice && quickAddFocused
              ? "border-warning/60 ring-1 ring-warning/20"
              : "border-default",
            quickAddFocused && !projectNeedsChoice && "border-primary/40 ring-1 ring-primary/15",
            "motion-reduce:transition-none",
          )}
        >
          {selectedProject ? (
            <AgencyProjectChooser
              value={selectedProjectId}
              onValueChange={onProjectChange}
              projects={projects}
              disabled={disabled}
              className="max-w-[9rem]"
            />
          ) : (
            <AgencyProjectChooser
              value={selectedProjectId}
              onValueChange={onProjectChange}
              projects={projects}
              disabled={disabled}
              placeholder="Project"
              className={cn(projectNeedsChoice && "text-warning")}
            />
          )}

          <input
            ref={quickAddInputRef}
            type="text"
            value={titleDraft}
            onChange={(event) => onTitleChange(event.target.value)}
            onFocus={() => onQuickAddFocusChange(true)}
            onBlur={() => onQuickAddFocusChange(false)}
            onKeyDown={handleInputKeyDown}
            disabled={disabled}
            placeholder={noProjects ? "Create a project first" : "Find a task…"}
            aria-label="Find or add task"
            aria-autocomplete="list"
            aria-controls={showSuggestions ? listboxId : undefined}
            aria-expanded={showSuggestions}
            data-testid="agency-quick-add-input"
            className={cn(
              "min-w-0 flex-1 border-0 bg-transparent py-1 text-sm font-medium text-highlighted outline-none placeholder:text-muted",
              agencyInputPlaceholderClass,
              disabled && "cursor-not-allowed opacity-50",
            )}
          />

          <button
            type="button"
            className={cn(
              "inline-flex size-7 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-default hover:text-highlighted",
              createOptionsExpanded && "bg-default text-highlighted",
              agencyFocusRingClass,
              "motion-reduce:transition-none",
            )}
            aria-label="Task options"
            aria-expanded={createOptionsExpanded}
            disabled={disabled}
            onClick={onToggleCreateOptions}
          >
            <SlidersHorizontal className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {existingOpenTask && trimmedTitle && createOptionsExpanded ? (
        <p className="mt-1.5 px-1 text-[11px] text-muted">
          Add joins the existing open task.
        </p>
      ) : null}

      {projectNeedsChoice && quickAddFocused && trimmedTitle ? (
        <p className="mt-1.5 px-1 text-[11px] font-medium text-warning">Pick a project.</p>
      ) : null}

      {createOptionsExpanded ? (
        <div className="mt-2 space-y-2 rounded-xl border border-default bg-elevated p-2.5">
          {selectedProject ? (
            <span className="inline-flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-full bg-default px-2.5 text-[11px] font-semibold text-muted">
              <AgencyProjectHueDot projectId={selectedProject.id} />
              <span className="truncate">{selectedProject.name}</span>
            </span>
          ) : null}

          <Input
            value={descriptionDraft}
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder="What are you working on?"
            disabled={disabled}
            className={cn(
              "h-8 rounded-lg border-default bg-default text-xs",
              agencyInputPlaceholderClass,
            )}
            aria-label="Work description"
          />

          <AgencyMemberChooser
            mode="multiple"
            assignedToTeam={assignedToTeam}
            selectedUserIds={selectedAssigneeIds}
            onAssignedToTeamChange={onAssignedToTeamChange}
            onSelectedUserIdsChange={onAssigneeIdsChange}
            members={members}
            disabled={disabled}
            loading={membersLoading}
          />

          <div className="flex justify-end">
            <button
              type="button"
              className={cn(
                "h-8 rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90",
                "disabled:pointer-events-none disabled:opacity-50",
                agencyFocusRingClass,
                "motion-reduce:transition-none",
              )}
              disabled={disabled || !canSubmit || isCreatingTask}
              onClick={handleSubmit}
            >
              {isCreatingTask ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
