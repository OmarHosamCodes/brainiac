import {
  createWorkspaceAssumptionTrackerBlock,
  createWorkspaceBusinessModelCanvasBlock,
  createWorkspaceDelegationMatrixBlock,
  createWorkspaceDecisionBlock,
  createWorkspaceDecisionMatrixBlock,
  createWorkspaceKanbanBlock,
  createWorkspaceNotesBlock,
  createWorkspaceOkrTrackerBlock,
  createWorkspaceScorecardBlock,
  createWorkspaceSeatPlannerBlock,
  createWorkspaceSkillsHeatMapBlock,
  createWorkspaceTaskListBlock,
  createWorkspaceTalentGridBlock,
  createWorkspaceTimelineBlock,
  createWorkspaceTimeOrchestratorBlock,
  createWorkspaceTrackerBlock,
  type WorkspaceBlock,
} from "@orch/workspace";

export type WorkspaceBlockPresetId =
  | "plan-and-ship"
  | "decision-sprint"
  | "ops-cadence"
  | "people-review"
  | "strategy-room";

export type WorkspaceBlockPreset = {
  id: WorkspaceBlockPresetId;
  label: string;
  description: string;
  icon: string;
  createBlocks(): WorkspaceBlock[];
};

export const workspaceBlockPresets: WorkspaceBlockPreset[] = [
  {
    id: "plan-and-ship",
    label: "Plan and ship",
    description: "Task list, delivery board, milestones, and scorecard in one pack.",
    icon: "i-lucide-rocket",
    createBlocks: () => [
      createWorkspaceTaskListBlock({ title: "Action items" }),
      createWorkspaceKanbanBlock({ title: "Delivery board" }),
      createWorkspaceTimelineBlock({ title: "Milestones" }),
      createWorkspaceScorecardBlock({ title: "Outcome scorecard" }),
    ],
  },
  {
    id: "decision-sprint",
    label: "Decision sprint",
    description: "Capture context, evaluate options, and turn decisions into tasks.",
    icon: "i-lucide-scale",
    createBlocks: () => [
      createWorkspaceNotesBlock({ title: "Context notes" }),
      createWorkspaceDecisionBlock({ title: "Decision matrix" }),
      createWorkspaceTaskListBlock({ title: "Execution tasks" }),
      createWorkspaceTimelineBlock({ title: "Commitment timeline" }),
    ],
  },
  {
    id: "ops-cadence",
    label: "Ops cadence",
    description: "Weekly operating rhythm with prioritization and numeric tracking.",
    icon: "i-lucide-repeat",
    createBlocks: () => [
      createWorkspaceTimeOrchestratorBlock({ title: "Prioritization lane" }),
      createWorkspaceTaskListBlock({ title: "Current cycle tasks" }),
      createWorkspaceTrackerBlock({ title: "KPI tracker" }),
      createWorkspaceNotesBlock({ title: "Ops notes" }),
    ],
  },
  {
    id: "people-review",
    label: "People review",
    description: "Skills, delegation, talent calibration, and seat coverage in one pack.",
    icon: "i-lucide-users",
    createBlocks: () => [
      createWorkspaceSkillsHeatMapBlock({ title: "Team skill map" }),
      createWorkspaceDelegationMatrixBlock({ title: "Delegation matrix" }),
      createWorkspaceTalentGridBlock({ title: "9-box talent grid" }),
      createWorkspaceSeatPlannerBlock({ title: "Seat ownership planner" }),
    ],
  },
  {
    id: "strategy-room",
    label: "Strategy room",
    description: "Objectives, weighted decisions, business model design, and assumption tracking.",
    icon: "i-lucide-target",
    createBlocks: () => [
      createWorkspaceOkrTrackerBlock({ title: "Quarter OKRs" }),
      createWorkspaceDecisionMatrixBlock({ title: "Weighted decision" }),
      createWorkspaceBusinessModelCanvasBlock({ title: "Business model canvas" }),
      createWorkspaceAssumptionTrackerBlock({ title: "Strategic assumptions" }),
    ],
  },
];

export function getWorkspaceBlockPreset(id: WorkspaceBlockPresetId) {
  return workspaceBlockPresets.find((preset) => preset.id === id) ?? null;
}
