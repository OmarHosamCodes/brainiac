import { X } from "lucide-react";

import { AgencyTaskChooser } from "@/components/agency/agency-task-chooser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type AgencyTimeEntryInlineEditProps = {
  draft: TimeEntryDraft;
  onDraftChange: (draft: TimeEntryDraft) => void;
  projects: Project[];
  tasks: Task[];
  error: string | null;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export function AgencyTimeEntryInlineEdit({
  draft,
  onDraftChange,
  projects,
  tasks,
  error,
  saving,
  onSave,
  onCancel,
}: AgencyTimeEntryInlineEditProps) {
  return (
    <form
      className="space-y-2 border-t border-default bg-primary/5 px-4 py-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={draft.description}
          onChange={(e) => onDraftChange({ ...draft, description: e.target.value })}
          aria-label="Time entry description"
          placeholder="What did you work on?"
          className="min-w-0 flex-1 basis-48"
          disabled={saving}
        />

        <AgencyTaskChooser
          value={draft.taskId}
          onValueChange={(taskId) => onDraftChange({ ...draft, taskId })}
          projects={projects}
          tasks={tasks}
          placeholder="+ Task"
          className="w-auto max-w-44 shrink-0"
          disabled={saving}
        />

        <Input
          value={draft.date}
          onChange={(e) => onDraftChange({ ...draft, date: e.target.value })}
          type="date"
          className="w-36 shrink-0"
          aria-label="Entry date"
          disabled={saving}
        />

        <div className="flex shrink-0 items-center gap-1">
          <Input
            value={draft.startTime}
            onChange={(e) =>
              onDraftChange(
                applyDurationToDraft({ ...draft, startTime: e.target.value }, draft.durationInput),
              )
            }
            type="time"
            className="w-24 font-mono tabular-nums"
            aria-label="Start time"
            disabled={saving}
          />
          <span className="text-xs text-muted">to</span>
          <Input
            value={draft.endTime}
            onChange={(e) => onDraftChange(applyEndTimeToDraft(draft, e.target.value))}
            type="time"
            className="w-24 font-mono tabular-nums"
            aria-label="End time"
            disabled={saving}
          />
        </div>

        <Input
          value={draft.durationInput}
          onChange={(e) => onDraftChange(applyDurationToDraft(draft, e.target.value))}
          className="w-20 shrink-0 font-mono tabular-nums"
          placeholder="1:00"
          aria-label="Duration"
          disabled={saving}
        />

        <Button type="submit" size="sm" className="shrink-0 font-bold" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Cancel"
          disabled={saving}
          onClick={onCancel}
        >
          <X />
        </Button>
      </div>

      {error ? (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
