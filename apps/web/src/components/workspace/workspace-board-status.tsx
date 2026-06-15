import { LayoutGrid } from "lucide-react";

import type { WorkspaceSaveBadge } from "@/stores/workspace";
import { cn } from "@/lib/utils";

type WorkspaceBoardStatusProps = {
  badge: WorkspaceSaveBadge;
  nodesCount: number;
  userName?: string | null;
};

export function WorkspaceBoardStatus({ badge, nodesCount, userName }: WorkspaceBoardStatusProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-neutral-200/50 bg-white/70 px-4 py-3 shadow-2xl backdrop-blur-xl transition-all duration-300 dark:border-neutral-800/50 dark:bg-neutral-950/70">
      <div className="flex size-10 items-center justify-center rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">
        <LayoutGrid className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[10px] font-bold uppercase leading-none tracking-[0.2em] text-neutral-400">
          {userName ? `${userName}'s Workspace` : "Personal Workspace"}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            {nodesCount} Nodes
          </span>
          <div className="size-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          <div
            className={cn(
              "rounded-md border border-neutral-200/50 bg-neutral-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-neutral-500 dark:border-neutral-800/50 dark:bg-neutral-900",
              badge.className,
            )}
          >
            {badge.label}
          </div>
        </div>
      </div>
    </div>
  );
}
