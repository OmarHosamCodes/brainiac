import { BrandMark } from "@/components/shell/brand-mark";
import { agencyFocusRingClass, agencyMetricClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

const RING_SIZE = 44;
const RING_STROKE = 2.5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2 - 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type AgencyTaskRailExpandButtonProps = {
  activeCount: number | null;
  doneCount: number | null;
  totalCount: number | null;
  onClick: () => void;
};

export function AgencyTaskRailExpandButton({
  activeCount,
  doneCount,
  totalCount,
  onClick,
}: AgencyTaskRailExpandButtonProps) {
  const total = totalCount ?? 0;
  const done = doneCount ?? 0;
  const progress = total > 0 ? done / total : 0;
  const dashOffset = RING_CIRCUMFERENCE * (1 - progress);

  const countLabel = activeCount === null ? "—" : activeCount;
  const ariaLabel =
    activeCount === null
      ? "Expand task list"
      : `Expand task list, ${activeCount} open ${activeCount === 1 ? "task" : "tasks"}`;

  return (
    <button
      type="button"
      className={cn(
        "group relative z-10 flex size-11 items-center justify-center rounded-xl border border-default bg-default text-muted transition-colors hover:bg-elevated hover:text-highlighted",
        agencyFocusRingClass,
        "motion-reduce:transition-none",
      )}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <svg
        className="pointer-events-none absolute inset-0 size-full"
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        aria-hidden
      >
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={RING_STROKE}
          className="stroke-border"
        />
        {progress > 0 ? (
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={RING_STROKE}
            strokeLinecap="round"
            className="stroke-success motion-safe:transition-[stroke-dashoffset] motion-safe:duration-300 motion-reduce:transition-none"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
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
        <BrandMark className="size-5 rounded-[6px]" />
      </span>
    </button>
  );
}
