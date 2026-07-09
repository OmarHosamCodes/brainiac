import type { ReactNode } from "react";
import { agencyTimePaneStackClass } from "@/lib/utils/agency-ui";

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
      {tabBar}
      {contentPane}
    </div>
  );
}
