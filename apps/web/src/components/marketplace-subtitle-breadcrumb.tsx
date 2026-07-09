import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import {
  shellBreadcrumbCurrentClass,
  shellFocusRingClass,
  shellTopbarChipClass,
} from "@/lib/utils/app-shell-ui";

type MarketplaceFilterTab = {
  label: string;
  kind: string;
  icon: LucideIcon;
};

type MarketplaceSubtitleBreadcrumbProps = {
  tabs: readonly MarketplaceFilterTab[];
  activeKind: string;
  onKindChange: (kind: string) => void;
};

export function MarketplaceSubtitleBreadcrumb({
  tabs,
  activeKind,
  onKindChange,
}: MarketplaceSubtitleBreadcrumbProps) {
  const [open, setOpen] = useState(false);
  const activeTab = tabs.find((tab) => tab.kind === activeKind) ?? tabs[0]!;

  function selectKind(kind: string) {
    setOpen(false);
    if (kind === activeKind) return;
    onKindChange(kind);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            shellTopbarChipClass,
            shellFocusRingClass,
            shellBreadcrumbCurrentClass,
            "max-w-[11rem]",
          )}
        >
          <activeTab.icon className="size-3.5 shrink-0 text-muted" />
          <span className="truncate">{activeTab.label}</span>
          <ChevronDown className="size-3 shrink-0 text-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.kind}
              type="button"
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-muted transition-colors hover:bg-elevated hover:text-highlighted",
                tab.kind === activeKind ? "bg-primary/10 text-primary" : "",
              )}
              onClick={() => selectKind(tab.kind)}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <Icon className="size-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </span>
              {tab.kind === activeKind ? <Check className="size-3.5 shrink-0" /> : null}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
