import type { WorkspaceBlock } from "./types";

export type WorkspaceBlockCategoryBlockType = Exclude<
  WorkspaceBlock["type"],
  "custom" | "decision" | "notes" | "task-list"
>;

export type WorkspaceBlockCategoryItem = {
  blockType: WorkspaceBlockCategoryBlockType;
  label: string;
  icon: string;
  teamOnly?: boolean;
};

export type WorkspaceBlockCategory = {
  id: string;
  label: string;
  items: WorkspaceBlockCategoryItem[];
};

export const workspaceBlockCategories = [
  {
    id: "agency-operations",
    label: "Agency Operations",
    items: [
      {
        blockType: "agency-project-manager",
        label: "Agency project manager",
        icon: "i-lucide-briefcase-business",
      },
      {
        blockType: "agency-time-tracker",
        label: "Agency time tracker",
        icon: "i-lucide-timer",
      },
      {
        blockType: "agency-time-entries-log",
        label: "Agency time entries log",
        icon: "i-lucide-logs",
      },
      {
        blockType: "agency-time-summary",
        label: "Agency time summary",
        icon: "i-lucide-chart-pie",
      },
      {
        blockType: "agency-settings",
        label: "Agency settings",
        icon: "i-lucide-settings-2",
      },
    ],
  },
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
        blockType: "table",
        label: "Table",
        icon: "i-lucide-table",
      },
      {
        blockType: "checklist",
        label: "Checklist",
        icon: "i-lucide-list-checks",
      },
      {
        blockType: "kanban",
        label: "Kanban",
        icon: "i-lucide-columns-3",
      },
      {
        blockType: "scorecard",
        label: "Scorecard",
        icon: "i-lucide-gauge",
      },
      {
        blockType: "swot",
        label: "SWOT",
        icon: "i-lucide-layout-grid",
      },
      {
        blockType: "tracker",
        label: "Tracker",
        icon: "i-lucide-chart-column",
      },
      {
        blockType: "pros-cons",
        label: "Pros & cons",
        icon: "i-lucide-scale",
      },
      {
        blockType: "habit-grid",
        label: "Habit grid",
        icon: "i-lucide-calendar-days",
      },
      {
        blockType: "process",
        label: "Process",
        icon: "i-lucide-list-ordered",
      },
      {
        blockType: "2x2-matrix",
        label: "2x2 matrix",
        icon: "i-lucide-grid-2x2",
      },
      {
        blockType: "timeline",
        label: "Timeline",
        icon: "i-lucide-waypoints",
      },
      {
        blockType: "ai-prompt",
        label: "AI prompt",
        icon: "i-lucide-sparkles",
      },
    ],
  },
] as const satisfies readonly WorkspaceBlockCategory[];

const workspaceTeamOnlyBlockTypeSet = new Set(
  workspaceBlockCategories.flatMap((category) =>
    category.items.filter((item) => "teamOnly" in item && item.teamOnly).map((item) => item.blockType),
  ),
);

export function isWorkspaceTeamOnlyBlockType(type: WorkspaceBlock["type"]) {
  return workspaceTeamOnlyBlockTypeSet.has(type as WorkspaceBlockCategoryBlockType);
}
