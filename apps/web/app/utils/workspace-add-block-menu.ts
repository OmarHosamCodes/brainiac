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
    id: "sales",
    label: "Sales",
    items: [
      {
        blockType: "deal-scoring-matrix",
        label: "Deal scoring matrix",
        icon: "i-lucide-badge-percent",
      },
      {
        blockType: "pipeline-funnel",
        label: "Pipeline funnel",
        icon: "i-lucide-funnel",
      },
      {
        blockType: "forecast-confidence-board",
        label: "Forecast confidence board",
        icon: "i-lucide-circle-dollar-sign",
      },
    ],
  },
  {
    id: "people",
    label: "People",
    items: [
      {
        blockType: "skills-heat-map",
        label: "Skills heat map",
        icon: "i-lucide-grid-3x3",
      },
      {
        blockType: "delegation-matrix",
        label: "Delegation matrix",
        icon: "i-lucide-arrow-right-left",
      },
      {
        blockType: "talent-grid",
        label: "9-box talent grid",
        icon: "i-lucide-layout-grid",
      },
      {
        blockType: "seat-planner",
        label: "Seat ownership planner",
        icon: "i-lucide-blinds",
      },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      {
        blockType: "content-pipeline",
        label: "Content pipeline",
        icon: "i-lucide-megaphone",
      },
      {
        blockType: "content-quality-radar",
        label: "Content quality radar",
        icon: "i-lucide-chart-area",
      },
      {
        blockType: "content-roi-tracker",
        label: "Content ROI tracker",
        icon: "i-lucide-chart-column",
      },
    ],
  },
  {
    id: "brand",
    label: "Brand",
    items: [
      {
        blockType: "authority-scorecard",
        label: "Authority scorecard",
        icon: "i-lucide-badge-check",
      },
      {
        blockType: "hook-bank",
        label: "Hook bank",
        icon: "i-lucide-quote",
      },
      {
        blockType: "message-house",
        label: "Message house",
        icon: "i-lucide-house",
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      {
        blockType: "profitability-cash-flow",
        label: "Profitability & cash flow",
        icon: "i-lucide-wallet",
      },
      {
        blockType: "pricing-simulator",
        label: "Pricing simulator",
        icon: "i-lucide-sliders-horizontal",
      },
      {
        blockType: "collections-tracker",
        label: "Collections tracker",
        icon: "i-lucide-receipt-text",
      },
    ],
  },
  {
    id: "education",
    label: "Education",
    items: [
      {
        blockType: "course-roadmap",
        label: "Course roadmap",
        icon: "i-lucide-book-open",
      },
      {
        blockType: "learning-outcomes-matrix",
        label: "Learning outcomes matrix",
        icon: "i-lucide-graduation-cap",
      },
      {
        blockType: "cohort-health-dashboard",
        label: "Cohort health dashboard",
        icon: "i-lucide-users",
      },
    ],
  },
  {
    id: "time-orchestrator",
    label: "Time Orchestrator",
    items: [
      {
        blockType: "time-orchestrator",
        label: "Time orchestrator",
        icon: "i-lucide-calendar-range",
      },
      {
        blockType: "eisenhower-matrix",
        label: "Eisenhower matrix",
        icon: "i-lucide-layout-grid",
      },
      {
        blockType: "leadership-rhythm-planner",
        label: "Leadership rhythm planner",
        icon: "i-lucide-repeat",
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
