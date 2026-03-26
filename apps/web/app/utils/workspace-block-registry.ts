import type { WorkspaceBlock } from "@brainiac/workspace";
import type { Component } from "vue";

import WorkspaceAiPromptBlockEditor from "~/components/workspace/node/blocks/WorkspaceAiPromptBlockEditor.vue";
import WorkspaceKanbanBlockEditor from "~/components/workspace/node/blocks/WorkspaceKanbanBlockEditor.vue";
import WorkspaceCustomBlockEditor from "~/components/workspace/node/blocks/WorkspaceCustomBlockEditor.vue";
import WorkspaceDecisionBlockEditor from "~/components/workspace/node/blocks/WorkspaceDecisionBlockEditor.vue";
import WorkspaceNotesBlockEditor from "~/components/workspace/node/blocks/WorkspaceNotesBlockEditor.vue";
import WorkspaceScorecardBlockEditor from "~/components/workspace/node/blocks/WorkspaceScorecardBlockEditor.vue";
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
  "time-orchestrator": {
    component: WorkspaceTimeOrchestratorBlockEditor,
    label: "Time orchestrator",
    icon: "i-lucide-calendar-range",
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
  scorecard: {
    component: WorkspaceScorecardBlockEditor,
    label: "Scorecard",
    icon: "i-lucide-gauge",
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
