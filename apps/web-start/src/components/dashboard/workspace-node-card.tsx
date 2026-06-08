import { type WorkspaceNode } from "@brainiac/workspace";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit2, Trash2, Share2 } from "lucide-react";

type WorkspaceNodeCardProps = {
  node: WorkspaceNode;
  isSelected: boolean;
  onSelect: (nodeId: string) => void;
  onEdit: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onShare?: (nodeId: string) => void;
  isDragging?: boolean;
};

const TINT_COLORS: Record<string, string> = {
  neutral: "bg-zinc-100 border-zinc-300",
  emerald: "bg-emerald-50 border-emerald-300",
  blue: "bg-blue-50 border-blue-300",
  amber: "bg-amber-50 border-amber-300",
  red: "bg-red-50 border-red-300",
  purple: "bg-purple-50 border-purple-300",
};

export function WorkspaceNodeCard({
  node,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onShare,
  isDragging,
}: WorkspaceNodeCardProps) {
  const tintColor = TINT_COLORS[node.dashboard.tint] || TINT_COLORS.neutral;

  return (
    <Card
      onClick={() => onSelect(node.id)}
      className={`
        p-3 cursor-pointer transition-all
        ${isSelected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-md"}
        ${isDragging ? "opacity-50" : ""}
        ${tintColor}
        border-2 rounded-lg
      `}
      style={{
        width: `${node.width}px`,
        minHeight: `${node.height}px`,
      }}
    >
      <div className="flex items-start justify-between gap-2 h-full">
        <div className="flex-1 overflow-hidden">
          <h3 className="font-semibold text-sm truncate">{node.title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2">{node.content}</p>

          {node.dashboard.featuredBlocks.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {node.dashboard.featuredBlocks.slice(0, 2).map((block) => (
                <span
                  key={`${block.tabId}:${block.blockId}`}
                  className="inline-block text-xs bg-muted px-2 py-0.5 rounded truncate"
                >
                  📊
                </span>
              ))}
              {node.dashboard.featuredBlocks.length > 2 && (
                <span className="text-xs text-muted-foreground">
                  +{node.dashboard.featuredBlocks.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                onEdit(node.id);
              }}
              className="flex items-center gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {onShare && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  onShare(node.id);
                }}
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                onDelete(node.id);
              }}
              className="flex items-center gap-2 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
