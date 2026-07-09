import { Handle, NodeResizer, Position, type Node, type NodeProps } from "@xyflow/react";
import { Pencil, ScanSearch, Trash2 } from "lucide-react";
import { memo } from "react";

import { useCanvasFlowContext } from "@/components/canvas/canvas-flow-context";
import {
  NODE_MIN_HEIGHT,
  NODE_MIN_WIDTH,
  type WorkspaceFlowNodeData,
} from "@/lib/canvas/workspace-flow-adapter";
import { getWorkspaceNodeTintStyle } from "@/features/workspace/utils/workspace-node-dashboard";
import { cn } from "@/lib/utils";

export type WorkspaceFlowNode = Node<WorkspaceFlowNodeData, "workspace">;

function WorkspaceFlowNodeComponent({ id, selected, data }: NodeProps<WorkspaceFlowNode>) {
  const { nodes, renderNode, onEditNode, onRemoveNode, onFitNode } = useCanvasFlowContext();

  const workspaceNode = nodes.find((node) => node.id === id);
  if (!workspaceNode) {
    return null;
  }

  const isOrchestrator = data.nodeType === "orchestrator";
  const title = data.title?.trim() || "Untitled node";

  return (
    <div className="relative h-full w-full">
      <NodeResizer
        isVisible={selected}
        minWidth={NODE_MIN_WIDTH}
        minHeight={NODE_MIN_HEIGHT}
        lineClassName="border-primary/50"
        handleClassName="size-2.5 rounded-sm border border-primary bg-default"
      />

      {isOrchestrator ? (
        <Handle
          id="source"
          type="source"
          position={Position.Right}
          className="!size-2.5 !border-primary !bg-primary"
        />
      ) : (
        <Handle
          id="target"
          type="target"
          position={Position.Left}
          className="!size-2.5 !border-primary !bg-default"
        />
      )}

      <div
        className={cn(
          "flex h-full w-full min-h-0 flex-col overflow-hidden rounded-2xl border border-default bg-default",
          selected && "ring-2 ring-primary/40",
        )}
        style={getWorkspaceNodeTintStyle(data.tint)}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-default bg-muted/20 px-4 py-3">
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-highlighted">
            {title}
          </h3>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              className="nodrag nopan inline-flex size-8 items-center justify-center rounded-xl border border-default bg-default text-muted transition-colors hover:bg-elevated hover:text-highlighted"
              aria-label="Edit node"
              title="Edit node"
              onClick={() => onEditNode({ nodeId: id })}
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              className="nodrag nopan inline-flex size-8 items-center justify-center rounded-xl border border-default bg-default text-muted transition-colors hover:bg-error/10 hover:text-error"
              aria-label="Delete node"
              title="Delete node"
              onClick={() => onRemoveNode({ nodeId: id })}
            >
              <Trash2 className="size-4" />
            </button>
            <button
              type="button"
              className="nodrag nopan inline-flex size-8 items-center justify-center rounded-xl border border-default bg-default text-muted transition-colors hover:bg-elevated hover:text-highlighted"
              aria-label="Focus node"
              title="Focus node"
              onClick={() => onFitNode(id)}
            >
              <ScanSearch className="size-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden p-1">
          {renderNode(workspaceNode, selected, nodes)}
        </div>
      </div>
    </div>
  );
}

export const WorkspaceFlowNode = memo(WorkspaceFlowNodeComponent);
