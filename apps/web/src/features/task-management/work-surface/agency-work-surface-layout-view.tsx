import type { ReactNode } from "react";

import { agencyTimePaneBodyClass, agencyTimePaneStackClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyWorkSurfaceLayoutViewProps = {
  trackerPane: ReactNode;
  contentPane: ReactNode;
  taskRail?: ReactNode;
};

export function AgencyWorkSurfaceLayoutView({
  trackerPane,
  contentPane,
  taskRail,
}: AgencyWorkSurfaceLayoutViewProps) {
  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 font-sans lg:flex-row lg:gap-5"
      data-agency-work-surface
    >
      <div className={cn(agencyTimePaneStackClass, "min-h-0 min-w-0 flex-1 basis-0")}>
        {trackerPane}
        <div className={agencyTimePaneBodyClass}>{contentPane}</div>
      </div>
      {taskRail}
    </div>
  );
}
