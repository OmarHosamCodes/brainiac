import { z } from "zod";

import {
  workspace2x2MatrixBlockSchema,
  workspace2x2MatrixItemSchema,
  workspace2x2MatrixQuadrantSchema,
  workspace2x2MatrixQuadrantsSchema,
  workspaceAgencyProjectManagerBlockSchema,
  workspaceAgencySprintBoardBlockSchema,
  workspaceAgencyTimeEntriesLogBlockSchema,
  workspaceAgencyTimeReportsBlockSchema,
  workspaceAgencyTimeTrackerBlockSchema,
  workspaceAiPromptBlockSchema,
  workspaceAssumptionTrackerBlockSchema,
  workspaceAuthorityScoreMetricKeySchema,
  workspaceAuthorityScoreMetricValueSchema,
  workspaceAuthorityScoreMetricsSchema,
  workspaceAuthorityScorecardBlockSchema,
  workspaceBlockSchema,
  workspaceBusinessModelCanvasBlockSchema,
  workspaceBusinessModelCanvasCellKeySchema,
  workspaceBusinessModelCanvasCellsSchema,
  workspaceChecklistBlockSchema,
  workspaceChecklistItemSchema,
  workspaceCohortHealthCohortSchema,
  workspaceCohortHealthDashboardBlockSchema,
  workspaceCohortStatusSchema,
  workspaceCollectionsTrackerBlockSchema,
  workspaceContentPipelineBlockSchema,
  workspaceContentPipelineItemSchema,
  workspaceContentPipelineStatusSchema,
  workspaceContentPlatformSchema,
  workspaceContentQualityDimensionSchema,
  workspaceContentQualityRadarBlockSchema,
  workspaceContentQualityScoresSchema,
  workspaceContentRoiItemSchema,
  workspaceContentRoiSortSchema,
  workspaceContentRoiTrackerBlockSchema,
  workspaceCourseRoadmapBlockSchema,
  workspaceCourseRoadmapCourseSchema,
  workspaceCourseRoadmapLessonSchema,
  workspaceCourseRoadmapOutcomeSchema,
  workspaceCourseStatusSchema,
  workspaceCustomBlockFieldSchema,
  workspaceCustomBlockFormulaSchema,
  workspaceCustomBlockSchema,
  workspaceCustomBlockTemplateSchema,
  workspaceCustomBlockValueSchema,
  workspaceCustomFieldTypeSchema,
  workspaceDealScoringDealSchema,
  workspaceDealScoringMatrixBlockSchema,
  workspaceDecisionBlockSchema,
  workspaceDecisionItemSchema,
  workspaceDecisionMatrixBlockSchema,
  workspaceDecisionMatrixCriterionSchema,
  workspaceDecisionMatrixOptionSchema,
  workspaceDelegationItemSchema,
  workspaceDelegationMatrixBlockSchema,
  workspaceDelegationStatusSchema,
  workspaceEisenhowerMatrixBlockSchema,
  workspaceExpenseItemSchema,
  workspaceFinancePaymentStatusSchema,
  workspaceForecastConfidenceBoardBlockSchema,
  workspaceForecastConfidenceItemSchema,
  workspaceHabitGridBlockSchema,
  workspaceHabitGridDaySchema,
  workspaceHabitGridDaysSchema,
  workspaceHabitGridHabitSchema,
  workspaceHookBankBlockSchema,
  workspaceHookBankItemSchema,
  workspaceKanbanBlockSchema,
  workspaceKanbanCardSchema,
  workspaceKanbanColumnSchema,
  workspaceLeadershipMeetingStatusSchema,
  workspaceLeadershipRhythmFilterSchema,
  workspaceLeadershipRhythmMeetingSchema,
  workspaceLeadershipRhythmPlannerBlockSchema,
  workspaceLeadershipRhythmSchema,
  workspaceLearningOutcomesMatrixBlockSchema,
  workspaceMarketplaceItemSchema,
  workspaceMarketplacePayloadSchema,
  workspaceMarketplaceSaveInputSchema,
  workspaceMessageHouseBlockSchema,
  workspaceMessageHousePillarSchema,
  workspaceNodeDashboardFeaturedBlockSchema,
  workspaceNodeDashboardSchema,
  workspaceNodeSchema,
  workspaceNodeTabSchema,
  workspaceNodeTintSchema,
  workspaceNodeViewStateSchema,
  workspaceNodeVisibilitySchema,
  workspaceNotesBlockSchema,
  workspaceOkrKeyResultSchema,
  workspaceOkrObjectiveSchema,
  workspaceOkrTrackerBlockSchema,
  workspacePeopleSkillDimensionSchema,
  workspacePipelineFunnelBlockSchema,
  workspacePipelineFunnelDealSchema,
  workspacePricingSimulatorBlockSchema,
  workspaceProcessBlockSchema,
  workspaceProcessStepSchema,
  workspaceProfitabilityCashFlowBlockSchema,
  workspaceProfitabilityClientSchema,
  workspacePromptOutputSchema,
  workspaceProsConsBlockSchema,
  workspaceReceivableFilterSchema,
  workspaceReceivableInvoiceSchema,
  workspaceReceivableStatusSchema,
  workspaceSalesForecastBucketSchema,
  workspaceSalesPipelineStageSchema,
  workspaceSalesTemperatureSchema,
  workspaceSaveInputSchema,
  workspaceScorecardBlockSchema,
  workspaceScorecardMetricSchema,
  workspaceSeatHealthSchema,
  workspaceSeatLoadLevelSchema,
  workspaceSeatPlannerBlockSchema,
  workspaceSeatPlannerFilterSchema,
  workspaceSeatPlannerSeatSchema,
  workspaceSkillsHeatMapBlockSchema,
  workspaceSkillsHeatMapDimensionSchema,
  workspaceSkillsHeatMapMemberSchema,
  workspaceSkillsHeatMapScoresSchema,
  workspaceStrategicAssumptionFilterSchema,
  workspaceStrategicAssumptionLinkTypeSchema,
  workspaceStrategicAssumptionSchema,
  workspaceStrategicAssumptionStatusSchema,
  workspaceSwotBlockSchema,
  workspaceSwotCellsSchema,
  workspaceTableBlockSchema,
  workspaceTableColumnSchema,
  workspaceTableRowSchema,
  workspaceTalentGridBlockSchema,
  workspaceTalentGridMemberSchema,
  workspaceTaskDomainSchema,
  workspaceTaskListBlockSchema,
  workspaceTaskPrioritySchema,
  workspaceTaskQuadrantSchema,
  workspaceTaskSchema,
  workspaceTeamRoleSchema,
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
export type WorkspaceCourseStatus = z.infer<typeof workspaceCourseStatusSchema>;
export type WorkspaceCourseRoadmapLesson = z.infer<typeof workspaceCourseRoadmapLessonSchema>;
export type WorkspaceCourseRoadmapOutcome = z.infer<typeof workspaceCourseRoadmapOutcomeSchema>;
export type WorkspaceCourseRoadmapCourse = z.infer<typeof workspaceCourseRoadmapCourseSchema>;
export type WorkspaceDecisionItem = z.infer<typeof workspaceDecisionItemSchema>;
export type WorkspaceChecklistItem = z.infer<typeof workspaceChecklistItemSchema>;
export type WorkspaceTrackerEntry = z.infer<typeof workspaceTrackerEntrySchema>;
export type WorkspaceTableColumn = z.infer<typeof workspaceTableColumnSchema>;
export type WorkspaceTableRow = z.infer<typeof workspaceTableRowSchema>;
export type WorkspaceSwotCells = z.infer<typeof workspaceSwotCellsSchema>;
export type WorkspaceHabitGridDay = z.infer<typeof workspaceHabitGridDaySchema>;
export type WorkspaceHabitGridDays = z.infer<typeof workspaceHabitGridDaysSchema>;
export type WorkspaceHabitGridHabit = z.infer<typeof workspaceHabitGridHabitSchema>;
export type WorkspaceProcessStep = z.infer<typeof workspaceProcessStepSchema>;
export type Workspace2x2MatrixItem = z.infer<typeof workspace2x2MatrixItemSchema>;
export type Workspace2x2MatrixQuadrant = z.infer<typeof workspace2x2MatrixQuadrantSchema>;
export type Workspace2x2MatrixQuadrants = z.infer<typeof workspace2x2MatrixQuadrantsSchema>;
export type WorkspaceSkillsHeatMapDimension = z.infer<
  typeof workspaceSkillsHeatMapDimensionSchema
>;
export type WorkspacePeopleSkillDimension = z.infer<typeof workspacePeopleSkillDimensionSchema>;
export type WorkspaceSkillsHeatMapScores = z.infer<typeof workspaceSkillsHeatMapScoresSchema>;
export type WorkspaceSkillsHeatMapMember = z.infer<typeof workspaceSkillsHeatMapMemberSchema>;
export type WorkspaceDelegationStatus = z.infer<typeof workspaceDelegationStatusSchema>;
export type WorkspaceDelegationItem = z.infer<typeof workspaceDelegationItemSchema>;
export type WorkspaceSalesPipelineStage = z.infer<typeof workspaceSalesPipelineStageSchema>;
export type WorkspaceSalesTemperature = z.infer<typeof workspaceSalesTemperatureSchema>;
export type WorkspaceSalesForecastBucket = z.infer<typeof workspaceSalesForecastBucketSchema>;
export type WorkspaceContentPlatform = z.infer<typeof workspaceContentPlatformSchema>;
export type WorkspaceContentPipelineStatus = z.infer<typeof workspaceContentPipelineStatusSchema>;
export type WorkspaceContentQualityDimension = z.infer<
  typeof workspaceContentQualityDimensionSchema
>;
export type WorkspaceContentRoiSort = z.infer<typeof workspaceContentRoiSortSchema>;
export type WorkspaceDealScoringDeal = z.infer<typeof workspaceDealScoringDealSchema>;
export type WorkspacePipelineFunnelDeal = z.infer<typeof workspacePipelineFunnelDealSchema>;
export type WorkspaceForecastConfidenceItem = z.infer<typeof workspaceForecastConfidenceItemSchema>;
export type WorkspaceContentPipelineItem = z.infer<typeof workspaceContentPipelineItemSchema>;
export type WorkspaceContentQualityScores = z.infer<typeof workspaceContentQualityScoresSchema>;
export type WorkspaceContentRoiItem = z.infer<typeof workspaceContentRoiItemSchema>;
export type WorkspaceTalentGridMember = z.infer<typeof workspaceTalentGridMemberSchema>;
export type WorkspaceTimeOrchestratorSettings = z.infer<
  typeof workspaceTimeOrchestratorSettingsSchema
>;
export type WorkspaceKanbanColumn = z.infer<typeof workspaceKanbanColumnSchema>;
export type WorkspaceKanbanCard = z.infer<typeof workspaceKanbanCardSchema>;
export type WorkspaceTimelineMilestoneStatus = z.infer<
  typeof workspaceTimelineMilestoneStatusSchema
>;
export type WorkspaceNodeTint = z.infer<typeof workspaceNodeTintSchema>;
export type WorkspaceNodeVisibility = z.infer<typeof workspaceNodeVisibilitySchema>;
export type WorkspaceTeamRole = z.infer<typeof workspaceTeamRoleSchema>;
export type WorkspaceTimelineMilestone = z.infer<typeof workspaceTimelineMilestoneSchema>;
export type WorkspaceSeatHealth = z.infer<typeof workspaceSeatHealthSchema>;
export type WorkspaceSeatLoadLevel = z.infer<typeof workspaceSeatLoadLevelSchema>;
export type WorkspaceSeatPlannerFilter = z.infer<typeof workspaceSeatPlannerFilterSchema>;
export type WorkspaceSeatPlannerSeat = z.infer<typeof workspaceSeatPlannerSeatSchema>;
export type WorkspaceScorecardMetric = z.infer<typeof workspaceScorecardMetricSchema>;
export type WorkspaceAuthorityScoreMetricKey = z.infer<
  typeof workspaceAuthorityScoreMetricKeySchema
>;
export type WorkspaceAuthorityScoreMetricValue = z.infer<
  typeof workspaceAuthorityScoreMetricValueSchema
>;
export type WorkspaceAuthorityScoreMetrics = z.infer<typeof workspaceAuthorityScoreMetricsSchema>;
export type WorkspaceHookBankItem = z.infer<typeof workspaceHookBankItemSchema>;
export type WorkspaceMessageHousePillar = z.infer<typeof workspaceMessageHousePillarSchema>;
export type WorkspaceFinancePaymentStatus = z.infer<typeof workspaceFinancePaymentStatusSchema>;
export type WorkspaceProfitabilityClient = z.infer<typeof workspaceProfitabilityClientSchema>;
export type WorkspaceExpenseItem = z.infer<typeof workspaceExpenseItemSchema>;
export type WorkspaceReceivableStatus = z.infer<typeof workspaceReceivableStatusSchema>;
export type WorkspaceReceivableFilter = z.infer<typeof workspaceReceivableFilterSchema>;
export type WorkspaceReceivableInvoice = z.infer<typeof workspaceReceivableInvoiceSchema>;
export type WorkspaceCohortStatus = z.infer<typeof workspaceCohortStatusSchema>;
export type WorkspaceCohortHealthCohort = z.infer<typeof workspaceCohortHealthCohortSchema>;
export type WorkspaceLeadershipRhythm = z.infer<typeof workspaceLeadershipRhythmSchema>;
export type WorkspaceLeadershipMeetingStatus = z.infer<
  typeof workspaceLeadershipMeetingStatusSchema
>;
export type WorkspaceLeadershipRhythmFilter = z.infer<typeof workspaceLeadershipRhythmFilterSchema>;
export type WorkspaceLeadershipRhythmMeeting = z.infer<
  typeof workspaceLeadershipRhythmMeetingSchema
>;
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
export type WorkspaceTableBlock = z.infer<typeof workspaceTableBlockSchema>;
export type WorkspaceChecklistBlock = z.infer<typeof workspaceChecklistBlockSchema>;
export type WorkspaceDecisionBlock = z.infer<typeof workspaceDecisionBlockSchema>;
export type WorkspaceProsConsBlock = z.infer<typeof workspaceProsConsBlockSchema>;
export type WorkspaceSwotBlock = z.infer<typeof workspaceSwotBlockSchema>;
export type WorkspaceTrackerBlock = z.infer<typeof workspaceTrackerBlockSchema>;
export type WorkspaceAiPromptBlock = z.infer<typeof workspaceAiPromptBlockSchema>;
export type WorkspaceHabitGridBlock = z.infer<typeof workspaceHabitGridBlockSchema>;
export type WorkspaceProcessBlock = z.infer<typeof workspaceProcessBlockSchema>;
export type Workspace2x2MatrixBlock = z.infer<typeof workspace2x2MatrixBlockSchema>;
export type WorkspaceAgencyProjectManagerBlock = z.infer<
  typeof workspaceAgencyProjectManagerBlockSchema
>;
export type WorkspaceAgencyTimeTrackerBlock = z.infer<typeof workspaceAgencyTimeTrackerBlockSchema>;
export type WorkspaceAgencyTimeEntriesLogBlock = z.infer<
  typeof workspaceAgencyTimeEntriesLogBlockSchema
>;
export type WorkspaceAgencySprintBoardBlock = z.infer<typeof workspaceAgencySprintBoardBlockSchema>;
export type WorkspaceAgencyTimeReportsBlock = z.infer<typeof workspaceAgencyTimeReportsBlockSchema>;
export type WorkspaceCourseRoadmapBlock = z.infer<typeof workspaceCourseRoadmapBlockSchema>;
export type WorkspaceLearningOutcomesMatrixBlock = z.infer<
  typeof workspaceLearningOutcomesMatrixBlockSchema
>;
export type WorkspaceTimeOrchestratorBlock = z.infer<typeof workspaceTimeOrchestratorBlockSchema>;
export type WorkspaceCohortHealthDashboardBlock = z.infer<
  typeof workspaceCohortHealthDashboardBlockSchema
>;
export type WorkspaceEisenhowerMatrixBlock = z.infer<typeof workspaceEisenhowerMatrixBlockSchema>;
export type WorkspaceLeadershipRhythmPlannerBlock = z.infer<
  typeof workspaceLeadershipRhythmPlannerBlockSchema
>;
export type WorkspaceKanbanBlock = z.infer<typeof workspaceKanbanBlockSchema>;
export type WorkspaceTimelineBlock = z.infer<typeof workspaceTimelineBlockSchema>;
export type WorkspaceSkillsHeatMapBlock = z.infer<typeof workspaceSkillsHeatMapBlockSchema>;
export type WorkspaceDelegationMatrixBlock = z.infer<typeof workspaceDelegationMatrixBlockSchema>;
export type WorkspaceTalentGridBlock = z.infer<typeof workspaceTalentGridBlockSchema>;
export type WorkspaceSeatPlannerBlock = z.infer<typeof workspaceSeatPlannerBlockSchema>;
export type WorkspaceDealScoringMatrixBlock = z.infer<typeof workspaceDealScoringMatrixBlockSchema>;
export type WorkspacePipelineFunnelBlock = z.infer<typeof workspacePipelineFunnelBlockSchema>;
export type WorkspaceForecastConfidenceBoardBlock = z.infer<
  typeof workspaceForecastConfidenceBoardBlockSchema
>;
export type WorkspaceContentPipelineBlock = z.infer<typeof workspaceContentPipelineBlockSchema>;
export type WorkspaceContentQualityRadarBlock = z.infer<
  typeof workspaceContentQualityRadarBlockSchema
>;
export type WorkspaceContentRoiTrackerBlock = z.infer<typeof workspaceContentRoiTrackerBlockSchema>;
export type WorkspaceAuthorityScorecardBlock = z.infer<
  typeof workspaceAuthorityScorecardBlockSchema
>;
export type WorkspaceHookBankBlock = z.infer<typeof workspaceHookBankBlockSchema>;
export type WorkspaceMessageHouseBlock = z.infer<typeof workspaceMessageHouseBlockSchema>;
export type WorkspaceScorecardBlock = z.infer<typeof workspaceScorecardBlockSchema>;
export type WorkspaceOkrTrackerBlock = z.infer<typeof workspaceOkrTrackerBlockSchema>;
export type WorkspaceDecisionMatrixBlock = z.infer<typeof workspaceDecisionMatrixBlockSchema>;
export type WorkspaceBusinessModelCanvasBlock = z.infer<
  typeof workspaceBusinessModelCanvasBlockSchema
>;
export type WorkspaceAssumptionTrackerBlock = z.infer<typeof workspaceAssumptionTrackerBlockSchema>;
export type WorkspaceProfitabilityCashFlowBlock = z.infer<
  typeof workspaceProfitabilityCashFlowBlockSchema
>;
export type WorkspacePricingSimulatorBlock = z.infer<typeof workspacePricingSimulatorBlockSchema>;
export type WorkspaceCollectionsTrackerBlock = z.infer<
  typeof workspaceCollectionsTrackerBlockSchema
>;
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

export type WorkspaceCourseRoadmapCourseProgress = {
  lessonCount: number;
  recordedLessons: number;
  completionPercent: number;
};

export type WorkspaceCourseRoadmapSummary = {
  courseCount: number;
  lessonCount: number;
  recordedLessons: number;
  averageCompletionPercent: number;
  inProgressCount: number;
  planningCount: number;
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

export type WorkspaceSkillsHeatMapSummary = {
  memberCount: number;
  overallAverage: number;
  criticalGapCount: number;
  strongestDimension: WorkspacePeopleSkillDimension | null;
  weakestDimension: WorkspacePeopleSkillDimension | null;
  averageByDimension: Record<WorkspacePeopleSkillDimension, number>;
};

export type WorkspaceDelegationMatrixSummary = {
  itemCount: number;
  totalHoursPerWeek: number;
  pendingHoursPerWeek: number;
  delegatedHoursPerWeek: number;
  totalRecoverableValue: number;
  pendingRecoverableValue: number;
  stuckCount: number;
  transitioningCount: number;
  delegatedCount: number;
};

export type WorkspaceTalentGridBoxKey =
  | "risk"
  | "average-joe"
  | "specialist"
  | "under-performer"
  | "core-player"
  | "high-performer"
  | "enigma"
  | "growth-star"
  | "superstar";

export type WorkspaceTalentGridSummary = {
  memberCount: number;
  superstarCount: number;
  growthStarCount: number;
  corePlayerCount: number;
  riskCount: number;
  boxCounts: Record<WorkspaceTalentGridBoxKey, number>;
};

export type WorkspaceSeatPlannerSummary = {
  seatCount: number;
  filledSeats: number;
  fragileSeats: number;
  overloadedSeats: number;
  uncoveredSeats: number;
};

export type WorkspaceDealScoreTone = "strong" | "medium" | "weak";

export type WorkspaceDealScoringMatrixSummary = {
  dealCount: number;
  totalValue: number;
  averageScore: number;
  hotCount: number;
  warmCount: number;
  coldCount: number;
  stageCounts: Record<WorkspaceSalesPipelineStage, number>;
};

export type WorkspacePipelineFunnelStageSummary = {
  stage: WorkspaceSalesPipelineStage;
  label: string;
  widthPercent: number;
  dealCount: number;
  totalValue: number;
};

export type WorkspacePipelineFunnelSummary = {
  dealCount: number;
  totalValue: number;
  closedValue: number;
  openValue: number;
  stageSummaries: WorkspacePipelineFunnelStageSummary[];
};

export type WorkspaceForecastConfidenceBucketSummary = {
  bucket: WorkspaceSalesForecastBucket;
  label: string;
  dealCount: number;
  totalValue: number;
  weightedValue: number;
};

export type WorkspaceForecastConfidenceBoardSummary = {
  dealCount: number;
  targetRevenueEgp: number;
  commitRevenue: number;
  weightedForecast: number;
  atRiskValue: number;
  coveragePercent: number;
  averageConfidence: number;
  bucketSummaries: WorkspaceForecastConfidenceBucketSummary[];
};

export type WorkspaceContentPipelineSummary = {
  totalItems: number;
  publishedCount: number;
  reviewCount: number;
  topPlatform: WorkspaceContentPlatform | null;
  bottleneckStatus: WorkspaceContentPipelineStatus | null;
  statusCounts: Record<WorkspaceContentPipelineStatus, number>;
};

export type WorkspaceContentQualityRadarSummary = {
  averageScore: number;
  strongestDimension: WorkspaceContentQualityDimension | null;
  weakestDimension: WorkspaceContentQualityDimension | null;
};

export type WorkspaceContentRoiStatus = "high-return" | "promising" | "low-return";

export type WorkspaceContentRoiTrackerSummary = {
  itemCount: number;
  totalReach: number;
  totalLeads: number;
  totalInfluencedLeads: number;
  averageScore: number;
  topPlatform: WorkspaceContentPlatform | null;
  topCampaign: string | null;
  highReturnCount: number;
  promisingCount: number;
  lowReturnCount: number;
};

export type WorkspaceAuthorityScorecardMetricSummary = {
  key: WorkspaceAuthorityScoreMetricKey;
  value: number;
  target: number;
  progress: number;
};

export type WorkspaceAuthorityScorecardSummary = {
  metricCount: number;
  atTargetCount: number;
  averageProgress: number;
  strongestMetric: WorkspaceAuthorityScoreMetricKey | null;
  weakestMetric: WorkspaceAuthorityScoreMetricKey | null;
  metrics: Record<WorkspaceAuthorityScoreMetricKey, WorkspaceAuthorityScorecardMetricSummary>;
};

export type WorkspaceHookBankSummary = {
  hookCount: number;
  averageScore: number;
  topCategory: string | null;
  topScore: number;
};

export type WorkspaceMessageHouseSummary = {
  filledSectionCount: number;
  emptySectionCount: number;
  pillarCount: number;
  latestStressTestAvailable: boolean;
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

export type WorkspaceProfitabilityCashFlowSummary = {
  clientCount: number;
  totalRevenue: number;
  totalExpenses: number;
  totalProfit: number;
  marginPercent: number;
  paidClients: number;
  partialClients: number;
  overdueClients: number;
  topExpenseCategory: string | null;
};

export type WorkspacePricingSimulatorSummary = {
  activeClients: number;
  monthlyClientHours: number;
  projectedRevenue: number;
  requiredRevenue: number;
  minimumRetainerPerClient: number;
  projectedProfit: number;
};

export type WorkspaceReceivableRiskLevel = "low" | "medium" | "high";

export type WorkspaceCollectionsTrackerSummary = {
  invoiceCount: number;
  totalOutstanding: number;
  overdueAmount: number;
  dueThisWeekAmount: number;
  collectedThisMonth: number;
  highRiskCount: number;
  overdueCount: number;
};

export type WorkspaceCohortHealth = "healthy" | "watch" | "at-risk";

export type WorkspaceCohortHealthSummary = {
  cohortCount: number;
  totalSeatsSold: number;
  totalCapacity: number;
  fillPercent: number;
  bookedRevenueEgp: number;
  atRiskCount: number;
  runningCount: number;
};

export type WorkspaceEisenhowerDomainAllocation = {
  domain: WorkspaceTaskDomain | null;
  label: string;
  taskCount: number;
  estimateMinutes: number;
};

export type WorkspaceEisenhowerQuadrantSummary = {
  key: WorkspaceTaskQuadrant;
  label: string;
  taskCount: number;
  estimateMinutes: number;
  tasks: WorkspaceTask[];
};

export type WorkspaceEisenhowerMatrixSummary = {
  totalTaskCount: number;
  totalEstimateMinutes: number;
  overdueCount: number;
  completedCount: number;
  activeDomainCount: number;
  domainAllocation: WorkspaceEisenhowerDomainAllocation[];
  quadrants: Record<WorkspaceTaskQuadrant, WorkspaceEisenhowerQuadrantSummary>;
  prioritizedTasks: WorkspaceTask[];
};

export type WorkspaceLeadershipRhythmSummary = {
  totalMeetings: number;
  scheduledCount: number;
  missedCount: number;
  doneCount: number;
  needsRescheduleCount: number;
  upcomingCount: number;
  cadenceHealthPercent: number;
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
