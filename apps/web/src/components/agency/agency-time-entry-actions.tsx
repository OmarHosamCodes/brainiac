import { Loader2, MoreVertical, Play, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTimeEntryActionsProps = {
  entry: { id: string; projectName: string; taskTitle?: string | null };
  canRestart?: boolean;
  deleting?: boolean;
  onRestart: () => void;
  onDelete: () => void;
};

export function AgencyTimeEntryActions({
  entry,
  canRestart = true,
  deleting = false,
  onRestart,
  onDelete,
}: AgencyTimeEntryActionsProps) {
  const entryLabel = entry.taskTitle || entry.projectName;
  const [menuOpen, setMenuOpen] = useState(false);

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
            disabled={deleting}
            aria-label={`Actions for ${entryLabel}`}
            onClick={() => setMenuOpen(true)}
          >
            {deleting ? (
              <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
            ) : (
              <MoreVertical className="size-3.5" />
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-40 p-1">
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
