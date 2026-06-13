/** Shared Tailwind class strings for the Dashboard spatial register. */

import {
  shellEmptyPanelClass,
  shellErrorPanelClass,
  shellFocusRingClass,
  shellLabelClass,
} from "~/utils/app-shell-ui";

export const dashboardLabelClass = shellLabelClass;

export const dashboardPanelClass = "border-t border-default pt-4 mt-4";

export const dashboardStatusBadgeClass =
  "rounded-full border px-3 py-1 text-[11px] font-bold";

export const dashboardErrorAlertClass = "pointer-events-auto max-w-xs";

export const dashboardFocusRingClass = shellFocusRingClass;

export const dashboardEmptyPanelClass = shellEmptyPanelClass;
