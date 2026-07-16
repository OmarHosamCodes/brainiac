import { Plus, Search } from "lucide-react";
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
    onSelectTask,
    onToggleProject,
    onToggleClient,
    onToggleProjectFavorite,
    onToggleTaskFavorite,
    highlightSearch,
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

  function renderProjectGroup(entry: ChooserProjectGroup, showClientName: boolean): ReactNode {
    const expanded = isProjectExpanded(entry.project.id);
    const favorited = favoriteProjectIds.has(entry.project.id) || entry.isFavorite;
    return (
      <div key={entry.project.id}>
        <AgencyTaskChooserProjectRow
          projectId={entry.project.id}
          projectName={entry.project.name}
          clientName={entry.project.clientName}
          colorHueId={entry.project.colorHueId}
          taskCount={entry.tasks.length}
          expanded={expanded}
          favorited={favorited}
          searchTerm={searchTerm}
          highlightSearch={highlightSearch}
          showClientName={showClientName}
          showCreateTask
          onToggle={() => onToggleProject(entry.project.id)}
          onToggleFavorite={() => onToggleProjectFavorite(entry.project.id)}
          onCreateTask={() => onOpenCreateTask(entry.project.id)}
        />
        {expanded ? (
          <div className="space-y-0.5 pb-0.5">
            {entry.tasks.map((task) => (
              <AgencyTaskChooserTaskRow
                key={task.id}
                taskId={task.id}
                title={task.title}
                selected={task.id === value}
                favorited={favoriteTaskIds.has(task.id)}
                searchTerm={searchTerm}
                highlightSearch={highlightSearch}
                onSelect={() => onSelectTask(task.id)}
                onToggleFavorite={() => onToggleTaskFavorite(task.id)}
              />
            ))}
            <div className="flex items-center py-0.5 pl-5">
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-info transition-colors hover:bg-default/80 hover:text-info/80",
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
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || loading}
            aria-required={required && !value ? true : undefined}
            className={cn(
              "w-64 max-w-full justify-start",
              triggerFormat === "task-only" ? "gap-2" : "gap-1",
              className,
            )}
          >
            {renderTriggerLabel()}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align={contentAlign}
          className="flex w-[26rem] max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-default p-0 font-sans shadow-lg ring-0"
        >
          <div className="border-b border-default p-3">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
              <Input
                ref={searchInputRef}
                autoFocus
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className={cn(
                  "h-9 rounded-xl border-default bg-default pl-8 font-sans text-sm",
                  agencyInputPlaceholderClass,
                )}
              />
            </div>
          </div>

          <div ref={listRef} className="max-h-[min(24rem,60vh)] overflow-y-auto px-1.5 py-2">
            {loading ? (
              <div className="space-y-1.5 px-1 py-1">
                {[1, 2, 3, 4, 5].map((rowIndex) => (
                  <Skeleton key={rowIndex} className="h-8 rounded-lg" />
                ))}
              </div>
            ) : isEmpty ? (
              <p className="px-3 py-8 text-center text-sm text-muted">
                {searchTerm.trim() ? "No matching projects or tasks." : "No projects yet."}
              </p>
            ) : (
              <div className="space-y-2">
                {favorites.length > 0 ? (
                  <AgencyTaskChooserFavoritesSection>
                    {favorites.map((entry) => renderProjectGroup(entry, true))}
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
                    {group.projects.map((entry) => renderProjectGroup(entry, false))}
                  </AgencyTaskChooserClientSection>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-default px-3 py-2.5">
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-sm font-semibold text-info transition-colors hover:bg-default/80 hover:text-info/80",
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
