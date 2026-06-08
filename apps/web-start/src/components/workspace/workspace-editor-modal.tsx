import { useCallback, useMemo } from "react";
import {
  WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT,
  type WorkspaceNodeDashboardFeaturedBlock,
  type WorkspaceNodeDashboardSelectableBlock,
  type WorkspaceNodeTint,
  type WorkspaceNodeType,
} from "@brainiac/workspace";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type WorkspaceEditorModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  title: string;
  onTitleChange: (value: string) => void;
  content: string;
  onContentChange: (value: string) => void;
  nodeType: WorkspaceNodeType;
  onNodeTypeChange: (value: WorkspaceNodeType) => void;
  tint: WorkspaceNodeTint;
  onTintChange: (value: WorkspaceNodeTint) => void;
  featuredBlocks: WorkspaceNodeDashboardFeaturedBlock[];
  onFeaturedBlocksChange: (blocks: WorkspaceNodeDashboardFeaturedBlock[]) => void;
  availableBlocks: WorkspaceNodeDashboardSelectableBlock[];
  valid: boolean;
  onSubmit: () => void;
};

const TINT_OPTIONS: WorkspaceNodeTint[] = [
  "neutral",
  "emerald",
  "blue",
  "amber",
  "red",
  "purple",
];

const TINT_LABELS: Record<WorkspaceNodeTint, string> = {
  neutral: "Neutral",
  emerald: "Emerald",
  blue: "Blue",
  amber: "Amber",
  red: "Red",
  purple: "Purple",
};

const TINT_COLORS: Record<WorkspaceNodeTint, string> = {
  neutral: "bg-zinc-200",
  emerald: "bg-emerald-200",
  blue: "bg-blue-200",
  amber: "bg-amber-200",
  red: "bg-red-200",
  purple: "bg-purple-200",
};

export function WorkspaceEditorModal({
  open,
  onOpenChange,
  mode,
  title,
  onTitleChange,
  content,
  onContentChange,
  nodeType,
  onNodeTypeChange,
  tint,
  onTintChange,
  featuredBlocks,
  onFeaturedBlocksChange,
  availableBlocks,
  valid,
  onSubmit,
}: WorkspaceEditorModalProps) {
  const modalTitle = mode === "create" ? "Create node" : "Edit node";
  const modalDescription =
    mode === "create"
      ? "Set the node title, summary, and board identity before it lands on the workspace."
      : "Refine the node identity and choose which block summaries appear on the dashboard card.";

  const draftTitle =
    title.trim().length > 0
      ? title.trim()
      : mode === "create"
        ? "Untitled draft"
        : "Untitled node";

  const draftSummary =
    content.trim().length > 0
      ? content.trim()
      : "No summary yet. Add a short description for the workspace card.";

  const selectedBlockKeys = useMemo(
    () => new Set(featuredBlocks.map((entry) => `${entry.tabId}:${entry.blockId}`)),
    [featuredBlocks],
  );

  const selectedCount = featuredBlocks.length;
  const selectionLimitReached = selectedCount >= WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT;

  const selectionBadgeLabel =
    mode === "create"
      ? "Unlocks after creation"
      : availableBlocks.length === 0
        ? "No blocks yet"
        : `${selectedCount}/${WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT} selected`;

  const groupedBlockOptions = useMemo(() => {
    const groups: Array<{
      tabId: string;
      tabTitle: string;
      options: WorkspaceNodeDashboardSelectableBlock[];
    }> = [];

    for (const option of availableBlocks) {
      const existingGroup = groups.find((entry) => entry.tabId === option.tabId);

      if (existingGroup) {
        existingGroup.options.push(option);
        continue;
      }

      groups.push({
        tabId: option.tabId,
        tabTitle: option.tabTitle,
        options: [option],
      });
    }

    return groups;
  }, [availableBlocks]);

  const submitLabel = mode === "create" ? "Create node" : "Save changes";

  const isFeaturedBlockSelected = useCallback(
    (option: WorkspaceNodeDashboardSelectableBlock) => {
      return selectedBlockKeys.has(`${option.tabId}:${option.blockId}`);
    },
    [selectedBlockKeys],
  );

  const toggleFeaturedBlock = useCallback(
    (option: WorkspaceNodeDashboardSelectableBlock) => {
      const isSelected = isFeaturedBlockSelected(option);

      if (isSelected) {
        onFeaturedBlocksChange(
          featuredBlocks.filter(
            (entry) => !(entry.tabId === option.tabId && entry.blockId === option.blockId),
          ),
        );
        return;
      }

      if (selectionLimitReached) {
        return;
      }

      onFeaturedBlocksChange([
        ...featuredBlocks,
        {
          tabId: option.tabId,
          blockId: option.blockId,
        },
      ]);
    },
    [featuredBlocks, isFeaturedBlockSelected, onFeaturedBlocksChange, selectionLimitReached],
  );

  const nodeTypeLabel = nodeType === "orchestrator" ? "Orchestrator" : "Standard";
  const nodeTypeDescription =
    nodeType === "orchestrator"
      ? "Can connect to standard nodes and coordinate work across the workspace."
      : "A regular workspace node with no graph links or orchestration layer.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>{modalDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="node-title">Title</Label>
            <Input
              id="node-title"
              placeholder="Enter node title..."
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              maxLength={120}
            />
            <div className="text-xs text-muted-foreground">
              Preview: <span className="font-medium">{draftTitle}</span>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="node-content">Summary</Label>
            <Textarea
              id="node-content"
              placeholder="Enter a brief description for the workspace card..."
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              maxLength={500}
              rows={4}
            />
            <div className="text-xs text-muted-foreground">
              Preview: <span className="font-medium">{draftSummary}</span>
            </div>
          </div>

          {/* Node Type */}
          <div className="space-y-2">
            <Label>Node Type</Label>
            <Select value={nodeType} onValueChange={(value) => onNodeTypeChange(value as WorkspaceNodeType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="orchestrator">Orchestrator</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">{nodeTypeDescription}</div>
          </div>

          {/* Tint */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-6 gap-2">
              {TINT_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => onTintChange(option)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    tint === option ? "border-foreground" : "border-transparent hover:border-muted-foreground"
                  } ${TINT_COLORS[option]}`}
                  title={TINT_LABELS[option]}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* Featured Blocks Selection (only in edit mode) */}
          {mode === "edit" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Featured Blocks</Label>
                <Badge variant="outline">{selectionBadgeLabel}</Badge>
              </div>

              {availableBlocks.length === 0 ? (
                <div className="text-sm text-muted-foreground italic">
                  No blocks available yet. Create some blocks in tabs first.
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedBlockOptions.map((group) => (
                    <div key={group.tabId} className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        Tab: {group.tabTitle}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {group.options.map((option) => (
                          <div key={`${option.tabId}:${option.blockId}`} className="flex items-center space-x-2">
                            <Checkbox
                              id={`block-${option.tabId}-${option.blockId}`}
                              checked={isFeaturedBlockSelected(option)}
                              onCheckedChange={() => toggleFeaturedBlock(option)}
                              disabled={selectionLimitReached && !isFeaturedBlockSelected(option)}
                            />
                            <label
                              htmlFor={`block-${option.tabId}-${option.blockId}`}
                              className="text-sm cursor-pointer flex-1"
                            >
                              {option.blockTitle}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!valid}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
