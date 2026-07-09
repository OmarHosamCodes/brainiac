import { Loader2, MoreVertical, Trash2, TrashIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyReportRowActionsProps = {
  label: string;
  taskId: string | null;
  taskIsWaste: boolean | null;
  deleting?: boolean;
  wastePending?: boolean;
  onDelete: () => void;
  onToggleWaste?: () => void;
};

export function AgencyReportRowActions({
  label,
  taskId,
  taskIsWaste,
  deleting = false,
  wastePending = false,
  onDelete,
  onToggleWaste,
}: AgencyReportRowActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const canToggleWaste = Boolean(taskId && onToggleWaste);
  const isWaste = taskIsWaste === true;
  const pending = deleting || wastePending;

  return (
    <Popover open={menuOpen} onOpenChange={setMenuOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-8 w-8 p-0", agencyFocusRingClass)}
          disabled={pending}
          aria-label={`Actions for ${label}`}
        >
          {pending ? (
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
  );
}
