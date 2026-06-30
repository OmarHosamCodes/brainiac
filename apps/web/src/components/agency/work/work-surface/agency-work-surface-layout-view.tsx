import type { ReactNode } from "react";

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
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
      {!selectedTaskId ? mobileTabs : null}
      {timerStrip}

      <div
        className={[
          "min-h-0 min-w-0 transition-[width,max-width] duration-200 ease-out motion-reduce:transition-none lg:sticky lg:top-0 lg:h-full lg:flex-none lg:self-start",
          taskRailCollapsed ? agencyTaskRailCollapsedWidthClass : agencyTaskRailExpandedWidthClass,
          selectedTaskId ? "hidden lg:block" : "",
          !selectedTaskId && mobilePane !== "tasks" ? "hidden lg:block" : "",
        ].join(" ")}
      >
        {taskRail}
      </div>

      {selectedTaskId ? (
        <div className="min-h-0 min-w-0 flex-1 lg:h-full">{taskThread}</div>
      ) : (
        <div
          className={[
            agencyTimePaneStackClass,
            "min-h-0 min-w-0 flex-1",
            mobilePane !== "time" ? "hidden lg:flex" : "flex",
          ].join(" ")}
        >
          {timePane}
        </div>
      )}
    </div>
  );
}
