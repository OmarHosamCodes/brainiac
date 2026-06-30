import { Skeleton } from "@/components/ui/skeleton";
import { agencyTaskRailExpandedWidthClass } from "@/lib/utils/agency-ui";
import { shellLoadingPanelClass } from "@/lib/utils/app-shell-ui";
import { cn } from "@/lib/utils";

export function AgencyWorkSurfaceLoadingView() {
  return (
    <div
      className={[shellLoadingPanelClass, "flex h-full min-h-0 flex-col gap-4"].join(" ")}
      aria-busy="true"
      aria-label="Loading work data"
    >
      <Skeleton className="h-10 w-full rounded-xl lg:hidden" />
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <Skeleton
          className={cn("h-full min-h-48 w-full rounded-xl lg:shrink-0", agencyTaskRailExpandedWidthClass)}
        />
        <Skeleton className="h-full min-h-48 flex-1 rounded-xl" />
      </div>
    </div>
  );
}
