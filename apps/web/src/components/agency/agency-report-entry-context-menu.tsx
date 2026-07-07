import { Loader2, Pencil, Trash2, TrashIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { agencyMetricClass } from "@/lib/utils/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";

type AgencyReportEntryContextMenuProps = {
  entryId: string;
  taskTitle: string | null;
  durationSeconds: number;
  taskId: string | null;
  taskIsWaste: boolean | null;
  disabled?: boolean;
  wastePending?: boolean;
  onSelectEntry: (entryId: string) => void;
  onEdit: () => void;
  onRemove: () => void;
  onToggleWaste: () => void;
  children: ReactNode;
};

export function AgencyReportEntryContextMenu({
  entryId,
  taskTitle,
  durationSeconds,
  taskId,
  taskIsWaste,
  disabled = false,
  wastePending = false,
  onSelectEntry,
  onEdit,
  onRemove,
  onToggleWaste,
  children,
}: AgencyReportEntryContextMenuProps) {
  if (disabled) {
    return children;
  }

  const isWaste = taskIsWaste === true;
  const canMarkWaste = Boolean(taskId);

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (open) onSelectEntry(entryId);
      }}
    >
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-[14rem]">
        <ContextMenuLabel className="font-normal text-muted">
          <span className="block truncate text-foreground">{taskTitle || "No task"}</span>
          <span className={agencyMetricClass}>{formatDuration(durationSeconds, "clock")}</span>
        </ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={onEdit}>
          <Pencil />
          Edit entry
          <ContextMenuShortcut>E</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled={!canMarkWaste || wastePending} onSelect={onToggleWaste}>
          {wastePending ? (
            <Loader2 className="animate-spin motion-reduce:animate-none" />
          ) : (
            <TrashIcon />
          )}
          {isWaste ? "Unmark waste" : "Mark as waste"}
          <ContextMenuShortcut>W</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={onRemove}>
          <Trash2 />
          Remove from report
          <ContextMenuShortcut>Del</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
