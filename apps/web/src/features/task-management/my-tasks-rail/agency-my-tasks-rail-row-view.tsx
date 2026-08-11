import { Check, MoreVertical } from "lucide-react";
import { motion, type Variants } from "motion/react";
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
import {
  railLayoutTransition,
  railRowStateTransition,
} from "@/features/task-management/my-tasks-rail/agency-my-tasks-rail-motion";
import { formatEstimateMinutes } from "@/features/task-management/agency-task-estimate";
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
  estimateMinutes: number | null;
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
  variants: Variants;
  stagger: number;
};

export function AgencyMyTasksRailRowView({
  taskId,
  title,
  projectName,
  assignedByLabel,
  estimateMinutes,
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
  variants,
  stagger,
}: AgencyMyTasksRailRowViewProps) {
  const estimateLabel =
    estimateMinutes !== null && estimateMinutes > 0 ? formatEstimateMinutes(estimateMinutes) : null;

  return (
    <motion.li
      layout
      layoutDependency={isDone}
      variants={variants}
      custom={stagger}
      initial="hidden"
      animate="show"
      exit="exit"
      transition={railLayoutTransition}
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
        if (event.key !== "Enter") return;
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        onSelect();
        onPlayEnter();
      }}
    >
      <motion.button
        type="button"
        role="checkbox"
        aria-checked={isDone}
        aria-label={isDone ? `Reopen ${title}` : `Mark ${title} done`}
        disabled={pending}
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-md",
          "transition-colors hover:bg-default/80",
        )}
        animate={{ scale: completeFlash ? 1.08 : 1 }}
        transition={railRowStateTransition}
        onClick={(event) => {
          event.stopPropagation();
          onToggleComplete();
        }}
      >
        <motion.span
          layout
          className={cn(
            agencyTaskRowCheckboxClass,
            isDone && agencyTaskRowCheckboxCheckedClass,
            completeFlash && agencyMyTasksCheckPopClass,
          )}
          aria-hidden
          initial={false}
          animate={{
            scale: isDone ? 1 : 0.92,
            opacity: isDone ? 1 : 0.85,
          }}
          transition={railRowStateTransition}
        >
          {isDone ? <Check className="size-2" strokeWidth={3} /> : null}
        </motion.span>
      </motion.button>

      <div className="min-w-0">
        <motion.div
          className={cn("truncate text-sm font-medium text-foreground")}
          initial={false}
          animate={{
            opacity: isDone ? 0.65 : 1,
            x: isDone ? 2 : 0,
          }}
          transition={railRowStateTransition}
          style={{
            textDecorationLine: isDone ? "line-through" : "none",
            textDecorationColor:
              "color-mix(in oklch, var(--color-muted-foreground) 80%, transparent)",
          }}
        >
          {title}
        </motion.div>
        <motion.div
          className="mt-0.5 truncate text-xs text-muted"
          initial={false}
          animate={{ opacity: isDone ? 0.55 : 1 }}
          transition={railRowStateTransition}
        >
          Assigned by {assignedByLabel} · {projectName}
          {estimateLabel ? ` · ${estimateLabel}` : null}
        </motion.div>
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
    </motion.li>
  );
}
