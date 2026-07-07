import type { AgencyWorkMobilePane } from "@/lib/schemas/agency-work";
import { cn } from "@/lib/utils";

type AgencyWorkSurfaceMobileTabsViewProps = {
  mobilePane: AgencyWorkMobilePane;
  onMobilePaneChange: (pane: AgencyWorkMobilePane) => void;
  onOpenTimePane: () => void;
};

export function AgencyWorkSurfaceMobileTabsView({
  mobilePane,
  onMobilePaneChange,
  onOpenTimePane,
}: AgencyWorkSurfaceMobileTabsViewProps) {
  return (
    <div
      className="inline-flex rounded-full border border-default bg-elevated p-1 lg:hidden"
      role="tablist"
      aria-label="Work panes"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mobilePane === "tasks"}
        className={cn(
          "rounded-full px-3 py-1 text-[11px] font-bold transition-colors motion-reduce:transition-none",
          mobilePane === "tasks" ? "bg-default text-highlighted" : "text-muted",
        )}
        onClick={() => onMobilePaneChange("tasks")}
      >
        Tasks
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mobilePane === "time"}
        className={cn(
          "rounded-full px-3 py-1 text-[11px] font-bold transition-colors motion-reduce:transition-none",
          mobilePane === "time" ? "bg-default text-highlighted" : "text-muted",
        )}
        onClick={onOpenTimePane}
      >
        Time
      </button>
    </div>
  );
}
