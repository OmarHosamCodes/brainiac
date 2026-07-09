import type { ReactNode } from "react";
import { agencyTimePaneBodyClass, agencyTimePaneStackClass } from "@/features/shared/agency-ui";

type AgencyWorkSurfaceLayoutViewProps = {
  trackerPane: ReactNode;
  tabBar: ReactNode;
  contentPane: ReactNode;
};

export function AgencyWorkSurfaceLayoutView({
  trackerPane,
  tabBar,
  contentPane,
}: AgencyWorkSurfaceLayoutViewProps) {
  return (
    <div className={agencyTimePaneStackClass}>
      {trackerPane}
      <div className={agencyTimePaneBodyClass}>
        {tabBar}
        {contentPane}
      </div>
    </div>
  );
}
