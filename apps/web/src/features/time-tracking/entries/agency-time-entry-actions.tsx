import { Copy, Loader2, MoreVertical, Play, Trash2, TrashIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { agencyTimeEntryIconButtonClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTimeEntryActionProps = {
  entry: {
    id: string;
    projectName: string;
    taskTitle?: string | null;
    isWaste?: boolean | null;
    isBillable?: boolean;
  };
  canRestart?: boolean;
  deleting?: boolean;
  duplicating?: boolean;
  wastePending?: boolean;
  onRestart: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onToggleWaste?: () => void;
  onIsBillableChange?: (isBillable: boolean) => void;
};

export function AgencyTimeEntryPlayAction({
  entry,
  canRestart = true,
  onRestart,
}: Pick<AgencyTimeEntryActionProps, "entry" | "canRestart" | "onRestart">) {
  const entryLabel = entry.taskTitle || entry.projectName;

  return (
    <button
      type="button"
      className={cn(agencyTimeEntryIconButtonClass, !canRestart && "cursor-not-allowed opacity-50")}
      disabled={!canRestart}
      aria-label={`Restart timer for ${entryLabel}`}
      onClick={onRestart}
    >
      <Play className="size-3.5" />
    </button>
  );
}

export function AgencyTimeEntryMoreAction({
  entry,
  deleting = false,
  duplicating = false,
  wastePending = false,
  onDelete,
  onDuplicate,
  onToggleWaste,
  onIsBillableChange,
}: Pick<
  AgencyTimeEntryActionProps,
  | "entry"
  | "deleting"
  | "duplicating"
  | "wastePending"
  | "onDelete"
  | "onDuplicate"
  | "onToggleWaste"
  | "onIsBillableChange"
>) {
  const entryLabel = entry.taskTitle || entry.projectName;
  const [menuOpen, setMenuOpen] = useState(false);
  const canToggleWaste = Boolean(onToggleWaste);
  const canToggleBillable = Boolean(onIsBillableChange);
  const isWaste = entry.isWaste === true;
  const isBillable = entry.isBillable !== false;

  return (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={agencyTimeEntryIconButtonClass}
          disabled={deleting || duplicating || wastePending}
          aria-label={`Actions for ${entryLabel}`}
          onClick={() => setMenuOpen(true)}
        >
          {deleting || duplicating || wastePending ? (
            <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
          ) : (
            <MoreVertical className="size-3.5" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-44 p-1">
        {canToggleBillable ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            disabled={deleting || duplicating}
            onClick={() => {
              setMenuOpen(false);
              onIsBillableChange?.(!isBillable);
            }}
          >
            <span className={cn("size-3.5 text-center text-xs font-semibold", isBillable && "text-info")}>
              $
            </span>
            {isBillable ? "Billable" : "Non-billable"}
          </Button>
        ) : null}
        {canToggleWaste ? (
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full justify-start", isWaste && "text-warning")}
            disabled={wastePending || deleting}
            onClick={() => {
              setMenuOpen(false);
              onToggleWaste?.();
            }}
          >
            <TrashIcon className="size-3.5" />
            {isWaste ? "Unmark as waste" : "Mark as waste"}
          </Button>
        ) : null}
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
  );
}
