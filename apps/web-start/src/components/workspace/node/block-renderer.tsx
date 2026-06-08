import type { WorkspaceBlock } from "@brainiac/workspace";
import type { ComponentType } from "react";

import {
  GenericWorkspaceBlockEditor,
  type WorkspaceBlockEditorProps,
} from "@/components/workspace/node/blocks/generic-block-editor";

const blockEditors = {
  "task-list": GenericWorkspaceBlockEditor,
  notes: GenericWorkspaceBlockEditor,
  table: GenericWorkspaceBlockEditor,
  checklist: GenericWorkspaceBlockEditor,
  decision: GenericWorkspaceBlockEditor,
  "pros-cons": GenericWorkspaceBlockEditor,
  swot: GenericWorkspaceBlockEditor,
  tracker: GenericWorkspaceBlockEditor,
  "ai-prompt": GenericWorkspaceBlockEditor,
  "habit-grid": GenericWorkspaceBlockEditor,
  process: GenericWorkspaceBlockEditor,
  "2x2-matrix": GenericWorkspaceBlockEditor,
  "course-roadmap": GenericWorkspaceBlockEditor,
  "learning-outcomes-matrix": GenericWorkspaceBlockEditor,
  "time-orchestrator": GenericWorkspaceBlockEditor,
  "cohort-health-dashboard": GenericWorkspaceBlockEditor,
  "eisenhower-matrix": GenericWorkspaceBlockEditor,
  "leadership-rhythm-planner": GenericWorkspaceBlockEditor,
  kanban: GenericWorkspaceBlockEditor,
  timeline: GenericWorkspaceBlockEditor,
  "skills-heat-map": GenericWorkspaceBlockEditor,
  "delegation-matrix": GenericWorkspaceBlockEditor,
  "talent-grid": GenericWorkspaceBlockEditor,
  "seat-planner": GenericWorkspaceBlockEditor,
  "deal-scoring-matrix": GenericWorkspaceBlockEditor,
  "pipeline-funnel": GenericWorkspaceBlockEditor,
  "forecast-confidence-board": GenericWorkspaceBlockEditor,
  "content-pipeline": GenericWorkspaceBlockEditor,
  "content-quality-radar": GenericWorkspaceBlockEditor,
  "content-roi-tracker": GenericWorkspaceBlockEditor,
  "authority-scorecard": GenericWorkspaceBlockEditor,
  "hook-bank": GenericWorkspaceBlockEditor,
  "message-house": GenericWorkspaceBlockEditor,
  scorecard: GenericWorkspaceBlockEditor,
  "okr-tracker": GenericWorkspaceBlockEditor,
  "decision-matrix": GenericWorkspaceBlockEditor,
  "business-model-canvas": GenericWorkspaceBlockEditor,
  "assumption-tracker": GenericWorkspaceBlockEditor,
  "profitability-cash-flow": GenericWorkspaceBlockEditor,
  "pricing-simulator": GenericWorkspaceBlockEditor,
  "collections-tracker": GenericWorkspaceBlockEditor,
  "agency-project-manager": GenericWorkspaceBlockEditor,
  "agency-time-tracker": GenericWorkspaceBlockEditor,
  "agency-time-entries-log": GenericWorkspaceBlockEditor,
  "agency-time-summary": GenericWorkspaceBlockEditor,
  "agency-billing-report": GenericWorkspaceBlockEditor,
  "agency-settings": GenericWorkspaceBlockEditor,
  custom: GenericWorkspaceBlockEditor,
} satisfies Record<WorkspaceBlock["type"], ComponentType<WorkspaceBlockEditorProps>>;

export function WorkspaceNodeBlockRenderer(props: WorkspaceBlockEditorProps) {
  const Editor = blockEditors[props.block.type];
  return <Editor {...props} />;
}

export { blockEditors as workspaceReactBlockEditors };
