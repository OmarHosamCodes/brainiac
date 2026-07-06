import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { BrandMark } from "@/components/shell/brand-mark";
import {
  shellFocusRingClass,
  shellRailIconClass,
  shellRailToggleClass,
} from "@/lib/utils/app-shell-ui";
import { cn } from "@/lib/utils";

type AppShellRailToggleProps = {
  expanded: boolean;
  onClick: () => void;
};

export function AppShellRailToggle({ expanded, onClick }: AppShellRailToggleProps) {
  const ActionIcon = expanded ? PanelLeftClose : PanelLeftOpen;

  return (
    <button
      type="button"
      className={cn(shellRailToggleClass, shellFocusRingClass, "app-shell__rail-toggle group")}
      aria-label={expanded ? "Close sidebar" : "Open sidebar"}
      title={expanded ? "Close sidebar" : "Open sidebar"}
      onClick={onClick}
    >
      <span className="app-shell__rail-toggle-layer app-shell__rail-toggle-layer--brand" aria-hidden="true">
        <BrandMark className="size-5 rounded-[6px]" />
      </span>
      <span className="app-shell__rail-toggle-layer app-shell__rail-toggle-layer--action" aria-hidden="true">
        <ActionIcon className={shellRailIconClass} />
      </span>
    </button>
  );
}
