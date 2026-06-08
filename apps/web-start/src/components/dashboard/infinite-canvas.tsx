import { useEffect, useRef, useState } from "react";
import { type WorkspaceNode } from "@brainiac/workspace";
import { WorkspaceNodeCard } from "./workspace-node-card";

type InfiniteCanvasProps = {
  nodes: WorkspaceNode[];
  selectedNodeIds: string[];
  onNodeSelect: (nodeId: string) => void;
  onCanvasClick: (x: number, y: number) => void;
  onNodeEdit: (nodeId: string) => void;
  onNodeDelete: (nodeId: string) => void;
  viewState?: {
    translateX: number;
    translateY: number;
    scale: number;
  };
  onViewStateChange?: (state: { translateX: number; translateY: number; scale: number }) => void;
};

export function InfiniteCanvas({
  nodes,
  selectedNodeIds,
  onNodeSelect,
  onCanvasClick,
  onNodeEdit,
  onNodeDelete,
  viewState = { translateX: 0, translateY: 0, scale: 1 },
  onViewStateChange,
}: InfiniteCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [localViewState, setLocalViewState] = useState(viewState);

  // Sync with prop changes
  useEffect(() => {
    setLocalViewState(viewState);
  }, [viewState]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 1 && e.button !== 2) return; // Middle or right click
    if ((e.target as HTMLElement).closest("[data-draggable]")) return;

    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    setLocalViewState((prev) => ({
      ...prev,
      translateX: prev.translateX + dx,
      translateY: prev.translateY + dy,
    }));

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    onViewStateChange?.(localViewState);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, [role='button']")) return;
    if (isDragging) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - localViewState.translateX) / localViewState.scale;
    const y = (e.clientY - rect.top - localViewState.translateY) / localViewState.scale;

    onCanvasClick(x, y);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(3, localViewState.scale * delta));

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const oldTranslateX = localViewState.translateX;
    const oldTranslateY = localViewState.translateY;
    const oldScale = localViewState.scale;

    const newTranslateX = mouseX - ((mouseX - oldTranslateX) / oldScale) * newScale;
    const newTranslateY = mouseY - ((mouseY - oldTranslateY) / oldScale) * newScale;

    setLocalViewState({
      translateX: newTranslateX,
      translateY: newTranslateY,
      scale: newScale,
    });
  };

  return (
    <div
      ref={canvasRef}
      className="w-full h-full bg-gradient-to-br from-background to-muted overflow-hidden cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      onWheel={handleWheel}
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          transform: `translate(${localViewState.translateX}px, ${localViewState.translateY}px) scale(${localViewState.scale})`,
          transformOrigin: "0 0",
        }}
      >
        {/* Grid background */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-muted-foreground/30"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${localViewState.translateX}px, ${localViewState.translateY}px) scale(${localViewState.scale})`,
          transformOrigin: "0 0",
        }}
      >
        <div className="relative w-full h-full">
          {nodes.map((node) => (
            <div
              key={node.id}
              className="absolute pointer-events-auto"
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
                width: `${node.width}px`,
                minHeight: `${node.height}px`,
              }}
              data-draggable
            >
              <WorkspaceNodeCard
                node={node}
                isSelected={selectedNodeIds.includes(node.id)}
                onSelect={onNodeSelect}
                onEdit={onNodeEdit}
                onDelete={onNodeDelete}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
