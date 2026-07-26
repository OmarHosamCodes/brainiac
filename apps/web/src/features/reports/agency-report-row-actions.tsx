import { Loader2, MoreVertical, Pencil, Trash2, TrashIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyReportRowActionsProps = {
  label: string;
  entryCount: number;
  taskId: string | null;
  taskIsWaste: boolean | null;
  deleting?: boolean;
  wastePending?: boolean;
  onEditDetails?: () => void;
  onDelete: () => void;
  onToggleWaste?: () => void;
};

export function AgencyReportRowActions({
  label,
  entryCount,
  taskId: _taskId,
  taskIsWaste,
  deleting = false,
  wastePending = false,
  onEditDetails,
  onDelete,
  onToggleWaste,
}: AgencyReportRowActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canToggleWaste = Boolean(onToggleWaste);
  const isWaste = taskIsWaste === true;
  const pending = deleting || wastePending;
  const entryLabel = entryCount === 1 ? "1 time entry" : `${entryCount} time entries`;

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", agencyFocusRingClass)}
            disabled={pending}
            aria-label={`Actions for ${label}`}
            onClick={(event) => event.stopPropagation()}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
            ) : (
              <MoreVertical className="size-3.5" />
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="w-48 p-1"
          onClick={(event) => event.stopPropagation()}
        >
          {onEditDetails ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setMenuOpen(false);
                onEditDetails();
              }}
            >
              <Pencil className="size-3.5" />
              Edit details
            </Button>
          ) : null}
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
              setConfirmOpen(true);
            }}
          >
            <Trash2 className="size-3.5" />
            Delete
          </Button>
        </PopoverContent>
      </Popover>

      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          if (deleting) return;
          setConfirmOpen(open);
        }}
      >
        <DialogContent className="max-w-md" showCloseButton={!deleting}>
          <DialogHeader>
            <DialogTitle>Delete {entryLabel}?</DialogTitle>
            <DialogDescription>
              This permanently deletes {entryLabel} for "{label}" from time tracking. This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" disabled={deleting} onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => {
                onDelete();
                setConfirmOpen(false);
              }}
            >
              {deleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
