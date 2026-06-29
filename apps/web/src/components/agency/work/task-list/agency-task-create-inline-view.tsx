import { Plus } from "lucide-react";

import { AgencyMemberChooser } from "@/components/agency/agency-member-chooser";
import { AgencyProjectChooser } from "@/components/agency/agency-project-chooser";
import { AgencyProjectHueDot } from "@/components/agency/agency-project-hue-dot";
import type { AgencyTaskListCreateViewModel } from "@/lib/agency/work/hooks/use-agency-task-list";
import type { AgencyTaskProject } from "@/lib/schemas/agency-work";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agencyFocusRingClass, agencyInputPlaceholderClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTaskCreateInlineViewProps = {
  projects: AgencyTaskProject[];
  create: AgencyTaskListCreateViewModel;
};

export function AgencyTaskCreateInlineView({ projects, create }: AgencyTaskCreateInlineViewProps) {
  const {
    expanded,
    skipProjectStep,
    members,
    titleDraft,
    selectedProjectId,
    selectedAssigneeId,
    disabled,
    membersLoading,
    isCreatingTask,
    zoneId,
    titleSuggestionsListId,
    titleSuggestions,
    showTitleSuggestions,
    activeTitleSuggestionIndex,
    activeTitleSuggestionOptionId,
    canSubmit,
    onExpand,
    onCollapse,
    onTitleChange,
    onProjectChange,
    onAssigneeChange,
    onSubmit,
    onTitleInputFocus,
    onTitleInputBlur,
    onActiveTitleSuggestionIndexChange,
    onSelectTitleSuggestion,
    onTitleKeyDown,
  } = create;

  const selectedProject = projects.find((project) => project.id === selectedProjectId);

  if (!expanded) {
    return (
      <div className="shrink-0 border-y border-default">
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2 bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground",
            "transition-colors hover:bg-primary/90",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
          )}
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
      className="shrink-0 border-y border-default bg-default/55 px-3 py-3"
    >
      <div className="rounded-2xl border border-default bg-elevated p-2.5">
        <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
          {skipProjectStep && selectedProject ? (
            <span className="inline-flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-full bg-default px-2.5 text-[11px] font-semibold text-muted">
              <AgencyProjectHueDot projectId={selectedProject.id} />
              <span className="truncate">{selectedProject.name}</span>
            </span>
          ) : (
            <AgencyProjectChooser
              value={selectedProjectId}
              onValueChange={onProjectChange}
              projects={projects}
              disabled={disabled}
              autoFocus={!skipProjectStep}
            />
          )}

          <span className="shrink-0 text-[11px] font-semibold text-muted">New task</span>
        </div>

        <div className="space-y-1.5">
          <Input
            value={titleDraft}
            onChange={(e) => onTitleChange(e.target.value)}
            onFocus={onTitleInputFocus}
            onBlur={onTitleInputBlur}
            placeholder="What needs doing?"
            aria-label="Task name"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showTitleSuggestions}
            aria-controls={showTitleSuggestions ? titleSuggestionsListId : undefined}
            aria-activedescendant={activeTitleSuggestionOptionId}
            autoComplete="off"
            autoFocus={skipProjectStep}
            className={cn(
              "h-10 rounded-xl border-default bg-default px-3 text-sm font-semibold text-highlighted",
              agencyInputPlaceholderClass,
              "focus-visible:border-ring",
            )}
            onKeyDown={onTitleKeyDown}
          />

          {showTitleSuggestions ? (
            <div
              id={titleSuggestionsListId}
              role="listbox"
              aria-label="Matching task names"
              className="max-h-40 overflow-y-auto rounded-xl border border-default bg-default p-1"
            >
              {titleSuggestions.map((task, index) => (
                <button
                  id={`${titleSuggestionsListId}-option-${index}`}
                  key={task.id}
                  type="button"
                  role="option"
                  aria-selected={index === activeTitleSuggestionIndex}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold",
                    "transition-colors motion-reduce:transition-none",
                    index === activeTitleSuggestionIndex
                      ? "bg-primary/10 text-highlighted"
                      : "text-muted hover:bg-elevated hover:text-highlighted",
                  )}
                  onMouseEnter={() => onActiveTitleSuggestionIndexChange(index)}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    onSelectTitleSuggestion(task);
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{task.title}</span>
                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold capitalize text-muted">
                    {task.status.replace("_", " ")}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
          <div className="min-w-0 w-full flex-1 sm:max-w-[11rem]">
            <AgencyMemberChooser
              value={selectedAssigneeId}
              onValueChange={onAssigneeChange}
              members={members}
              disabled={disabled}
              loading={membersLoading}
            />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-full px-2.5 text-xs text-muted hover:text-highlighted"
              onClick={onCollapse}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-full px-3 text-xs"
              disabled={!canSubmit}
              onClick={onSubmit}
            >
              {isCreatingTask ? "Adding…" : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
