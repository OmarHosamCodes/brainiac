import type { KeyboardEvent, ReactNode } from "react";

import type { AgencyWorkSurfaceTab } from "@/features/task-management/agency-work";
import {
  agencyWorkTabActiveClass,
  agencyWorkTabBarClass,
  agencyWorkTabClass,
  agencyWorkTabShellClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

const TABS: Array<{ id: AgencyWorkSurfaceTab; label: string }> = [
  { id: "sessions", label: "Sessions" },
  { id: "tasks", label: "Tasks" },
];

type AgencyWorkSurfaceTabsViewProps = {
  activeTab: AgencyWorkSurfaceTab;
  onTabChange: (tab: AgencyWorkSurfaceTab) => void;
  createTaskControl: ReactNode;
};

export function AgencyWorkSurfaceTabsView({
  activeTab,
  onTabChange,
  createTaskControl,
}: AgencyWorkSurfaceTabsViewProps) {
  function selectTab(tab: AgencyWorkSurfaceTab) {
    if (tab === activeTab) return;
    onTabChange(tab);
  }

  function handleTabKeydown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const lastIndex = TABS.length - 1;
    let nextIndex = index;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      nextIndex = index >= lastIndex ? 0 : index + 1;
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      nextIndex = index <= 0 ? lastIndex : index - 1;
    } else if (event.key === "Home") {
      event.preventDefault();
      nextIndex = 0;
    } else if (event.key === "End") {
      event.preventDefault();
      nextIndex = lastIndex;
    } else {
      return;
    }

    const nextTab = TABS[nextIndex];
    if (!nextTab) return;
    selectTab(nextTab.id);
    const tablist = event.currentTarget.closest('[role="tablist"]');
    tablist?.querySelector<HTMLElement>(`#agency-work-tab-${CSS.escape(nextTab.id)}`)?.focus();
  }

  return (
    <div className={agencyWorkTabShellClass}>
      <div className={agencyWorkTabBarClass}>
        <div
          role="tablist"
          aria-label="Work surface"
          className="flex min-w-0 flex-1 items-center overflow-x-auto no-scrollbar"
        >
          {TABS.map((tab, index) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`agency-work-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`agency-work-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                className={cn(agencyWorkTabClass, selected && agencyWorkTabActiveClass)}
                onClick={() => selectTab(tab.id)}
                onKeyDown={(event) => handleTabKeydown(event, index)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {createTaskControl}
      </div>
    </div>
  );
}
