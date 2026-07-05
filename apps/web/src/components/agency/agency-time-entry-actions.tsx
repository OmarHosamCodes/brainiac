import { Loader2, MoreVertical, Play, Trash2, TrashIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTimeEntryActionsProps = {
  entry: {
    id: string;
    projectName: string;
    taskTitle?: string | null;
    taskId?: string | null;
    taskIsWaste?: boolean | null;
  };
  canRestart?: boolean;
  deleting?: boolean;
  wastePending?: boolean;
  onRestart: () => void;
  onDelete: () => void;
  onToggleWaste?: () => void;
};

export function AgencyTimeEntryActions({
  entry,
  canRestart = true,
  deleting = false,
  wastePending = false,
  onRestart,
  onDelete,
  onToggleWaste,
}: AgencyTimeEntryActionsProps) {
  const entryLabel = entry.taskTitle || entry.projectName;
  const [menuOpen, setMenuOpen] = useState(false);
  const canToggleWaste = Boolean(entry.taskId && onToggleWaste);
  const isWaste = entry.taskIsWaste === true;

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

      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", agencyFocusRingClass)}
            disabled={deleting || wastePending}
            aria-label={`Actions for ${entryLabel}`}
            onClick={() => setMenuOpen(true)}
          >
            {deleting || wastePending ? (
              <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
            ) : (
              <MoreVertical className="size-3.5" />
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-44 p-1">
          {canToggleWaste ? (
            <Button
              variant="ghost"
              size="sm"
              className={cn("w-full justify-start", isWaste && "text-warning")}
              disabled={wastePending}
              onClick={() => {
                setMenuOpen(false);
                onToggleWaste?.();
              }}
            >
              <TrashIcon className="size-3.5" />
              {isWaste ? "Unmark as waste" : "Mark as waste"}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-error"
            disabled={deleting}
            onClick={() => {
              setMenuOpen(false);
              onDelete();
            }}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
