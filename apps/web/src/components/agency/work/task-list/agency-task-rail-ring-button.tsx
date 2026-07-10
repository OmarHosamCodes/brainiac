import { PanelLeftClose } from "lucide-react";

import { agencyFocusRingClass, agencyMetricClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

export const AGENCY_TASK_RAIL_RING_SIZE = 44;
const RING_STROKE = 2.5;
const RING_RADIUS = (AGENCY_TASK_RAIL_RING_SIZE - RING_STROKE) / 2 - 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type AgencyTaskRailRingButtonProps = {
  activeCount: number | null;
  doneCount: number | null;
  totalCount: number | null;
  ariaLabel: string;
  onClick: () => void;
  className?: string;
};

export function AgencyTaskRailRingButton({
  activeCount,
  doneCount,
  totalCount,
  ariaLabel,
  onClick,
  className,
}: AgencyTaskRailRingButtonProps) {
  const total = totalCount ?? 0;
  const done = doneCount ?? 0;
  const progress = total > 0 ? done / total : 0;
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);
  const countLabel = activeCount === null ? "—" : activeCount;

  return (
    <button
      type="button"
      className={cn(
        "group relative z-10 flex size-11 shrink-0 items-center justify-center rounded-xl border border-default bg-default text-muted transition-colors hover:bg-elevated hover:text-highlighted",
        agencyFocusRingClass,
        "motion-reduce:transition-none",
        className,
      )}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <svg
        className="pointer-events-none absolute inset-0 size-full"
        viewBox={`0 0 ${AGENCY_TASK_RAIL_RING_SIZE} ${AGENCY_TASK_RAIL_RING_SIZE}`}
        aria-hidden
      >
        <circle
          cx={AGENCY_TASK_RAIL_RING_SIZE / 2}
          cy={AGENCY_TASK_RAIL_RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={RING_STROKE}
          className="stroke-border"
        />
        {total > 0 ? (
          <circle
            cx={AGENCY_TASK_RAIL_RING_SIZE / 2}
            cy={AGENCY_TASK_RAIL_RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            className="stroke-primary motion-safe:transition-[stroke-dashoffset] motion-safe:duration-300 motion-reduce:transition-none"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${AGENCY_TASK_RAIL_RING_SIZE / 2} ${AGENCY_TASK_RAIL_RING_SIZE / 2})`}
          />
        ) : null}
      </svg>

      <span
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
          "group-hover:scale-90 group-hover:opacity-0 group-focus-visible:scale-90 group-focus-visible:opacity-0",
          agencyMetricClass,
          "text-xs font-semibold text-highlighted",
        )}
        aria-hidden
      >
        {countLabel}
      </span>
      <span
        className={cn(
          "pointer-events-none absolute inset-0 flex scale-90 items-center justify-center opacity-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
          "group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100",
        )}
        aria-hidden
      >
        <PanelLeftClose className="size-3.5" />
      </span>
    </button>
  );
}
