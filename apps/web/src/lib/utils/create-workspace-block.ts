import {
  createWorkspace2x2MatrixBlock,
  createWorkspaceAiPromptBlock,
  createWorkspaceAssumptionTrackerBlock,
  createWorkspaceAuthorityScorecardBlock,
  createWorkspaceBusinessModelCanvasBlock,
  createWorkspaceChecklistBlock,
  createWorkspaceCohortHealthDashboardBlock,
  createWorkspaceCollectionsTrackerBlock,
  createWorkspaceContentPipelineBlock,
  createWorkspaceContentQualityRadarBlock,
  createWorkspaceContentRoiTrackerBlock,
  createWorkspaceCourseRoadmapBlock,
  createWorkspaceDealScoringMatrixBlock,
  createWorkspaceDecisionBlock,
  createWorkspaceDecisionMatrixBlock,
  createWorkspaceDelegationMatrixBlock,
  createWorkspaceEisenhowerMatrixBlock,
  createWorkspaceForecastConfidenceBoardBlock,
  createWorkspaceHabitGridBlock,
  createWorkspaceHookBankBlock,
  createWorkspaceKanbanBlock,
  createWorkspaceLeadershipRhythmPlannerBlock,
  createWorkspaceLearningOutcomesMatrixBlock,
  createWorkspaceMessageHouseBlock,
  createWorkspaceNotesBlock,
  createWorkspaceOkrTrackerBlock,
  createWorkspacePipelineFunnelBlock,
  createWorkspacePricingSimulatorBlock,
  createWorkspaceProcessBlock,
  createWorkspaceProfitabilityCashFlowBlock,
  createWorkspaceProsConsBlock,
  createWorkspaceScorecardBlock,
  createWorkspaceSeatPlannerBlock,
  createWorkspaceSkillsHeatMapBlock,
  createWorkspaceSwotBlock,
  createWorkspaceTableBlock,
  createWorkspaceTalentGridBlock,
  createWorkspaceTaskListBlock,
  createWorkspaceTimelineBlock,
  createWorkspaceTimeOrchestratorBlock,
  createWorkspaceTrackerBlock,
  type WorkspaceBlock,
} from "@brainiac/workspace";

import {
  getWorkspaceBlockPreset,
  type WorkspaceBlockPresetId,
} from "@/lib/utils/workspace-block-presets";

export type CreateWorkspaceBlockOptions = {
  title?: string;
};

export function createWorkspaceBlockByType(
  type: WorkspaceBlock["type"],
  options: CreateWorkspaceBlockOptions = {},
): WorkspaceBlock | null {
  const trimmedTitle = options.title?.trim();
  const titleInput = trimmedTitle ? { title: trimmedTitle } : {};

  switch (type) {
    case "task-list":
      return createWorkspaceTaskListBlock(titleInput);
    case "notes":
      return createWorkspaceNotesBlock(titleInput);
    case "table":
      return createWorkspaceTableBlock(titleInput);
    case "checklist":
      return createWorkspaceChecklistBlock(titleInput);
    case "decision":
      return createWorkspaceDecisionBlock(titleInput);
    case "pros-cons":
      return createWorkspaceProsConsBlock(titleInput);
    case "swot":
      return createWorkspaceSwotBlock(titleInput);
    case "tracker":
      return createWorkspaceTrackerBlock(titleInput);
    case "ai-prompt":
      return createWorkspaceAiPromptBlock(titleInput);
    case "habit-grid":
      return createWorkspaceHabitGridBlock(titleInput);
    case "process":
      return createWorkspaceProcessBlock(titleInput);
    case "2x2-matrix":
      return createWorkspace2x2MatrixBlock(titleInput);
    case "course-roadmap":
      return createWorkspaceCourseRoadmapBlock(titleInput);
    case "learning-outcomes-matrix":
      return createWorkspaceLearningOutcomesMatrixBlock(titleInput);
    case "time-orchestrator":
      return createWorkspaceTimeOrchestratorBlock(titleInput);
    case "cohort-health-dashboard":
      return createWorkspaceCohortHealthDashboardBlock(titleInput);
    case "eisenhower-matrix":
      return createWorkspaceEisenhowerMatrixBlock(titleInput);
    case "leadership-rhythm-planner":
      return createWorkspaceLeadershipRhythmPlannerBlock(titleInput);
    case "kanban":
      return createWorkspaceKanbanBlock(titleInput);
    case "timeline":
      return createWorkspaceTimelineBlock(titleInput);
    case "skills-heat-map":
      return createWorkspaceSkillsHeatMapBlock(titleInput);
    case "delegation-matrix":
      return createWorkspaceDelegationMatrixBlock(titleInput);
    case "talent-grid":
      return createWorkspaceTalentGridBlock(titleInput);
    case "seat-planner":
      return createWorkspaceSeatPlannerBlock(titleInput);
    case "deal-scoring-matrix":
      return createWorkspaceDealScoringMatrixBlock(titleInput);
    case "pipeline-funnel":
      return createWorkspacePipelineFunnelBlock(titleInput);
    case "forecast-confidence-board":
      return createWorkspaceForecastConfidenceBoardBlock(titleInput);
    case "content-pipeline":
      return createWorkspaceContentPipelineBlock(titleInput);
    case "content-quality-radar":
      return createWorkspaceContentQualityRadarBlock(titleInput);
    case "content-roi-tracker":
      return createWorkspaceContentRoiTrackerBlock(titleInput);
    case "authority-scorecard":
      return createWorkspaceAuthorityScorecardBlock(titleInput);
    case "hook-bank":
      return createWorkspaceHookBankBlock(titleInput);
    case "message-house":
      return createWorkspaceMessageHouseBlock(titleInput);
    case "scorecard":
      return createWorkspaceScorecardBlock(titleInput);
    case "okr-tracker":
      return createWorkspaceOkrTrackerBlock(titleInput);
    case "decision-matrix":
      return createWorkspaceDecisionMatrixBlock(titleInput);
    case "business-model-canvas":
      return createWorkspaceBusinessModelCanvasBlock(titleInput);
    case "assumption-tracker":
      return createWorkspaceAssumptionTrackerBlock(titleInput);
    case "profitability-cash-flow":
      return createWorkspaceProfitabilityCashFlowBlock(titleInput);
    case "pricing-simulator":
      return createWorkspacePricingSimulatorBlock(titleInput);
    case "collections-tracker":
      return createWorkspaceCollectionsTrackerBlock(titleInput);
    case "custom":
      return null;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function createWorkspaceBlocksFromPreset(presetId: WorkspaceBlockPresetId): WorkspaceBlock[] {
  const preset = getWorkspaceBlockPreset(presetId);
  if (!preset) return [];
  return preset.createBlocks();
}

export function getDefaultBlockTitle(type: WorkspaceBlock["type"]): string {
  const block = createWorkspaceBlockByType(type);
  return block?.title ?? "Untitled block";
}
