import { workspaceBlockCategories, type WorkspaceBlock } from "@brainiac/workspace";

import {
  getDefaultBlockTitle,
  createWorkspaceBlockByType,
} from "@/lib/utils/create-workspace-block";
import {
  workspaceBlockPresets,
  type WorkspaceBlockPresetId,
} from "@/lib/utils/workspace-block-presets";
import {
  getWorkspaceBlockRegistryEntry,
  workspacePrimaryBlockTypes,
} from "@/lib/utils/workspace-block-registry";

export type AddBlockCommandBlockItem = {
  kind: "block";
  type: WorkspaceBlock["type"];
  label: string;
  category: string;
  categoryId: string;
  keywords: string[];
};

export type AddBlockCommandPresetItem = {
  kind: "preset";
  presetId: WorkspaceBlockPresetId;
  label: string;
  description: string;
  blockLabels: string[];
};

export type AddBlockCommandItem = AddBlockCommandBlockItem | AddBlockCommandPresetItem;

export type AddBlockBrowseCategory = {
  id: string;
  label: string;
  items: AddBlockCommandBlockItem[];
};

const ESSENTIALS_CATEGORY_ID = "essentials";

function buildBlockItem(
  type: WorkspaceBlock["type"],
  label: string,
  category: string,
  categoryId: string,
): AddBlockCommandBlockItem {
  return {
    kind: "block",
    type,
    label,
    category,
    categoryId,
    keywords: [type.replace(/-/g, " "), category.toLowerCase(), label.toLowerCase()],
  };
}

export function buildAddBlockCommandCatalog(): {
  blockItems: AddBlockCommandBlockItem[];
  presetItems: AddBlockCommandPresetItem[];
  browseCategories: AddBlockBrowseCategory[];
  essentials: AddBlockCommandBlockItem[];
} {
  const seenTypes = new Set<WorkspaceBlock["type"]>();
  const blockItems: AddBlockCommandBlockItem[] = [];
  const browseCategories: AddBlockBrowseCategory[] = [];

  const essentials: AddBlockCommandBlockItem[] = workspacePrimaryBlockTypes.map((type) => {
    const entry = getWorkspaceBlockRegistryEntry(type);
    seenTypes.add(type);
    return buildBlockItem(type, entry.label, "Essentials", ESSENTIALS_CATEGORY_ID);
  });

  browseCategories.push({
    id: ESSENTIALS_CATEGORY_ID,
    label: "Essentials",
    items: essentials,
  });

  for (const category of workspaceBlockCategories) {
    const items: AddBlockCommandBlockItem[] = [];

    for (const item of category.items) {
      if (seenTypes.has(item.blockType)) continue;
      seenTypes.add(item.blockType);
      const entry = getWorkspaceBlockRegistryEntry(item.blockType);
      const blockItem = buildBlockItem(item.blockType, entry.label, category.label, category.id);
      items.push(blockItem);
      blockItems.push(blockItem);
    }

    if (items.length > 0) {
      browseCategories.push({
        id: category.id,
        label: category.label,
        items,
      });
    }
  }

  const presetItems: AddBlockCommandPresetItem[] = workspaceBlockPresets.map((preset) => ({
    kind: "preset",
    presetId: preset.id,
    label: preset.label,
    description: preset.description,
    blockLabels: preset.createBlocks().map((block) => block.title),
  }));

  return { blockItems, presetItems, browseCategories, essentials };
}

export function getAddBlockItemDefaultTitle(item: AddBlockCommandItem): string {
  if (item.kind === "preset") {
    return item.label;
  }

  return getDefaultBlockTitle(item.type);
}

export function getAddBlockItemPreviewBlocks(item: AddBlockCommandItem): string[] {
  if (item.kind === "preset") {
    return item.blockLabels;
  }

  const block = createWorkspaceBlockByType(item.type);
  return block ? [block.title] : [];
}

export function matchesAddBlockSearch(item: AddBlockCommandItem, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  if (item.kind === "preset") {
    const haystack = [item.label, item.description, ...item.blockLabels].join(" ").toLowerCase();
    return haystack.includes(normalized);
  }

  const haystack = [item.label, item.category, item.type, ...item.keywords].join(" ").toLowerCase();
  return haystack.includes(normalized);
}
