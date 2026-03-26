<script setup lang="ts">
import type { WorkspaceNotesBlock } from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceNotesBlock;
  tabId: string;
}>();

const {
  mutateBlock,
  isNotePreviewEnabled,
  toggleNotePreview,
  renderNotesPreview,
} = useWorkspaceNodeEditorContext();
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <p class="text-sm text-muted">
      Autosaves while you type. Simple formatting supports `**bold**`, `*italic*`, and bullet lines starting with `-`.
    </p>

    <UButton
      color="neutral"
      variant="ghost"
      :icon="isNotePreviewEnabled(block.id) ? 'i-lucide-pencil' : 'i-lucide-eye'"
      @click="toggleNotePreview(block.id)"
    >
      {{ isNotePreviewEnabled(block.id) ? "Edit" : "Preview" }}
    </UButton>
  </div>

  <div
    v-if="isNotePreviewEnabled(block.id)"
    class="prose prose-sm max-w-none rounded-2xl border border-muted/60 bg-elevated/30 p-4 text-toned"
    v-html="renderNotesPreview(block.body)"
  />

  <UTextarea
    v-else
    :model-value="block.body"
    :rows="12"
    autoresize
    placeholder="Write notes, meeting context, or working drafts here."
    @update:model-value="
      mutateBlock(tabId, block.id, (entry) => {
        if (entry.type !== 'notes') {
          return;
        }

        entry.body = $event ?? '';
      })
    "
  />
</template>
