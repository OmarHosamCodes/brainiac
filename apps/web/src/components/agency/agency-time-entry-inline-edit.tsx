import { X } from "lucide-react";

import { AgencyTaskChooser } from "@/components/agency/agency-task-chooser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PopoverContent } from "@/components/ui/popover";
import { agencyInputPlaceholderClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";
import {
  applyDurationToDraft,
  applyEndTimeToDraft,
  type TimeEntryDraft,
} from "@/lib/utils/time-entry-draft";

type Project = {
  id: string;
  clientName: string;
  name: string;
};

type Task = {
  id: string;
  projectId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "archived";
  assigneeName?: string | null;
  dueDate?: string | null;
};

type AgencyTimeEntryEditPopoverProps = {
  draft: TimeEntryDraft;
  onDraftChange: (draft: TimeEntryDraft) => void;
  projects: Project[];
  tasks: Task[];
  error: string | null;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export function AgencyTimeEntryEditPopover({
  draft,
  onDraftChange,
  projects,
  tasks,
  error,
  saving,
  onSave,
  onCancel,
}: AgencyTimeEntryEditPopoverProps) {
  return (
    <PopoverContent align="end" className="w-80 space-y-3 p-3">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted">Task</label>
          <AgencyTaskChooser
            value={draft.taskId}
            onValueChange={(taskId) => onDraftChange({ ...draft, taskId })}
            projects={projects}
            tasks={tasks}
            placeholder="+ Task"
            className="w-full"
            disabled={saving}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted">Date</label>
          <Input
            value={draft.date}
            onChange={(e) => onDraftChange({ ...draft, date: e.target.value })}
            type="date"
            aria-label="Entry date"
            disabled={saving}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted">Start</label>
            <Input
              value={draft.startTime}
              onChange={(e) =>
                onDraftChange(
                  applyDurationToDraft(
                    { ...draft, startTime: e.target.value },
                    draft.durationInput,
                  ),
                )
              }
              type="time"
              className="font-mono tabular-nums"
              aria-label="Start time"
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted">End</label>
            <Input
              value={draft.endTime}
              onChange={(e) => onDraftChange(applyEndTimeToDraft(draft, e.target.value))}
              type="time"
              className="font-mono tabular-nums"
              aria-label="End time"
              disabled={saving}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted">Duration</label>
          <Input
            value={draft.durationInput}
            onChange={(e) => onDraftChange(applyDurationToDraft(draft, e.target.value))}
            className={cn("font-mono tabular-nums", agencyInputPlaceholderClass)}
            placeholder="1:00"
            aria-label="Duration"
            disabled={saving}
          />
        </div>

        {error ? (
          <p className="text-xs text-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" disabled={saving} onClick={onCancel}>
            <X />
            Cancel
          </Button>
          <Button type="submit" size="sm" className="font-bold" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </PopoverContent>
  );
}
