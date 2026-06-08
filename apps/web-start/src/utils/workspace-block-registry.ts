import { workspaceBlockCategories, type WorkspaceBlock } from "@brainiac/workspace";
import type { ComponentType } from "react";

import { workspaceReactBlockEditors } from "@/components/workspace/node/block-renderer";
import type { WorkspaceBlockEditorProps } from "@/components/workspace/node/blocks/generic-block-editor";

export type WorkspaceBlockEditorComponent = ComponentType<{
  block: WorkspaceBlock;
  onChange?: (block: WorkspaceBlock) => void;
  onDelete?: () => void;
}>;

export type WorkspaceBlockRegistryEntry = {
  component: WorkspaceBlockEditorComponent | null;
  Editor: ComponentType<WorkspaceBlockEditorProps>;
  label: string;
  icon: string;
  addGroup: "primary" | "secondary" | null;
  summary?: (block: WorkspaceBlock) => string | null;
};

const primaryBlockTypes = new Set<WorkspaceBlock["type"]>(["task-list", "notes", "decision"]);

const categoryEntries = Object.fromEntries(
  workspaceBlockCategories.flatMap((category) =>
    category.items.map((item) => [
      item.blockType,
      {
        component: null,
        Editor: workspaceReactBlockEditors[item.blockType],
        label: item.label,
        icon: item.icon,
        addGroup: primaryBlockTypes.has(item.blockType) ? "primary" : "secondary",
      } satisfies WorkspaceBlockRegistryEntry,
    ]),
  ),
) as Record<Exclude<WorkspaceBlock["type"], "custom" | "decision" | "notes" | "task-list">, WorkspaceBlockRegistryEntry>;

export const workspaceBlockRegistry = {
  "task-list": {
    component: null,
    Editor: workspaceReactBlockEditors["task-list"],
    label: "Task list",
    icon: "i-lucide-list-todo",
    addGroup: "primary",
  },
  notes: {
    component: null,
    Editor: workspaceReactBlockEditors.notes,
    label: "Notes",
    icon: "i-lucide-notebook-text",
    addGroup: "primary",
  },
  decision: {
    component: null,
    Editor: workspaceReactBlockEditors.decision,
    label: "Decision",
    icon: "i-lucide-git-pull-request-arrow",
    addGroup: "primary",
  },
  custom: {
    component: null,
    Editor: workspaceReactBlockEditors.custom,
    label: "Custom",
    icon: "i-lucide-box",
    addGroup: null,
  },
  ...categoryEntries,
} satisfies Record<WorkspaceBlock["type"], WorkspaceBlockRegistryEntry>;
