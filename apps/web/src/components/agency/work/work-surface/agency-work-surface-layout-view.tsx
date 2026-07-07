import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

import type { AgencyWorkMobilePane } from "@/lib/schemas/agency-work";
import {
  agencyTaskRailCollapsedWidthClass,
  agencyTaskRailExpandedWidthClass,
  agencyTimePaneStackClass,
} from "@/lib/utils/agency-ui";

type AgencyWorkSurfaceLayoutViewProps = {
  selectedTaskId: string;
  mobilePane: AgencyWorkMobilePane;
  taskRailCollapsed: boolean;
  mobileTabs: ReactNode;
  timerStrip: ReactNode;
  taskRail: ReactNode;
  taskThread: ReactNode;
  timePane: ReactNode;
};

export function AgencyWorkSurfaceLayoutView({
  selectedTaskId,
  mobilePane,
  taskRailCollapsed,
  mobileTabs,
  timerStrip,
  taskRail,
  taskThread,
  timePane,
}: AgencyWorkSurfaceLayoutViewProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row lg:items-stretch">
      {!selectedTaskId ? mobileTabs : null}
      {timerStrip}

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-col overflow-hidden transition-[width,max-width] duration-200 ease-out motion-reduce:transition-none lg:flex-none",
          taskRailCollapsed ? agencyTaskRailCollapsedWidthClass : agencyTaskRailExpandedWidthClass,
          selectedTaskId ? "hidden lg:flex" : "",
          !selectedTaskId && mobilePane !== "tasks" ? "hidden lg:flex" : "",
        )}
      >
        {taskRail}
      </div>

      {selectedTaskId ? (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{taskThread}</div>
      ) : (
        <div
          className={cn(
            agencyTimePaneStackClass,
            "min-h-0 min-w-0 flex-1 overflow-hidden",
            mobilePane !== "time" ? "hidden lg:flex" : "flex",
          )}
        >
          {timePane}
        </div>
      )}
    </div>
  );
}
