import { cn } from "@/lib/utils";
import {
  agencyFocusRingClass,
  agencyMetricClass,
  agencyTaskRailTrackingStripClass,
} from "@/lib/utils/agency-ui";

type AgencyWorkSurfaceTimerStripViewProps = {
  mobileTrackingLabel: string;
  onOpenTimePane: () => void;
};

export function AgencyWorkSurfaceTimerStripView({
  mobileTrackingLabel,
  onOpenTimePane,
}: AgencyWorkSurfaceTimerStripViewProps) {
  return (
    <div className={cn("lg:hidden", agencyTaskRailTrackingStripClass)}>
      <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
      <span className={cn("flex-1 font-mono tabular-nums", agencyMetricClass)}>
        Tracking · {mobileTrackingLabel}
      </span>
      <button
        type="button"
        className={cn(
          "shrink-0 text-xs font-semibold text-primary underline-offset-2 hover:underline",
          agencyFocusRingClass,
          "motion-reduce:transition-none",
        )}
        onClick={onOpenTimePane}
      >
        View timer
      </button>
    </div>
  );
}
