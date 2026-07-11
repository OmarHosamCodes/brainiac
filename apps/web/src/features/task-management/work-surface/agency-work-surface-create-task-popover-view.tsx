import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/ui/button";
import { Label } from "@/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import {
  agencyFormFieldClass,
  agencyLabelClass,
  agencyWorkTabCreateClass,
} from "@/features/shared/agency-ui";
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
        <Button size="sm" variant="outline" className={agencyWorkTabCreateClass}>
          <Plus className="size-3.5" aria-hidden />
          New task
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[22rem] !overflow-visible p-4"
        aria-labelledby={formTitleId}
      >
        <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
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
          <Button type="submit" className="mt-1" disabled={!canSubmit}>
            Create task
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
