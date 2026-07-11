import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/ui/button";
import { Label } from "@/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import {
  agencyFocusRingClass,
  agencyFormFieldClass,
  agencyLabelClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";
import type { AgencyWorkSurfaceCreateTaskPopoverViewModel } from "./hooks/use-agency-work-surface-create-task-popover";

type Props = AgencyWorkSurfaceCreateTaskPopoverViewModel & {
  taskChooser: ReactNode;
  memberChooser: ReactNode;
};

export function AgencyWorkSurfaceCreateTaskPopoverView(props: Props) {
  const {
    open,
    setOpen,
    formTitleId,
    taskContextId,
    projectContextLabel,
    handleSubmit,
    canSubmit,
    taskChooser,
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
            <Label className="text-xs font-semibold text-muted">Task</Label>
            {taskChooser}
            {projectContextLabel ? (
              <p id={taskContextId} className="mt-1.5 text-xs text-muted">
                {projectContextLabel}
              </p>
            ) : null}
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
