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
    <div className="flex items-center gap-4 rounded-2xl border border-default bg-default px-4 py-3 transition-colors">
      <div className="flex size-10 items-center justify-center rounded-xl border border-default bg-muted text-highlighted">
        <LayoutGrid className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-[10px] font-bold uppercase leading-none tracking-[0.2em] text-muted">
          {userName ? `${userName}'s Workspace` : "Personal Workspace"}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-highlighted">{nodesCount} Nodes</span>
          <div className="size-1 rounded-full bg-muted" />
          <div
            className={cn(
              "rounded-md border border-default bg-muted px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-muted",
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
