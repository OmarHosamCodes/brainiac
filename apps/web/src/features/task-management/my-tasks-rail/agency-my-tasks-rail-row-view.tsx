import { Check, MoreVertical } from "lucide-react";
import type { ReactNode, KeyboardEvent } from "react";

import {
  agencyMyTasksCheckPopClass,
  agencyMyTasksCreateFlashClass,
  agencyMyTasksRailRowClass,
  agencyMyTasksRailRowDoneClass,
  agencyMyTasksRailRowSelectedClass,
  agencyMyTasksRailRowTrackingClass,
  agencyMyTasksRailRowTrackingPulseClass,
  agencyTaskRowCheckboxCheckedClass,
  agencyTaskRowCheckboxClass,
  agencyTaskRowCompleteClass,
} from "@/features/shared/agency-ui";
import { Button } from "@/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type AgencyMyTasksRailRowViewProps = {
  taskId: string;
  title: string;
  projectName: string;
  assignedByLabel: string;
  isDone: boolean;
  isSelected: boolean;
  isTracking: boolean;
  playPulse: boolean;
  completeFlash: boolean;
  createFlash: boolean;
  pending: boolean;
  miniTimer: ReactNode;
  onSelect: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
  onPlayEnter: () => void;
};

export function AgencyMyTasksRailRowView({
  taskId,
  title,
  projectName,
  assignedByLabel,
  isDone,
  isSelected,
  isTracking,
  playPulse,
  completeFlash,
  createFlash,
  pending,
  miniTimer,
  onSelect,
  onToggleComplete,
  onDelete,
  onPlayEnter,
}: AgencyMyTasksRailRowViewProps) {
  return (
    <li
      data-task-id={taskId}
      tabIndex={0}
      aria-selected={isSelected}
      className={cn(
        agencyMyTasksRailRowClass,
        "group/row",
        isDone && agencyMyTasksRailRowDoneClass,
        isSelected && agencyMyTasksRailRowSelectedClass,
        isTracking && agencyMyTasksRailRowTrackingClass,
        playPulse && agencyMyTasksRailRowTrackingPulseClass,
        completeFlash && agencyTaskRowCompleteClass,
        createFlash && agencyMyTasksCreateFlashClass,
        pending && "opacity-60",
      )}
      onClick={onSelect}
      onKeyDown={(event: KeyboardEvent<HTMLLIElement>) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onSelect();
          onPlayEnter();
        }
      }}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={isDone}
        aria-label={isDone ? `Reopen ${title}` : `Mark ${title} done`}
        disabled={pending}
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-md",
          "transition-colors hover:bg-default/80",
        )}
        onClick={(event) => {
          event.stopPropagation();
          onToggleComplete();
        }}
      >
        <span
          className={cn(
            agencyTaskRowCheckboxClass,
            isDone && agencyTaskRowCheckboxCheckedClass,
            completeFlash && agencyMyTasksCheckPopClass,
          )}
          aria-hidden
        >
          {isDone ? <Check className="size-2" strokeWidth={3} /> : null}
        </span>
      </button>

      <div className="min-w-0">
        <div
          className={cn(
            "truncate text-sm font-medium text-foreground",
            isDone && "text-muted line-through decoration-muted/80",
          )}
        >
          {title}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-muted">
          Assigned by {assignedByLabel} · {projectName}
        </div>
      </div>

      <div
        className={cn(
          "flex items-center gap-0.5 opacity-0 transition-opacity",
          "group-hover/row:opacity-100 group-focus-within/row:opacity-100",
          (isSelected || isTracking) && "opacity-100",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {miniTimer}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`More actions for ${title}`}
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" disabled={pending} onClick={onDelete}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
