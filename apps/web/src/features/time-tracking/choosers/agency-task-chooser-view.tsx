import { ArrowLeftRight, Plus, Search, X } from "lucide-react";
import type { ReactNode } from "react";

import { AgencyTimeEntryProjectLabel } from "@/features/time-tracking/entries/agency-time-entry-project-label";
import { AgencyTaskChooserClientSection } from "@/features/time-tracking/choosers/agency-task-chooser-client-section";
import { AgencyTaskChooserFavoritesSection } from "@/features/time-tracking/choosers/agency-task-chooser-favorites-section";
import { AgencyTaskChooserProjectRow } from "@/features/time-tracking/choosers/agency-task-chooser-project-row";
import { AgencyTaskChooserTaskRow } from "@/features/time-tracking/choosers/agency-task-chooser-task-row";
import { AgencyTaskCreateDialog } from "@/features/time-tracking/choosers/agency-task-create-dialog";
import { AgencyTaskChooserProjectCreateDialog } from "@/features/time-tracking/choosers/agency-task-chooser-project-create-dialog";
import type { AgencyTaskChooserViewModel } from "@/features/time-tracking/hooks/use-agency-task-chooser";
import type { ChooserProjectGroup } from "@/features/time-tracking/agency-task-chooser-groups";
import {
  taskChooserOptionDomId,
  taskChooserProjectOptionKey,
  taskChooserTaskOptionKey,
} from "@/features/time-tracking/agency-task-chooser-keyboard";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { Skeleton } from "@/ui/skeleton";
import { agencyFocusRingClass, agencyInputPlaceholderClass } from "@/features/shared/agency-ui";
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
    required,
    searchPlaceholder,
    className,
    contentAlign,
    triggerFormat,
    open,
    searchTerm,
    triggerProject,
    triggerTaskTitle,
    favorites,
    clientGroups,
    favoriteProjectIds,
    favoriteTaskIds,
    searchInputRef,
    listRef,
    isProjectExpanded,
    isClientExpanded,
    onOpenChange,
    onSearchChange,
    onSearchKeyDown,
    onSelectTask,
    onClearTask,
    canClearTask,
    clearAffordance,
    onToggleProject,
    onToggleClient,
    onToggleProjectFavorite,
    onToggleTaskFavorite,
    highlightSearch,
    bestMatchTaskId,
    activeOptionKey,
    activeOptionDomId,
    createPriority,
    teamId,
    createTaskOpen,
    createTaskProjectId,
    createProjectOpen,
    clients,
    templates,
    onOpenCreateTask,
    onCreateTaskOpenChange,
    onOpenCreateProject,
    onCreateProjectOpenChange,
    onTaskCreated,
    onProjectCreated,
  } = view;

  const createMuted = createPriority === "demoted";
  const createElevated = createPriority === "elevated";

  function renderEmptyPlaceholder() {
    return (
      <span className="min-w-0 truncate text-muted">
        {placeholder}
        {required ? (
          <span className="text-error" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </span>
    );
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
      return renderEmptyPlaceholder();
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
      return renderEmptyPlaceholder();
    }
    if (triggerTaskTitle) {
      return <span className="min-w-0 truncate">{triggerTaskTitle}</span>;
    }
    return renderEmptyPlaceholder();
  }

  function renderProjectGroup(
    entry: ChooserProjectGroup,
    showClientName: boolean,
    keyScope: string,
  ): ReactNode {
    const expanded = isProjectExpanded(entry.project.id);
    const favorited = favoriteProjectIds.has(entry.project.id) || entry.isFavorite;
    const projectOptionKey = taskChooserProjectOptionKey(keyScope, entry.project.id);
    return (
      <div key={`${keyScope}-${entry.project.id}`}>
        <AgencyTaskChooserProjectRow
          projectId={entry.project.id}
          projectName={entry.project.name}
          clientName={entry.project.clientName}
          colorHueId={entry.project.colorHueId}
          taskCount={entry.tasks.length}
          expanded={expanded}
          favorited={favorited}
          active={activeOptionKey === projectOptionKey}
          optionId={taskChooserOptionDomId(projectOptionKey)}
          searchTerm={searchTerm}
          highlightSearch={highlightSearch}
          showClientName={showClientName}
          showCreateTask
          createMuted={createMuted}
          onToggle={() => onToggleProject(entry.project.id)}
          onToggleFavorite={() => onToggleProjectFavorite(entry.project.id)}
          onCreateTask={() => onOpenCreateTask(entry.project.id)}
        />
        {expanded ? (
          <div className="space-y-0.5 pb-0.5">
            {entry.tasks.map((task) => {
              const taskOptionKey = taskChooserTaskOptionKey(keyScope, task.id);
              return (
                <AgencyTaskChooserTaskRow
                  key={task.id}
                  taskId={task.id}
                  title={task.title}
                  selected={task.id === value}
                  bestMatch={Boolean(bestMatchTaskId) && task.id === bestMatchTaskId}
                  active={activeOptionKey === taskOptionKey}
                  optionId={taskChooserOptionDomId(taskOptionKey)}
                  favorited={favoriteTaskIds.has(task.id)}
                  searchTerm={searchTerm}
                  highlightSearch={highlightSearch}
                  onSelect={() => onSelectTask(task.id)}
                  onToggleFavorite={() => onToggleTaskFavorite(task.id)}
                />
              );
            })}
            <div className="flex items-center py-0.5 pl-5">
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-colors hover:bg-default/80",
                  createMuted ? "text-muted hover:text-muted" : "text-info hover:text-info/80",
                  createElevated && "text-sm text-info",
                  agencyFocusRingClass,
                )}
                onClick={() => onOpenCreateTask(entry.project.id)}
              >
                <Plus className="size-3.5" aria-hidden />
                Create task
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  const isEmpty = favorites.length === 0 && clientGroups.length === 0;

  return (
    <>
      <div className="relative inline-flex min-w-0 max-w-full shrink items-center self-center">
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled || loading}
              aria-required={required && !value ? true : undefined}
              aria-haspopup="listbox"
              aria-expanded={open}
              className={cn(
                "min-w-0 max-w-full shrink justify-start rounded-2xl border-0 bg-transparent shadow-none hover:bg-muted/50 dark:hover:bg-muted/50",
                triggerFormat === "task-only" ? "gap-2" : "gap-1",
                className,
                // After className so px-* from trigger styles cannot wipe reserved icon space.
                canClearTask && "pr-8",
              )}
            >
              {renderTriggerLabel()}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align={contentAlign}
            collisionPadding={12}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              searchInputRef.current?.focus();
            }}
            className={cn(
              "flex w-[26rem] max-w-[calc(100vw-2rem)] flex-col gap-0 rounded-xl border border-default p-0 font-sans shadow-lg ring-0",
              // Exit animation can stall Presence unmount and leave a click-eating layer.
              "data-[state=closed]:animate-none",
            )}
          >
            <div className="border-b border-default p-3">
              <div className="relative">
                <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
                <Input
                  ref={searchInputRef}
                  autoFocus
                  role="combobox"
                  aria-expanded={open}
                  aria-controls="agency-task-chooser-listbox"
                  aria-autocomplete="list"
                  aria-activedescendant={activeOptionDomId}
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyDown={onSearchKeyDown}
                  placeholder={searchPlaceholder}
                  className={cn(
                    "h-9 rounded-xl border-default bg-default pl-8 font-sans text-sm",
                    agencyInputPlaceholderClass,
                  )}
                />
              </div>
            </div>

            <div
              id="agency-task-chooser-listbox"
              ref={listRef}
              role="listbox"
              aria-label="Tasks"
              className="max-h-[min(24rem,60vh)] overflow-y-auto px-1.5 py-2"
            >
              {loading ? (
                <div className="space-y-1.5 px-1 py-1">
                  {[1, 2, 3, 4, 5].map((rowIndex) => (
                    <Skeleton key={rowIndex} className="h-8 rounded-lg" />
                  ))}
                </div>
              ) : isEmpty ? (
                <p className="px-3 py-8 text-center text-sm text-muted">
                  {searchTerm.trim() ? "No matches" : "No projects yet."}
                </p>
              ) : (
                <div className="space-y-2">
                  {favorites.length > 0 ? (
                    <AgencyTaskChooserFavoritesSection>
                      {favorites.map((entry) => renderProjectGroup(entry, true, "fav"))}
                    </AgencyTaskChooserFavoritesSection>
                  ) : null}
                  {clientGroups.map((group) => (
                    <AgencyTaskChooserClientSection
                      key={group.clientName}
                      clientName={group.clientName}
                      projectCount={group.projects.length}
                      expanded={isClientExpanded(group.clientName)}
                      onToggle={() => onToggleClient(group.clientName)}
                    >
                      {group.projects.map((entry) =>
                        renderProjectGroup(entry, false, `client-${group.clientName}`),
                      )}
                    </AgencyTaskChooserClientSection>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-default px-3 py-2.5">
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-1 py-1 font-semibold transition-colors hover:bg-default/80",
                  createElevated
                    ? "text-sm text-info hover:text-info/80"
                    : createMuted
                      ? "text-sm text-muted hover:text-muted"
                      : "text-sm text-info hover:text-info/80",
                  agencyFocusRingClass,
                )}
                onClick={onOpenCreateProject}
              >
                <Plus className="size-4" aria-hidden />
                Create project
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {canClearTask ? (
          <button
            type="button"
            aria-label={clearAffordance === "switch" ? "Change task" : "Clear task"}
            className={cn(
              "absolute top-1/2 right-1 z-10 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-default hover:text-foreground",
              agencyFocusRingClass,
            )}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClearTask();
            }}
          >
            {clearAffordance === "switch" ? (
              <ArrowLeftRight className="size-3.5" aria-hidden />
            ) : (
              <X className="size-3.5" aria-hidden />
            )}
          </button>
        ) : null}
      </div>

      <AgencyTaskCreateDialog
        open={createTaskOpen}
        onOpenChange={onCreateTaskOpenChange}
        teamId={teamId}
        projectId={createTaskProjectId}
        onCreated={onTaskCreated}
      />
      <AgencyTaskChooserProjectCreateDialog
        open={createProjectOpen}
        onOpenChange={onCreateProjectOpenChange}
        teamId={teamId}
        clients={clients}
        templates={templates}
        onCreated={onProjectCreated}
      />
    </>
  );
}
