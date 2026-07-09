import { CheckCircle2, ClipboardList, Clock, Plus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AgencyWorkSurfaceTab } from "@/lib/schemas/agency-work";
import {
  agencyFocusRingClass,
  agencyWorkTabActiveClass,
  agencyWorkTabBarClass,
  agencyWorkTabClass,
  agencyWorkTabShellClass,
} from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

const TABS: Array<{
  id: AgencyWorkSurfaceTab;
  label: string;
  icon: typeof Clock;
}> = [
  { id: "sessions", label: "Sessions", icon: Clock },
  { id: "my-tasks", label: "My Tasks", icon: ClipboardList },
  { id: "done", label: "Done", icon: CheckCircle2 },
  { id: "delegated", label: "Delegated", icon: Users },
];

type AgencyWorkSurfaceTabsViewProps = {
  activeTab: AgencyWorkSurfaceTab;
  onTabChange: (tab: AgencyWorkSurfaceTab) => void;
  onAddNewTask: () => void;
};

export function AgencyWorkSurfaceTabsView({
  activeTab,
  onTabChange,
  onAddNewTask,
}: AgencyWorkSurfaceTabsViewProps) {
  return (
    <div className={agencyWorkTabShellClass}>
      <div className={agencyWorkTabBarClass}>
        <div
          role="tablist"
          aria-label="Work surface"
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto no-scrollbar"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`agency-work-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`agency-work-panel-${tab.id}`}
                className={cn(agencyWorkTabClass, selected && agencyWorkTabActiveClass)}
                onClick={() => onTabChange(tab.id)}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {tab.label}
              </button>
            );
          })}
        </div>

        <Button
          size="sm"
          className={cn("h-9 shrink-0 rounded-xl px-3", agencyFocusRingClass)}
          onClick={onAddNewTask}
        >
          <Plus className="size-4" aria-hidden />
          Add New Task
        </Button>
      </div>
    </div>
  );
}
