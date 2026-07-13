import { Copy, Loader2, MoreVertical, Play, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { agencyTimeEntryIconButtonClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTimeEntryActionsProps = {
  entry: {
    id: string;
    projectName: string;
    taskTitle?: string | null;
  };
  canRestart?: boolean;
  deleting?: boolean;
  duplicating?: boolean;
  onRestart: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
};

export function AgencyTimeEntryActions({
  entry,
  canRestart = true,
  deleting = false,
  duplicating = false,
  onRestart,
  onDelete,
  onDuplicate,
}: AgencyTimeEntryActionsProps) {
  const entryLabel = entry.taskTitle || entry.projectName;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        className={cn(
          agencyTimeEntryIconButtonClass,
          !canRestart && "cursor-not-allowed opacity-50",
        )}
        disabled={!canRestart}
        aria-label={`Restart timer for ${entryLabel}`}
        onClick={onRestart}
      >
        <Play className="size-3.5" />
      </button>

      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={agencyTimeEntryIconButtonClass}
            disabled={deleting || duplicating}
            aria-label={`Actions for ${entryLabel}`}
            onClick={() => setMenuOpen(true)}
          >
            {deleting || duplicating ? (
              <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
            ) : (
              <MoreVertical className="size-3.5" />
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-44 p-1">
          {onDuplicate ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              disabled={duplicating || deleting}
              onClick={() => {
                setMenuOpen(false);
                onDuplicate();
              }}
            >
              <Copy className="size-3.5" />
              Duplicate
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
