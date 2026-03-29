import type { WorkspaceBlock } from "@brainiac/workspace";
import type { Component } from "vue";

import WorkspaceAiPromptBlockEditor from "~/components/workspace/node/blocks/WorkspaceAiPromptBlockEditor.vue";
import WorkspaceAssumptionTrackerBlockEditor from "~/components/workspace/node/blocks/WorkspaceAssumptionTrackerBlockEditor.vue";
import WorkspaceAuthorityScorecardBlockEditor from "~/components/workspace/node/blocks/WorkspaceAuthorityScorecardBlockEditor.vue";
import WorkspaceBusinessModelCanvasBlockEditor from "~/components/workspace/node/blocks/WorkspaceBusinessModelCanvasBlockEditor.vue";
import WorkspaceCohortHealthDashboardBlockEditor from "~/components/workspace/node/blocks/WorkspaceCohortHealthDashboardBlockEditor.vue";
import WorkspaceCollectionsTrackerBlockEditor from "~/components/workspace/node/blocks/WorkspaceCollectionsTrackerBlockEditor.vue";
import WorkspaceContentPipelineBlockEditor from "~/components/workspace/node/blocks/WorkspaceContentPipelineBlockEditor.vue";
import WorkspaceContentQualityRadarBlockEditor from "~/components/workspace/node/blocks/WorkspaceContentQualityRadarBlockEditor.vue";
import WorkspaceContentRoiTrackerBlockEditor from "~/components/workspace/node/blocks/WorkspaceContentRoiTrackerBlockEditor.vue";
import WorkspaceCourseRoadmapBlockEditor from "~/components/workspace/node/blocks/WorkspaceCourseRoadmapBlockEditor.vue";
import WorkspaceHookBankBlockEditor from "~/components/workspace/node/blocks/WorkspaceHookBankBlockEditor.vue";
import WorkspaceKanbanBlockEditor from "~/components/workspace/node/blocks/WorkspaceKanbanBlockEditor.vue";
import WorkspaceCustomBlockEditor from "~/components/workspace/node/blocks/WorkspaceCustomBlockEditor.vue";
import WorkspaceDecisionMatrixBlockEditor from "~/components/workspace/node/blocks/WorkspaceDecisionMatrixBlockEditor.vue";
import WorkspaceDecisionBlockEditor from "~/components/workspace/node/blocks/WorkspaceDecisionBlockEditor.vue";
import WorkspaceDelegationMatrixBlockEditor from "~/components/workspace/node/blocks/WorkspaceDelegationMatrixBlockEditor.vue";
import WorkspaceDealScoringMatrixBlockEditor from "~/components/workspace/node/blocks/WorkspaceDealScoringMatrixBlockEditor.vue";
import WorkspaceEisenhowerMatrixBlockEditor from "~/components/workspace/node/blocks/WorkspaceEisenhowerMatrixBlockEditor.vue";
import WorkspaceLeadershipRhythmPlannerBlockEditor from "~/components/workspace/node/blocks/WorkspaceLeadershipRhythmPlannerBlockEditor.vue";
import WorkspaceLearningOutcomesMatrixBlockEditor from "~/components/workspace/node/blocks/WorkspaceLearningOutcomesMatrixBlockEditor.vue";
import WorkspaceMessageHouseBlockEditor from "~/components/workspace/node/blocks/WorkspaceMessageHouseBlockEditor.vue";
import WorkspaceNotesBlockEditor from "~/components/workspace/node/blocks/WorkspaceNotesBlockEditor.vue";
import WorkspaceForecastConfidenceBoardBlockEditor from "~/components/workspace/node/blocks/WorkspaceForecastConfidenceBoardBlockEditor.vue";
import WorkspaceOkrTrackerBlockEditor from "~/components/workspace/node/blocks/WorkspaceOkrTrackerBlockEditor.vue";
import WorkspacePipelineFunnelBlockEditor from "~/components/workspace/node/blocks/WorkspacePipelineFunnelBlockEditor.vue";
import WorkspacePricingSimulatorBlockEditor from "~/components/workspace/node/blocks/WorkspacePricingSimulatorBlockEditor.vue";
import WorkspaceProfitabilityCashFlowBlockEditor from "~/components/workspace/node/blocks/WorkspaceProfitabilityCashFlowBlockEditor.vue";
import WorkspaceScorecardBlockEditor from "~/components/workspace/node/blocks/WorkspaceScorecardBlockEditor.vue";
import WorkspaceSeatPlannerBlockEditor from "~/components/workspace/node/blocks/WorkspaceSeatPlannerBlockEditor.vue";
import WorkspaceSkillsHeatMapBlockEditor from "~/components/workspace/node/blocks/WorkspaceSkillsHeatMapBlockEditor.vue";
import WorkspaceTalentGridBlockEditor from "~/components/workspace/node/blocks/WorkspaceTalentGridBlockEditor.vue";
import WorkspaceTaskListBlockEditor from "~/components/workspace/node/blocks/WorkspaceTaskListBlockEditor.vue";
import WorkspaceTimeOrchestratorBlockEditor from "~/components/workspace/node/blocks/WorkspaceTimeOrchestratorBlockEditor.vue";
import WorkspaceTimelineBlockEditor from "~/components/workspace/node/blocks/WorkspaceTimelineBlockEditor.vue";
import WorkspaceTrackerBlockEditor from "~/components/workspace/node/blocks/WorkspaceTrackerBlockEditor.vue";

export type WorkspaceBlockRegistryEntry = {
  component: Component;
  label: string;
  icon: string;
  addGroup: "primary" | "secondary" | null;
};

export const workspaceBlockRegistry = {
  "task-list": {
    component: WorkspaceTaskListBlockEditor,
    label: "Task list",
    icon: "i-lucide-list-checks",
    addGroup: "primary",
  },
  notes: {
    component: WorkspaceNotesBlockEditor,
    label: "Notes",
    icon: "i-lucide-notebook-tabs",
    addGroup: "primary",
  },
  decision: {
    component: WorkspaceDecisionBlockEditor,
    label: "Decision",
    icon: "i-lucide-scale",
    addGroup: "primary",
  },
  tracker: {
    component: WorkspaceTrackerBlockEditor,
    label: "Tracker",
    icon: "i-lucide-chart-column",
    addGroup: "secondary",
  },
  "ai-prompt": {
    component: WorkspaceAiPromptBlockEditor,
    label: "AI prompt",
    icon: "i-lucide-sparkles",
    addGroup: "secondary",
  },
  "course-roadmap": {
    component: WorkspaceCourseRoadmapBlockEditor,
    label: "Course roadmap",
    icon: "i-lucide-book-open",
    addGroup: "secondary",
  },
  "learning-outcomes-matrix": {
    component: WorkspaceLearningOutcomesMatrixBlockEditor,
    label: "Learning outcomes matrix",
    icon: "i-lucide-graduation-cap",
    addGroup: "secondary",
  },
  "time-orchestrator": {
    component: WorkspaceTimeOrchestratorBlockEditor,
    label: "Time orchestrator",
    icon: "i-lucide-calendar-range",
    addGroup: "secondary",
  },
  "cohort-health-dashboard": {
    component: WorkspaceCohortHealthDashboardBlockEditor,
    label: "Cohort health dashboard",
    icon: "i-lucide-users",
    addGroup: "secondary",
  },
  "eisenhower-matrix": {
    component: WorkspaceEisenhowerMatrixBlockEditor,
    label: "Eisenhower matrix",
    icon: "i-lucide-layout-grid",
    addGroup: "secondary",
  },
  "leadership-rhythm-planner": {
    component: WorkspaceLeadershipRhythmPlannerBlockEditor,
    label: "Leadership rhythm planner",
    icon: "i-lucide-repeat",
    addGroup: "secondary",
  },
  kanban: {
    component: WorkspaceKanbanBlockEditor,
    label: "Kanban",
    icon: "i-lucide-columns-3",
    addGroup: "secondary",
  },
  timeline: {
    component: WorkspaceTimelineBlockEditor,
    label: "Timeline",
    icon: "i-lucide-waypoints",
    addGroup: "secondary",
  },
  "skills-heat-map": {
    component: WorkspaceSkillsHeatMapBlockEditor,
    label: "Skills heat map",
    icon: "i-lucide-grid-3x3",
    addGroup: "secondary",
  },
  "delegation-matrix": {
    component: WorkspaceDelegationMatrixBlockEditor,
    label: "Delegation matrix",
    icon: "i-lucide-arrow-right-left",
    addGroup: "secondary",
  },
  "talent-grid": {
    component: WorkspaceTalentGridBlockEditor,
    label: "9-box talent grid",
    icon: "i-lucide-layout-grid",
    addGroup: "secondary",
  },
  "seat-planner": {
    component: WorkspaceSeatPlannerBlockEditor,
    label: "Seat ownership planner",
    icon: "i-lucide-blinds",
    addGroup: "secondary",
  },
  "deal-scoring-matrix": {
    component: WorkspaceDealScoringMatrixBlockEditor,
    label: "Deal scoring matrix",
    icon: "i-lucide-badge-percent",
    addGroup: "secondary",
  },
  "pipeline-funnel": {
    component: WorkspacePipelineFunnelBlockEditor,
    label: "Pipeline funnel",
    icon: "i-lucide-funnel",
    addGroup: "secondary",
  },
  "forecast-confidence-board": {
    component: WorkspaceForecastConfidenceBoardBlockEditor,
    label: "Forecast confidence board",
    icon: "i-lucide-circle-dollar-sign",
    addGroup: "secondary",
  },
  "content-pipeline": {
    component: WorkspaceContentPipelineBlockEditor,
    label: "Content pipeline",
    icon: "i-lucide-megaphone",
    addGroup: "secondary",
  },
  "content-quality-radar": {
    component: WorkspaceContentQualityRadarBlockEditor,
    label: "Content quality radar",
    icon: "i-lucide-chart-area",
    addGroup: "secondary",
  },
  "content-roi-tracker": {
    component: WorkspaceContentRoiTrackerBlockEditor,
    label: "Content ROI tracker",
    icon: "i-lucide-chart-column",
    addGroup: "secondary",
  },
  "authority-scorecard": {
    component: WorkspaceAuthorityScorecardBlockEditor,
    label: "Authority scorecard",
    icon: "i-lucide-badge-check",
    addGroup: "secondary",
  },
  "hook-bank": {
    component: WorkspaceHookBankBlockEditor,
    label: "Hook bank",
    icon: "i-lucide-quote",
    addGroup: "secondary",
  },
  "message-house": {
    component: WorkspaceMessageHouseBlockEditor,
    label: "Message house",
    icon: "i-lucide-house",
    addGroup: "secondary",
  },
  scorecard: {
    component: WorkspaceScorecardBlockEditor,
    label: "Scorecard",
    icon: "i-lucide-gauge",
    addGroup: "secondary",
  },
  "okr-tracker": {
    component: WorkspaceOkrTrackerBlockEditor,
    label: "OKR tracker",
    icon: "i-lucide-target",
    addGroup: "secondary",
  },
  "decision-matrix": {
    component: WorkspaceDecisionMatrixBlockEditor,
    label: "Decision matrix",
    icon: "i-lucide-grid-2x2",
    addGroup: "secondary",
  },
  "business-model-canvas": {
    component: WorkspaceBusinessModelCanvasBlockEditor,
    label: "Business model canvas",
    icon: "i-lucide-layout-template",
    addGroup: "secondary",
  },
  "assumption-tracker": {
    component: WorkspaceAssumptionTrackerBlockEditor,
    label: "Assumption tracker",
    icon: "i-lucide-flask-conical",
    addGroup: "secondary",
  },
  "profitability-cash-flow": {
    component: WorkspaceProfitabilityCashFlowBlockEditor,
    label: "Profitability & cash flow",
    icon: "i-lucide-wallet",
    addGroup: "secondary",
  },
  "pricing-simulator": {
    component: WorkspacePricingSimulatorBlockEditor,
    label: "Pricing simulator",
    icon: "i-lucide-sliders-horizontal",
    addGroup: "secondary",
  },
  "collections-tracker": {
    component: WorkspaceCollectionsTrackerBlockEditor,
    label: "Collections tracker",
    icon: "i-lucide-receipt-text",
    addGroup: "secondary",
  },
  custom: {
    component: WorkspaceCustomBlockEditor,
    label: "Legacy custom",
    icon: "i-lucide-blocks",
    addGroup: null,
  },
} satisfies Record<WorkspaceBlock["type"], WorkspaceBlockRegistryEntry>;

export const workspacePrimaryBlockTypes = Object.entries(workspaceBlockRegistry)
  .filter(([, entry]) => entry.addGroup === "primary")
  .map(([type]) => type) as Array<
  Extract<WorkspaceBlock["type"], "task-list" | "notes" | "decision">
>;

export function getWorkspaceBlockRegistryEntry(type: WorkspaceBlock["type"]) {
  return workspaceBlockRegistry[type];
}
