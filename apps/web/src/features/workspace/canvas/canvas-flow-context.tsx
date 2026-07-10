import { createContext, useContext, type ReactNode } from "react";

import type { CanvasNodeModel } from "@/features/workspace/canvas/canvas-types";

export type CanvasFlowContextValue = {
  nodes: CanvasNodeModel[];
  renderNode: (node: CanvasNodeModel, selected: boolean, allNodes: CanvasNodeModel[]) => ReactNode;
  onEditNode: (payload: { nodeId: string }) => void;
  onRemoveNode: (payload: { nodeId: string }) => void;
  onOpenNode: (payload: { nodeId: string }) => void;
  onFitNode: (nodeId: string) => void;
  onDisconnectNodePair: (payload: { orchestratorNodeId: string; standardNodeId: string }) => void;
};

const CanvasFlowContext = createContext<CanvasFlowContextValue | null>(null);

export function CanvasFlowProvider({
  value,
  children,
}: {
  value: CanvasFlowContextValue;
  children: ReactNode;
}) {
  return <CanvasFlowContext.Provider value={value}>{children}</CanvasFlowContext.Provider>;
}

export function useCanvasFlowContext() {
  const context = useContext(CanvasFlowContext);
  if (!context) {
    throw new Error("useCanvasFlowContext must be used within CanvasFlowProvider");
  }
  return context;
}
