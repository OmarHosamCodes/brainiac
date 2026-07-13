import type { ReactNode } from "react";
import { agencyTimePaneBodyClass, agencyTimePaneStackClass } from "@/features/shared/agency-ui";

type AgencyWorkSurfaceLayoutViewProps = {
  trackerPane: ReactNode;
  contentPane: ReactNode;
};

export function AgencyWorkSurfaceLayoutView({
  trackerPane,
  contentPane,
}: AgencyWorkSurfaceLayoutViewProps) {
  return (
    <div className={agencyTimePaneStackClass} data-agency-work-surface>
      {trackerPane}
      <div className={agencyTimePaneBodyClass}>{contentPane}</div>
    </div>
  );
}
