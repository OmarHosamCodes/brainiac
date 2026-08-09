import { Outlet, useLocation } from "@/lib/navigation";

import { RouteNotFound } from "@/features/app-shell/route-status";
import {
  agencyManagementPaneFromPathname,
  agencyManagementPaneLabel,
} from "@/features/shared/agency-management-sections";

export function AgencyManagementLayoutPage() {
  const location = useLocation();
  const pane = agencyManagementPaneFromPathname(location.pathname);
  if (!pane) return <RouteNotFound />;

  return (
    <div
      className="bg-background flex min-h-0 min-w-0 flex-1 flex-col overflow-auto px-5 py-6 sm:px-8 sm:py-7"
      aria-label={agencyManagementPaneLabel(pane)}
    >
      <Outlet />
    </div>
  );
}
