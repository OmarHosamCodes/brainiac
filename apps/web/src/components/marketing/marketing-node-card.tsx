import { getWorkspaceNodePreview, type WorkspaceNode } from "@orch/workspace";

import { getWorkspaceNodeTintStyle } from "@/features/workspace/utils/workspace-node-dashboard";
import { cn } from "@/lib/utils";

type MarketingNodeCardProps = {
  node: WorkspaceNode;
  selected?: boolean;
  className?: string;
};

export function MarketingNodeCard({ node, selected = false, className }: MarketingNodeCardProps) {
  const preview = getWorkspaceNodePreview(node, 180);
  const tintStyle = getWorkspaceNodeTintStyle(node.dashboard.tint);

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-xl border border-default bg-elevated text-xs shadow-sm",
        selected && "ring-2 ring-primary/35",
        className,
      )}
      style={tintStyle}
    >
      <div className="border-b border-default px-3 py-2 font-semibold text-highlighted">
        {node.title}
      </div>
      <div className="flex-1 px-3 py-2 text-[11px] leading-relaxed text-muted line-clamp-5">
        {preview}
      </div>
    </div>
  );
}
