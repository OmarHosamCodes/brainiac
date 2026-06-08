import { workspaceBlockCategories, type WorkspaceBlock } from "@brainiac/workspace";
import type { ComponentType } from "react";

export type WorkspaceBlockEditorComponent = ComponentType<{
  block: WorkspaceBlock;
  onChange?: (block: WorkspaceBlock) => void;
  onDelete?: () => void;
}>;

export type WorkspaceBlockRegistryEntry = {
  component: WorkspaceBlockEditorComponent | null;
  label: string;
  icon: string;
  addGroup: "primary" | "secondary" | null;
};

const primaryBlockTypes = new Set<WorkspaceBlock["type"]>(["task-list", "notes", "decision"]);

export const workspaceBlockRegistry = Object.fromEntries(
  workspaceBlockCategories.flatMap((category) =>
    category.items.map((item) => [
      item.blockType,
      {
        component: null,
        label: item.label,
        icon: item.icon,
        addGroup: primaryBlockTypes.has(item.blockType) ? "primary" : "secondary",
      } satisfies WorkspaceBlockRegistryEntry,
    ]),
  ),
) as Record<WorkspaceBlock["type"], WorkspaceBlockRegistryEntry>;
