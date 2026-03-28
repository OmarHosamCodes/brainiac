import type { DropdownMenuItem } from "@nuxt/ui";
import type { WorkspaceBlock } from "@brainiac/workspace";

export type WorkspaceAddBlockType = Exclude<WorkspaceBlock["type"], "custom">;

export type WorkspaceAddBlockCategory = {
  id: string;
  label: string;
  items: Array<{
    blockType: WorkspaceAddBlockType;
    label: string;
    icon: DropdownMenuItem["icon"];
  }>;
};

export const workspaceAddBlockCategories = [
  {
    id: "strategy",
    label: "Strategy",
    items: [
      {
        blockType: "okr-tracker",
        label: "OKR tracker",
        icon: "i-lucide-target",
      },
      {
        blockType: "decision-matrix",
        label: "Decision matrix",
        icon: "i-lucide-grid-2x2",
      },
      {
        blockType: "business-model-canvas",
        label: "Business model canvas",
        icon: "i-lucide-layout-template",
      },
      {
        blockType: "assumption-tracker",
        label: "Assumption tracker",
        icon: "i-lucide-flask-conical",
      },
    ],
  },
  {
    id: "general",
    label: "General",
    items: [
      {
        blockType: "tracker",
        label: "Tracker",
        icon: "i-lucide-chart-column",
      },
      {
        blockType: "scorecard",
        label: "Scorecard",
        icon: "i-lucide-gauge",
      },
      {
        blockType: "ai-prompt",
        label: "AI prompt",
        icon: "i-lucide-sparkles",
      },
      {
        blockType: "time-orchestrator",
        label: "Time orchestrator",
        icon: "i-lucide-calendar-range",
      },
      {
        blockType: "kanban",
        label: "Kanban",
        icon: "i-lucide-columns-3",
      },
      {
        blockType: "timeline",
        label: "Timeline",
        icon: "i-lucide-waypoints",
      },
    ],
  },
] satisfies WorkspaceAddBlockCategory[];

export function createWorkspaceAddBlockMenuItems(
  onSelect: (blockType: WorkspaceAddBlockType) => void,
): DropdownMenuItem[][] {
  return workspaceAddBlockCategories.map((category) => [
    {
      label: category.label,
      type: "label",
      class: "px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.24em] text-muted/70",
    },
    ...category.items.map(
      (item) =>
        ({
          label: item.label,
          icon: item.icon,
          onSelect: () => {
            onSelect(item.blockType);
          },
        }) satisfies DropdownMenuItem,
    ),
  ]);
}
