import type { WorkspaceBlock } from "@orch/workspace";
import { ArrowLeft, LayoutTemplate } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Button } from "@/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/ui/command";
import { Input } from "@/ui/input";
import {
  buildAddBlockCommandCatalog,
  getAddBlockItemDefaultTitle,
  getAddBlockItemPreviewBlocks,
  matchesAddBlockSearch,
  type AddBlockCommandBlockItem,
  type AddBlockCommandItem,
} from "@/features/workspace/utils/add-block-command-catalog";
import { getWorkspaceBlockRegistryEntry } from "@/features/workspace/utils/workspace-block-registry";
import { cn } from "@/lib/utils";

export type WorkspaceAddBlockCommandView = "search" | "browse";

type WorkspaceAddBlockCommandProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialView?: WorkspaceAddBlockCommandView;
  onInserted: (blockIds: string[]) => void;
  canEdit: boolean;
};

type PaletteMode = "list" | "confirm";

export function WorkspaceAddBlockCommand({
  open,
  onOpenChange,
  initialView = "search",
  onInserted,
  canEdit,
}: WorkspaceAddBlockCommandProps) {
  const { addBlockToActiveTab, addBlockPresetToActiveTab } = useWorkspaceNodeEditorContext();
  const catalog = useMemo(() => buildAddBlockCommandCatalog(), []);

  const [activeTab, setActiveTab] = useState<WorkspaceAddBlockCommandView>(initialView);
  const [mode, setMode] = useState<PaletteMode>("list");
  const [browseCategoryId, setBrowseCategoryId] = useState(
    catalog.browseCategories[0]?.id ?? "essentials",
  );
  const [pendingItem, setPendingItem] = useState<AddBlockCommandItem | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  const browseCategory =
    catalog.browseCategories.find((category) => category.id === browseCategoryId) ??
    catalog.browseCategories[0];

  const filteredBlockItems = useMemo(
    () => catalog.blockItems.filter((item) => matchesAddBlockSearch(item, searchQuery)),
    [catalog.blockItems, searchQuery],
  );

  const filteredEssentials = useMemo(
    () => catalog.essentials.filter((item) => matchesAddBlockSearch(item, searchQuery)),
    [catalog.essentials, searchQuery],
  );

  const filteredPresets = useMemo(
    () => catalog.presetItems.filter((item) => matchesAddBlockSearch(item, searchQuery)),
    [catalog.presetItems, searchQuery],
  );

  function resetState() {
    setMode("list");
    setPendingItem(null);
    setTitleInput("");
    setSearchQuery("");
    setActiveTab(initialView);
    setBrowseCategoryId(catalog.browseCategories[0]?.id ?? "essentials");
  }

  useEffect(() => {
    if (!open) {
      resetState();
      return;
    }

    setActiveTab(initialView);
  }, [open, initialView, catalog.browseCategories]);

  useEffect(() => {
    if (mode === "confirm" && open) {
      titleInputRef.current?.focus();
    }
  }, [mode, open]);

  function handleOpenChange(nextOpen: boolean) {
    if (!canEdit && nextOpen) return;
    onOpenChange(nextOpen);
  }

  function beginConfirm(item: AddBlockCommandItem) {
    setPendingItem(item);
    setTitleInput("");
    setMode("confirm");
  }

  function returnToList() {
    setMode("list");
    setPendingItem(null);
    setTitleInput("");
  }

  function confirmInsert() {
    if (!pendingItem) return;

    const trimmedTitle = titleInput.trim();
    let blockIds: string[] = [];

    if (pendingItem.kind === "preset") {
      blockIds = addBlockPresetToActiveTab(pendingItem.presetId);
    } else {
      const blockId = addBlockToActiveTab(pendingItem.type, {
        title: trimmedTitle || undefined,
      });
      if (blockId) blockIds = [blockId];
    }

    if (blockIds.length > 0) {
      onInserted(blockIds);
    }

    handleOpenChange(false);
  }

  function renderBlockIcon(type: WorkspaceBlock["type"]) {
    const Icon = getWorkspaceBlockRegistryEntry(type).icon;
    return <Icon className="size-4 text-toned" />;
  }

  function renderCommandItem(item: AddBlockCommandBlockItem) {
    return (
      <CommandItem
        key={item.type}
        value={`${item.label} ${item.category} ${item.type}`}
        onSelect={() => beginConfirm(item)}
      >
        {renderBlockIcon(item.type)}
        <span className="flex-1 truncate">{item.label}</span>
        <span className="text-xs text-muted-foreground">{item.category}</span>
      </CommandItem>
    );
  }

  function renderPresetItem(item: (typeof catalog.presetItems)[number]) {
    return (
      <CommandItem
        key={item.presetId}
        value={`${item.label} ${item.description} preset`}
        onSelect={() => beginConfirm(item)}
      >
        <LayoutTemplate className="size-4 text-toned" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.label}</p>
          <p className="truncate text-xs text-muted-foreground">{item.description}</p>
        </div>
        <CommandShortcut>{item.blockLabels.length} blocks</CommandShortcut>
      </CommandItem>
    );
  }

  function renderBrowseItem(item: AddBlockCommandBlockItem) {
    const Icon = getWorkspaceBlockRegistryEntry(item.type).icon;

    return (
      <button
        key={item.type}
        type="button"
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20"
        onClick={() => beginConfirm(item)}
      >
        <Icon className="size-4 shrink-0 text-toned" />
        <span className="flex-1 truncate font-medium">{item.label}</span>
      </button>
    );
  }

  const previewBlocks = pendingItem ? getAddBlockItemPreviewBlocks(pendingItem) : [];
  const defaultTitle = pendingItem ? getAddBlockItemDefaultTitle(pendingItem) : "";

  return (
    <CommandDialog
      open={open && canEdit}
      onOpenChange={handleOpenChange}
      title="Add block"
      description="Search or browse blocks to add to this workspace"
    >
      {mode === "confirm" && pendingItem ? (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-border px-3 py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={returnToList}
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <p className="text-sm font-semibold text-highlighted">
              {pendingItem.kind === "preset" ? "Add block pack" : "Name this block"}
            </p>
          </div>

          <div className="space-y-4 px-4 py-4">
            <div className="rounded-xl border border-border bg-muted/20 px-3 py-3">
              <p className="text-sm font-semibold text-highlighted">
                {pendingItem.kind === "preset"
                  ? pendingItem.label
                  : getWorkspaceBlockRegistryEntry(pendingItem.type).label}
              </p>
              {pendingItem.kind === "preset" ? (
                <>
                  <p className="mt-1 text-xs text-muted-foreground">{pendingItem.description}</p>
                  <p className="mt-2 text-xs font-medium text-toned">
                    Adds {previewBlocks.length} blocks
                  </p>
                  <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {previewBlocks.map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Optional title. Leave blank to use the default name.
                </p>
              )}
            </div>

            {pendingItem.kind === "block" ? (
              <div className="space-y-2">
                <label htmlFor="add-block-title" className="text-xs font-semibold text-toned">
                  Block title
                </label>
                <Input
                  id="add-block-title"
                  ref={titleInputRef}
                  value={titleInput}
                  placeholder={defaultTitle}
                  onChange={(event) => setTitleInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      confirmInsert();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      returnToList();
                    }
                  }}
                />
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={returnToList}>
                Cancel
              </Button>
              <Button type="button" onClick={confirmInsert}>
                {pendingItem.kind === "preset" ? "Add pack" : "Add block"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <Command shouldFilter={false} className="rounded-none">
          <div className="flex border-b border-border">
            {(["search", "browse"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={cn(
                  "flex-1 px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20",
                  activeTab === tab
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-highlighted",
                )}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "search" ? "Search" : "Browse"}
              </button>
            ))}
          </div>

          {activeTab === "search" ? (
            <>
              <CommandInput
                placeholder="Search blocks and packs..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>No blocks match your search.</CommandEmpty>

                {filteredEssentials.length > 0 ? (
                  <CommandGroup heading="Essentials">
                    {filteredEssentials.map(renderCommandItem)}
                  </CommandGroup>
                ) : null}

                {filteredPresets.length > 0 ? (
                  <CommandGroup heading="Block packs">
                    {filteredPresets.map(renderPresetItem)}
                  </CommandGroup>
                ) : null}

                {filteredBlockItems.length > 0 ? (
                  <CommandGroup heading="All blocks">
                    {filteredBlockItems.map(renderCommandItem)}
                  </CommandGroup>
                ) : null}
              </CommandList>
            </>
          ) : (
            <div className="flex min-h-[min(420px,50vh)]">
              <div className="w-40 shrink-0 overflow-y-auto border-r border-border p-2">
                {catalog.browseCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={cn(
                      "mb-0.5 w-full rounded-xl px-2.5 py-2 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20",
                      browseCategoryId === category.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-highlighted",
                    )}
                    onClick={() => setBrowseCategoryId(category.id)}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
              <div className="min-w-0 flex-1 overflow-y-auto p-2">
                {browseCategory ? browseCategory.items.map(renderBrowseItem) : null}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
            <span>
              <kbd className="font-mono">↑↓</kbd> navigate
            </span>
            <span>
              <kbd className="font-mono">Enter</kbd> select
            </span>
            <span>
              <kbd className="font-mono">Esc</kbd> close
            </span>
            <span className="hidden sm:inline">
              <kbd className="font-mono">⌘K</kbd> toggle
            </span>
          </div>
        </Command>
      )}
    </CommandDialog>
  );
}
