import {
  workspaceBlockCategories,
  type WorkspaceBlockCategory,
  type WorkspaceBlockCategoryBlockType,
  type WorkspaceNode,
} from "@brainiac/workspace";

export type WorkspaceAddBlockType = WorkspaceBlockCategoryBlockType;
export type WorkspaceAddBlockCategory = WorkspaceBlockCategory;
export type WorkspaceAddBlockMenuItem = {
  label: string;
  type?: "label";
  className?: string;
  icon?: string;
  onSelect?: () => void;
};

export const workspaceAddBlockCategories = workspaceBlockCategories;

export function createWorkspaceAddBlockMenuItems(
  onSelect: (blockType: WorkspaceAddBlockType) => void,
  _node: WorkspaceNode | null,
): WorkspaceAddBlockMenuItem[][] {
  return workspaceAddBlockCategories.map((category) => [
    {
      label: category.label,
      type: "label",
      className: "px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.24em] text-muted/70",
    },
    ...category.items.map((item) => {
      return {
        label: item.label,
        icon: item.icon,
        onSelect: () => {
          onSelect(item.blockType);
        },
      } satisfies WorkspaceAddBlockMenuItem;
    }),
  ]);
}
