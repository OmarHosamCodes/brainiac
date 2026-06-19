import { Loader2, MoreVertical, Pencil, Play, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

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
    <div className="flex shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className={cn("max-sm:min-h-11 max-sm:min-w-11", agencyFocusRingClass)}
        disabled={!canRestart}
        aria-label={`Restart timer for ${entryLabel}`}
        onClick={onRestart}
      >
        <Play className="size-3.5" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("max-sm:min-h-11 max-sm:min-w-11", agencyFocusRingClass)}
            disabled={deleting}
            aria-label={`Actions for ${entryLabel}`}
          >
            {deleting ? (
              <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
            ) : (
              <MoreVertical className="size-3.5" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-40 p-1">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onEdit}>
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-error"
            disabled={deleting}
            onClick={onDelete}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
