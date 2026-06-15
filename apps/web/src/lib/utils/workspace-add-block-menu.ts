import {
  workspaceBlockCategories,
  type WorkspaceBlockCategory,
  type WorkspaceBlockCategoryBlockType,
  type WorkspaceNode,
} from "@brainiac/workspace";
import type { DropdownMenuItem } from "@nuxt/ui";

export type WorkspaceAddBlockType = WorkspaceBlockCategoryBlockType;
export type WorkspaceAddBlockCategory = WorkspaceBlockCategory;

export const workspaceAddBlockCategories = workspaceBlockCategories;

export function createWorkspaceAddBlockMenuItems(
  onSelect: (blockType: WorkspaceAddBlockType) => void,
  _node: WorkspaceNode | null,
): DropdownMenuItem[][] {
  return workspaceAddBlockCategories.map((category) => [
    {
      label: category.label,
      type: "label",
      class: "px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.24em] text-muted/70",
    },
    ...category.items.map((item) => {
      return {
        label: item.label,
        icon: item.icon,
        onSelect: () => {
          onSelect(item.blockType);
        },
      } satisfies DropdownMenuItem;
    }),
  ]);
}
