import { Pencil, Play, Square, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type AgencyTimeEntryActionsProps = {
  entry: { id: string; projectName: string; taskTitle?: string | null };
  canRestart?: boolean;
  deleting?: boolean;
  onEdit: () => void;
  onRestart: () => void;
  onDelete: () => void;
};

export function AgencyTimeEntryActions({
  entry,
  canRestart = true,
  deleting = false,
  onEdit,
  onRestart,
  onDelete,
}: AgencyTimeEntryActionsProps) {
  const entryLabel = entry.taskTitle || entry.projectName;

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Edit ${entryLabel} entry`}
        onClick={onEdit}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={!canRestart}
        aria-label={`Restart timer for ${entryLabel}`}
        onClick={onRestart}
      >
        <Play />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={deleting}
        aria-label={`Delete ${entryLabel} entry`}
        onClick={onDelete}
      >
        {deleting ? <Square className="animate-pulse" /> : <Trash2 />}
      </Button>
    </div>
  );
}
