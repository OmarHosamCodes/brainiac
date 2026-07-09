import { Plus } from "lucide-react";
import { AgencyDescriptionSuggestionMenu } from "@/features/time-tracking/agency-description-suggestion-menu";
import { AgencyMemberChooser } from "@/features/shared/choosers/agency-member-chooser";
import { AgencyProjectChooser } from "@/features/shared/choosers/agency-project-chooser";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import {
  agencyFocusRingClass,
  agencyFormFieldClass,
  agencyInputPlaceholderClass,
  agencyLabelClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import type { AgencyWorkSurfaceCreateTaskPopoverViewModel } from "./hooks/use-agency-work-surface-create-task-popover";

type Props = AgencyWorkSurfaceCreateTaskPopoverViewModel;

export function AgencyWorkSurfaceCreateTaskPopoverView(props: Props) {
  const {
    projects,
    open,
    setOpen,
    formTitleId,
    titleFieldId,
    suggestionListboxId,
    title,
    setTitle,
    projectId,
    setProjectId,
    assignedToTeam,
    setAssignedToTeam,
    assigneeUserIds,
    setAssigneeUserIds,
    titleFocused,
    setTitleFocused,
    suggestionsDismissed,
    setSuggestionsDismissed,
    activeSuggestionIndex,
    setActiveSuggestionIndex,
    members,
    suggestions,
    handleTitleKeyDown,
    handleSubmit,
    applySuggestion,
    isCreatingTask,
    canSubmit,
  } = props;
  const suggestionsOpen = !suggestionsDismissed && suggestions.length > 0 && titleFocused;
  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button size="sm" className={cn("h-9 shrink-0 rounded-xl px-3", agencyFocusRingClass)}>
          <Plus className="size-4" aria-hidden />
          Add New Task
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-80 !overflow-visible p-3"
        aria-labelledby={formTitleId}
      >
        <form className="flex flex-col gap-3" onSubmit={(event) => void handleSubmit(event)}>
          <p id={formTitleId} className={agencyLabelClass}>
            New task
          </p>
          <div className={agencyFormFieldClass}>
            <Label className="text-xs font-semibold text-muted">Project</Label>
            <AgencyProjectChooser
              value={projectId}
              onValueChange={setProjectId}
              projects={projects}
              placeholder="Select project"
              searchPlaceholder="Search projects"
              disabled={isCreatingTask}
              className={cn(
                "h-9 w-full max-w-none justify-between gap-1.5 rounded-xl border border-default bg-default px-3 text-sm font-medium shadow-none",
                "transition-colors hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50",
                agencyFocusRingClass,
                "motion-reduce:transition-none",
              )}
              contentAlign="start"
            />
          </div>
          <div className={agencyFormFieldClass} data-create-task-title>
            <Label htmlFor={titleFieldId} className="text-xs font-semibold text-muted">
              Task name
            </Label>
            <div className="relative">
              <Input
                id={titleFieldId}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={handleTitleKeyDown}
                onFocus={() => {
                  setTitleFocused(true);
                  setSuggestionsDismissed(false);
                }}
                placeholder="What needs doing?"
                autoFocus
                disabled={isCreatingTask}
                aria-autocomplete="list"
                aria-controls={suggestionsOpen ? suggestionListboxId : undefined}
                aria-expanded={suggestionsOpen}
                className={cn(
                  "h-9 rounded-xl border-default bg-default text-sm font-medium",
                  agencyInputPlaceholderClass,
                  agencyFocusRingClass,
                )}
              />
              {suggestionsOpen ? (
                <AgencyDescriptionSuggestionMenu
                  listboxId={suggestionListboxId}
                  suggestions={suggestions}
                  activeIndex={activeSuggestionIndex}
                  ariaLabel="Recent task names"
                  onActiveIndexChange={setActiveSuggestionIndex}
                  onSelect={applySuggestion}
                />
              ) : null}
            </div>
          </div>
          <div className={agencyFormFieldClass}>
            <Label className="text-xs font-semibold text-muted">Assign</Label>
            <AgencyMemberChooser
              mode="multiple"
              assignedToTeam={assignedToTeam}
              selectedUserIds={assigneeUserIds}
              onAssignedToTeamChange={setAssignedToTeam}
              onSelectedUserIdsChange={setAssigneeUserIds}
              members={members}
              loading={false}
              disabled={isCreatingTask}
              triggerVariant="stack"
            />
          </div>
          <Button type="submit" disabled={!canSubmit}>
            Create task
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
