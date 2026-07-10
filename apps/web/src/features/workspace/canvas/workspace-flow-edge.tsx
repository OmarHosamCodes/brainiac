import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import { Unlink } from "lucide-react";
import { memo } from "react";

import { useCanvasFlowContext } from "@/features/workspace/canvas/canvas-flow-context";
import type { WorkspaceFlowEdgeData } from "@/features/workspace/canvas/workspace-flow-adapter";

export type WorkspaceFlowEdgeType = Edge<WorkspaceFlowEdgeData, "workspace">;

function WorkspaceFlowEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<WorkspaceFlowEdgeType>) {
  const { onDisconnectNodePair } = useCanvasFlowContext();

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });

  if (!data) {
    return null;
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        className={selected ? "stroke-primary" : "stroke-primary/50"}
        style={{
          strokeWidth: 2,
          strokeDasharray: "6 6",
        }}
      />
      <EdgeLabelRenderer>
        <button
          type="button"
          className="nodrag nopan pointer-events-auto absolute inline-flex size-6 items-center justify-center rounded-full border border-default bg-default text-muted shadow-sm transition hover:border-error/60 hover:text-error"
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          aria-label="Remove connection"
          title="Remove connection"
          onClick={(event) => {
            event.stopPropagation();
            onDisconnectNodePair({
              orchestratorNodeId: data.orchestratorNodeId,
              standardNodeId: data.standardNodeId,
            });
          }}
        >
          <Unlink className="size-3" />
        </button>
      </EdgeLabelRenderer>
    </>
  );
}

export const WorkspaceFlowEdge = memo(WorkspaceFlowEdgeComponent);
