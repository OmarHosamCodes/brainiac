export const WORKSPACE_NODE_LIMIT = 200;
export const WORKSPACE_NODE_TAB_LIMIT = 12;
export const WORKSPACE_TAB_BLOCK_LIMIT = 24;
export const WORKSPACE_TASK_LIMIT = 100;
export const WORKSPACE_KANBAN_COLUMN_LIMIT = 6;
export const WORKSPACE_KANBAN_CARD_LIMIT = 120;
export const WORKSPACE_TIMELINE_MILESTONE_LIMIT = 40;
export const WORKSPACE_SCORECARD_METRIC_LIMIT = 40;
export const WORKSPACE_CUSTOM_BLOCK_TEMPLATE_LIMIT = 20;
export const WORKSPACE_CUSTOM_BLOCK_FIELD_LIMIT = 12;
export const WORKSPACE_MARKETPLACE_ITEM_LIMIT = 200;
export const WORKSPACE_NODE_DASHBOARD_DETAIL_LIMIT = 4;
export const DEFAULT_WORKSPACE_NODE_WIDTH = 320;
export const DEFAULT_WORKSPACE_NODE_HEIGHT = 220;
export const DEFAULT_WORKSPACE_NODE_MIN_WIDTH = 260;
export const DEFAULT_WORKSPACE_NODE_MIN_HEIGHT = 180;

export const WORKSPACE_TASK_DOMAINS = [
  "strategy",
  "people",
  "sales",
  "content",
  "brand",
  "finance",
  "education",
  "orchestrator",
] as const;

export const WORKSPACE_TASK_QUADRANTS = ["do", "schedule", "delegate", "eliminate"] as const;

export const WORKSPACE_TIMELINE_MILESTONE_STATUSES = [
  "planned",
  "active",
  "done",
  "blocked",
] as const;

export const WORKSPACE_NODE_TINTS = [
  "neutral",
  "emerald",
  "sky",
  "amber",
  "rose",
  "indigo",
] as const;
