import { Loader2, MoreVertical, Pencil, Play, Trash2 } from "lucide-react";
import { useState } from "react";

import { AgencyTimeEntryEditPopover } from "@/components/agency/agency-time-entry-inline-edit";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
import type { TimeEntryDraft } from "@/lib/utils/time-entry-draft";
import { cn } from "@/lib/utils";

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

type AgencyTimeEntryActionsProps = {
  entry: { id: string; projectName: string; taskTitle?: string | null };
  canRestart?: boolean;
  deleting?: boolean;
  editDraft: TimeEntryDraft;
  onEditDraftChange: (draft: TimeEntryDraft) => void;
  projects: Project[];
  tasks: Task[];
  editError: string | null;
  editSaving: boolean;
  onSaveEdit: () => boolean | Promise<boolean>;
  onCancelEdit: () => void;
  onRestart: () => void;
  onDelete: () => void;
  onEditDescription: () => void;
};

type PopoverMode = "menu" | "edit" | null;

export function AgencyTimeEntryActions({
  entry,
  canRestart = true,
  deleting = false,
  editDraft,
  onEditDraftChange,
  projects,
  tasks,
  editError,
  editSaving,
  onSaveEdit,
  onCancelEdit,
  onRestart,
  onDelete,
  onEditDescription,
}: AgencyTimeEntryActionsProps) {
  const entryLabel = entry.taskTitle || entry.projectName;
  const [popoverMode, setPopoverMode] = useState<PopoverMode>(null);

  function closePopover() {
    setPopoverMode(null);
    onCancelEdit();
  }

  function openEditForm() {
    setPopoverMode("edit");
  }

  function handleSaveEdit() {
    void (async () => {
      const saved = await onSaveEdit();
      if (saved) setPopoverMode(null);
    })();
  }

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-8 w-8 p-0", agencyFocusRingClass)}
        disabled={!canRestart}
        aria-label={`Restart timer for ${entryLabel}`}
        onClick={onRestart}
      >
        <Play className="size-3.5" />
      </Button>

      <Popover
        open={popoverMode !== null}
        onOpenChange={(open) => {
          if (!open) closePopover();
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", agencyFocusRingClass)}
            disabled={deleting}
            aria-label={`Actions for ${entryLabel}`}
            onClick={() => setPopoverMode("menu")}
          >
            {deleting ? (
              <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
            ) : (
              <MoreVertical className="size-3.5" />
            )}
          </Button>
        </PopoverTrigger>

        {popoverMode === "menu" ? (
          <PopoverContent align="end" className="w-40 p-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                onEditDescription();
                closePopover();
              }}
            >
              <Pencil className="size-3.5" />
              Edit description
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={openEditForm}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-error"
              disabled={deleting}
              onClick={() => {
                closePopover();
                onDelete();
              }}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </PopoverContent>
        ) : null}

        {popoverMode === "edit" ? (
          <AgencyTimeEntryEditPopover
            draft={editDraft}
            onDraftChange={onEditDraftChange}
            projects={projects}
            tasks={tasks}
            error={editError}
            saving={editSaving}
            onSave={handleSaveEdit}
            onCancel={closePopover}
          />
        ) : null}
      </Popover>
    </div>
  );
}
