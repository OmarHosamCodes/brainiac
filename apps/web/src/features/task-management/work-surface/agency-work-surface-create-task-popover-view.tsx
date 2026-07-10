import { Plus } from "lucide-react";
import type { ReactNode } from "react";
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

type Props = AgencyWorkSurfaceCreateTaskPopoverViewModel & {
  suggestionsOpen: boolean;
  projectChooser: ReactNode;
  suggestionMenu: ReactNode;
  memberChooser: ReactNode;
};

export function AgencyWorkSurfaceCreateTaskPopoverView(props: Props) {
  const {
    open,
    setOpen,
    formTitleId,
    titleFieldId,
    suggestionListboxId,
    title,
    setTitle,
    setTitleFocused,
    setSuggestionsDismissed,
    handleTitleKeyDown,
    handleSubmit,
    isCreatingTask,
    canSubmit,
    suggestionsOpen,
    projectChooser,
    suggestionMenu,
    memberChooser,
  } = props;
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
            {projectChooser}
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
              {suggestionMenu}
            </div>
          </div>
          <div className={agencyFormFieldClass}>
            <Label className="text-xs font-semibold text-muted">Assign</Label>
            {memberChooser}
          </div>
          <Button type="submit" disabled={!canSubmit}>
            Create task
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
