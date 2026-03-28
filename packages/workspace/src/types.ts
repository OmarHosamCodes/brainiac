import { z } from "zod";

import {
  workspaceAiPromptBlockSchema,
  workspaceAssumptionTrackerBlockSchema,
  workspaceBusinessModelCanvasBlockSchema,
  workspaceBlockSchema,
  workspaceBusinessModelCanvasCellKeySchema,
  workspaceBusinessModelCanvasCellsSchema,
  workspaceCustomBlockFieldSchema,
  workspaceCustomBlockFormulaSchema,
  workspaceCustomBlockSchema,
  workspaceCustomBlockTemplateSchema,
  workspaceCustomBlockValueSchema,
  workspaceDecisionMatrixBlockSchema,
  workspaceDecisionMatrixCriterionSchema,
  workspaceDecisionMatrixOptionSchema,
  workspaceCustomFieldTypeSchema,
  workspaceDecisionBlockSchema,
  workspaceDecisionItemSchema,
  workspaceKanbanBlockSchema,
  workspaceKanbanCardSchema,
  workspaceKanbanColumnSchema,
  workspaceMarketplaceItemSchema,
  workspaceMarketplacePayloadSchema,
  workspaceMarketplaceSaveInputSchema,
  workspaceNodeDashboardFeaturedBlockSchema,
  workspaceNodeDashboardSchema,
  workspaceNodeSchema,
  workspaceNodeTabSchema,
  workspaceNodeTintSchema,
  workspaceNodeViewStateSchema,
  workspaceNotesBlockSchema,
  workspaceOkrKeyResultSchema,
  workspaceOkrObjectiveSchema,
  workspaceOkrTrackerBlockSchema,
  workspacePromptOutputSchema,
  workspaceSaveInputSchema,
  workspaceScorecardBlockSchema,
  workspaceScorecardMetricSchema,
  workspaceStrategicAssumptionFilterSchema,
  workspaceStrategicAssumptionLinkTypeSchema,
  workspaceStrategicAssumptionSchema,
  workspaceStrategicAssumptionStatusSchema,
  workspaceTaskDomainSchema,
  workspaceTaskListBlockSchema,
  workspaceTaskPrioritySchema,
  workspaceTaskQuadrantSchema,
  workspaceTaskSchema,
  workspaceTimeOrchestratorBlockSchema,
  workspaceTimeOrchestratorSettingsSchema,
  workspaceTimelineBlockSchema,
  workspaceTimelineMilestoneSchema,
  workspaceTimelineMilestoneStatusSchema,
  workspaceTrackerBlockSchema,
  workspaceTrackerEntrySchema,
} from "./schemas";

export type WorkspaceTaskPriority = z.infer<typeof workspaceTaskPrioritySchema>;
export type WorkspaceTaskDomain = z.infer<typeof workspaceTaskDomainSchema>;
export type WorkspaceTaskQuadrant = z.infer<typeof workspaceTaskQuadrantSchema>;
export type WorkspaceTask = z.infer<typeof workspaceTaskSchema>;
export type WorkspacePromptOutput = z.infer<typeof workspacePromptOutputSchema>;
export type WorkspaceDecisionItem = z.infer<typeof workspaceDecisionItemSchema>;
export type WorkspaceTrackerEntry = z.infer<typeof workspaceTrackerEntrySchema>;
export type WorkspaceTimeOrchestratorSettings = z.infer<
  typeof workspaceTimeOrchestratorSettingsSchema
>;
export type WorkspaceKanbanColumn = z.infer<typeof workspaceKanbanColumnSchema>;
export type WorkspaceKanbanCard = z.infer<typeof workspaceKanbanCardSchema>;
export type WorkspaceTimelineMilestoneStatus = z.infer<
  typeof workspaceTimelineMilestoneStatusSchema
>;
export type WorkspaceNodeTint = z.infer<typeof workspaceNodeTintSchema>;
export type WorkspaceTimelineMilestone = z.infer<typeof workspaceTimelineMilestoneSchema>;
export type WorkspaceScorecardMetric = z.infer<typeof workspaceScorecardMetricSchema>;
export type WorkspaceOkrKeyResult = z.infer<typeof workspaceOkrKeyResultSchema>;
export type WorkspaceOkrObjective = z.infer<typeof workspaceOkrObjectiveSchema>;
export type WorkspaceDecisionMatrixCriterion = z.infer<
  typeof workspaceDecisionMatrixCriterionSchema
>;
export type WorkspaceDecisionMatrixOption = z.infer<typeof workspaceDecisionMatrixOptionSchema>;
export type WorkspaceBusinessModelCanvasCellKey = z.infer<
  typeof workspaceBusinessModelCanvasCellKeySchema
>;
export type WorkspaceBusinessModelCanvasCells = z.infer<
  typeof workspaceBusinessModelCanvasCellsSchema
>;
export type WorkspaceStrategicAssumptionStatus = z.infer<
  typeof workspaceStrategicAssumptionStatusSchema
>;
export type WorkspaceStrategicAssumptionLinkType = z.infer<
  typeof workspaceStrategicAssumptionLinkTypeSchema
>;
export type WorkspaceStrategicAssumptionFilter = z.infer<
  typeof workspaceStrategicAssumptionFilterSchema
>;
export type WorkspaceStrategicAssumption = z.infer<typeof workspaceStrategicAssumptionSchema>;
export type WorkspaceCustomFieldType = z.infer<typeof workspaceCustomFieldTypeSchema>;
export type WorkspaceCustomBlockField = z.infer<typeof workspaceCustomBlockFieldSchema>;
export type WorkspaceCustomBlockFormula = z.infer<typeof workspaceCustomBlockFormulaSchema>;
export type WorkspaceCustomBlockTemplate = z.infer<typeof workspaceCustomBlockTemplateSchema>;
export type WorkspaceTaskListBlock = z.infer<typeof workspaceTaskListBlockSchema>;
export type WorkspaceNotesBlock = z.infer<typeof workspaceNotesBlockSchema>;
export type WorkspaceDecisionBlock = z.infer<typeof workspaceDecisionBlockSchema>;
export type WorkspaceTrackerBlock = z.infer<typeof workspaceTrackerBlockSchema>;
export type WorkspaceAiPromptBlock = z.infer<typeof workspaceAiPromptBlockSchema>;
export type WorkspaceTimeOrchestratorBlock = z.infer<typeof workspaceTimeOrchestratorBlockSchema>;
export type WorkspaceKanbanBlock = z.infer<typeof workspaceKanbanBlockSchema>;
export type WorkspaceTimelineBlock = z.infer<typeof workspaceTimelineBlockSchema>;
export type WorkspaceScorecardBlock = z.infer<typeof workspaceScorecardBlockSchema>;
export type WorkspaceOkrTrackerBlock = z.infer<typeof workspaceOkrTrackerBlockSchema>;
export type WorkspaceDecisionMatrixBlock = z.infer<typeof workspaceDecisionMatrixBlockSchema>;
export type WorkspaceBusinessModelCanvasBlock = z.infer<
  typeof workspaceBusinessModelCanvasBlockSchema
>;
export type WorkspaceAssumptionTrackerBlock = z.infer<typeof workspaceAssumptionTrackerBlockSchema>;
export type WorkspaceCustomBlock = z.infer<typeof workspaceCustomBlockSchema>;
export type WorkspaceBlock = z.infer<typeof workspaceBlockSchema>;
export type WorkspaceNodeTab = z.infer<typeof workspaceNodeTabSchema>;
export type WorkspaceNodeViewState = z.infer<typeof workspaceNodeViewStateSchema>;
export type WorkspaceNodeDashboardFeaturedBlock = z.infer<
  typeof workspaceNodeDashboardFeaturedBlockSchema
>;
export type WorkspaceNodeDashboard = z.infer<typeof workspaceNodeDashboardSchema>;
export type WorkspaceNode = z.infer<typeof workspaceNodeSchema>;
export type WorkspaceSaveInput = z.infer<typeof workspaceSaveInputSchema>;
export type WorkspaceMarketplacePayload = z.infer<typeof workspaceMarketplacePayloadSchema>;
export type WorkspaceMarketplaceItem = z.infer<typeof workspaceMarketplaceItemSchema>;
export type WorkspaceMarketplaceSaveInput = z.infer<typeof workspaceMarketplaceSaveInputSchema>;
export type WorkspaceCustomBlockValue = z.infer<typeof workspaceCustomBlockValueSchema>;
export type WorkspaceNodeRecord = WorkspaceNode;

export type WorkspaceCollectedTask = {
  blockId: string;
  blockTitle: string;
  tabId: string;
  tabTitle: string;
  task: WorkspaceTask;
};

export type WorkspaceTimeOrchestratorDomainSummary = {
  domain: WorkspaceTaskDomain | null;
  label: string;
  count: number;
  estimateMinutes: number;
  tasks: WorkspaceCollectedTask[];
};

export type WorkspaceTimeOrchestratorQuadrantSummary = {
  key: WorkspaceTaskQuadrant;
  label: string;
  count: number;
  estimateMinutes: number;
  tasks: WorkspaceCollectedTask[];
};

export type WorkspaceTimeOrchestratorSummary = {
  overdue: WorkspaceCollectedTask[];
  upcoming: WorkspaceCollectedTask[];
  highPriority: WorkspaceCollectedTask[];
  suggestedNextActions: WorkspaceCollectedTask[];
  totalOpenTasks: number;
  totalEstimateMinutes: number;
  averageUrgency: number;
  averageImportance: number;
  domainBreakdown: WorkspaceTimeOrchestratorDomainSummary[];
  quadrants: Record<WorkspaceTaskQuadrant, WorkspaceTimeOrchestratorQuadrantSummary>;
};

export type WorkspaceTrackerTrend = {
  direction: "up" | "down" | "flat";
  delta: number;
  percentChange: number | null;
  points: number[];
};

export type WorkspaceDecisionSummary = {
  prosWeight: number;
  consWeight: number;
  totalScore: number;
  signal: "lean-yes" | "lean-no" | "balanced";
};

export type WorkspaceOkrHealth = "healthy" | "watch" | "critical";

export type WorkspaceOkrObjectiveSummary = {
  objectiveId: string;
  title: string;
  progress: number;
  health: WorkspaceOkrHealth;
  keyResultCount: number;
};

export type WorkspaceOkrTrackerSummary = {
  objectiveCount: number;
  keyResultCount: number;
  averageProgress: number;
  offTrackCount: number;
  healthyCount: number;
  objectives: WorkspaceOkrObjectiveSummary[];
};

export type WorkspaceDecisionMatrixOptionScoreSummary = {
  optionId: string;
  label: string;
  totalScore: number;
  averageScore: number;
  progress: number;
  isWinner: boolean;
};

export type WorkspaceDecisionMatrixSummary = {
  criteriaCount: number;
  optionCount: number;
  totalWeight: number;
  leaderScore: number;
  hasTie: boolean;
  optionScores: WorkspaceDecisionMatrixOptionScoreSummary[];
};

export type WorkspaceBusinessModelCanvasSummary = {
  filledCellCount: number;
  missingCellCount: number;
  readiness: "early" | "forming" | "aligned";
  strongestCells: WorkspaceBusinessModelCanvasCellKey[];
  missingCells: WorkspaceBusinessModelCanvasCellKey[];
};

export type WorkspaceBusinessModelCanvasAnalysis = WorkspaceBusinessModelCanvasSummary & {
  coveragePercent: number;
  narrative: string;
};

export type WorkspaceAssumptionTrackerSummary = {
  total: number;
  averageConfidence: number;
  validatingCount: number;
  confirmedCount: number;
  atRiskCount: number;
  falseCount: number;
};

export type WorkspaceNodeDashboardSelectableBlock = {
  tabId: string;
  tabTitle: string;
  blockId: string;
  blockTitle: string;
  blockType: WorkspaceBlock["type"];
};

export type WorkspaceNodeDashboardDetailMetric = {
  label: string;
  value: string;
};

export type WorkspaceNodeDashboardDetail = {
  tabId: string;
  tabTitle: string;
  blockId: string;
  blockTitle: string;
  blockType: WorkspaceBlock["type"];
  summary: string;
  metrics: WorkspaceNodeDashboardDetailMetric[];
  highlights: string[];
};
