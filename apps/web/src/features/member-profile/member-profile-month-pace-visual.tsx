import type { GaugeMonthPaceVisual } from "@/features/member-profile/member-profile-gauge-detail";
import { agencyWorkMetaClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

const TRACK_WIDTH = 320;
const TRACK_X = 0;
const TRACK_Y = 22;
const TRACK_HEIGHT = 10;
const MARKER_TOP = 8;
const MARKER_BOTTOM = 46;

function trackX(hours: number, scaleMax: number): number {
  if (scaleMax <= 0) return TRACK_X;
  return TRACK_X + (Math.min(hours, scaleMax) / scaleMax) * TRACK_WIDTH;
}

function formatPacePerDay(hours: number, onTrack: boolean): string {
  if (onTrack || hours <= 0) return "On track";
  return `${Math.round(hours * 10) / 10}h`;
}

type Props = {
  pace: GaugeMonthPaceVisual;
  className?: string;
};

export function MemberProfileMonthPaceVisual({ pace, className }: Props) {
  const scaleMax = pace.scaleMaxHours;
  const loggedX = trackX(pace.loggedHours, scaleMax);
  const projectedX = trackX(pace.projectedHours, scaleMax);
  const minX = trackX(pace.monthMinHours, scaleMax);
  const targetX = trackX(pace.monthTargetHours, scaleMax);

  const ariaLabel = `${pace.monthLabel}. Logged ${pace.loggedHoursLabel}. Projected ${pace.projectedHoursLabel}. Minimum ${pace.monthMinHours} hours. Target ${pace.monthTargetHours} hours.`;

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{pace.monthLabel}</p>
          <p className={cn(agencyWorkMetaClass, "font-mono tabular-nums")}>
            {pace.elapsedWorkingDays} / {pace.monthWorkingDays} working days
          </p>
        </div>

        <svg
          viewBox={`0 0 ${TRACK_WIDTH} 52`}
          className="h-[3.25rem] w-full text-foreground"
          role="img"
          aria-label={ariaLabel}
        >
          <rect
            x={TRACK_X}
            y={TRACK_Y}
            width={TRACK_WIDTH}
            height={TRACK_HEIGHT}
            rx="2"
            className="fill-muted"
          />
          {projectedX > loggedX ? (
            <rect
              x={TRACK_X}
              y={TRACK_Y}
              width={projectedX - TRACK_X}
              height={TRACK_HEIGHT}
              rx="2"
              className="fill-current opacity-20"
            />
          ) : null}
          {loggedX > TRACK_X ? (
            <rect
              x={TRACK_X}
              y={TRACK_Y}
              width={loggedX - TRACK_X}
              height={TRACK_HEIGHT}
              rx="2"
              className={cn(
                "fill-current",
                pace.onTrackForTarget && "opacity-100",
                pace.onTrackForMin && !pace.onTrackForTarget && "opacity-90",
                !pace.onTrackForMin && "opacity-80 text-warning",
              )}
            />
          ) : null}
          <line
            x1={minX}
            y1={MARKER_TOP}
            x2={minX}
            y2={MARKER_BOTTOM}
            className="stroke-warning"
            strokeWidth="1.5"
            strokeDasharray="3 2"
          />
          <line
            x1={targetX}
            y1={MARKER_TOP}
            x2={targetX}
            y2={MARKER_BOTTOM}
            className="stroke-success"
            strokeWidth="1.5"
            strokeDasharray="3 2"
          />
        </svg>

        <div className="relative mt-1 h-9 text-[0.625rem] font-semibold uppercase tracking-[0.1em]">
          <span
            className="absolute top-0 -translate-x-1/2 text-warning"
            style={{ left: `${(minX / TRACK_WIDTH) * 100}%` }}
          >
            {pace.monthMinHours}h min
          </span>
          <span
            className="absolute top-0 -translate-x-1/2 text-success"
            style={{ left: `${(targetX / TRACK_WIDTH) * 100}%` }}
          >
            {pace.monthTargetHours}h target
          </span>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <dt className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {pace.isSingleMonthScope ? "Logged this month" : "Logged this period"}
          </dt>
          <dd className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-foreground">
            {pace.loggedHoursLabel}
          </dd>
        </div>
        <div>
          <dt className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Projected pace
          </dt>
          <dd
            className={cn(
              "mt-0.5 font-mono text-lg font-semibold tabular-nums",
              pace.onTrackForTarget
                ? "text-success"
                : pace.onTrackForMin
                  ? "text-foreground"
                  : "text-warning",
            )}
          >
            {pace.projectedHoursLabel}
          </dd>
        </div>
      </dl>

      <div className="space-y-2 rounded-lg border border-border bg-muted/25 px-3 py-3">
        <p className="text-xs font-medium text-foreground">Required pace from today</p>
        <div className="flex items-baseline justify-between gap-3">
          <span className={cn(agencyWorkMetaClass, "text-foreground/80")}>
            To hit minimum ({pace.monthMinHours}h)
          </span>
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {formatPacePerDay(pace.paceToMinHoursPerDay, pace.onTrackForMin)}
            {!pace.onTrackForMin && pace.remainingWorkingDays > 0 ? (
              <span className="text-muted-foreground"> / day</span>
            ) : null}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className={cn(agencyWorkMetaClass, "text-foreground/80")}>
            To hit target ({pace.monthTargetHours}h)
          </span>
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {formatPacePerDay(pace.paceToTargetHoursPerDay, pace.onTrackForTarget)}
            {!pace.onTrackForTarget && pace.remainingWorkingDays > 0 ? (
              <span className="text-muted-foreground"> / day</span>
            ) : null}
          </span>
        </div>
        <p className={cn(agencyWorkMetaClass, "pt-0.5 text-foreground/60")}>
          {pace.remainingWorkingDays} working day{pace.remainingWorkingDays === 1 ? "" : "s"} left
          in {pace.monthLabel}
          {pace.offDaysInMonth > 0
            ? ` · ${pace.offDaysInMonth} off day${pace.offDaysInMonth === 1 ? "" : "s"} applied`
            : ""}
        </p>
      </div>
    </div>
  );
}
