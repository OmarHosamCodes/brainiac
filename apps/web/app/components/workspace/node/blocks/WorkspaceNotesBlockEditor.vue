<script setup lang="ts">
import type { WorkspaceNotesBlock } from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceNotesBlock;
  tabId: string;
}>();

const { mutateTypedBlock, isNotePreviewEnabled, toggleNotePreview, renderNotesPreview } =
  useWorkspaceNodeEditorContext();

const isPreview = computed(() => isNotePreviewEnabled(props.block.id));
const wordCount = computed(() => props.block.body.trim().split(/\s+/).filter(Boolean).length);

function updateBody(value: string | number | undefined) {
  mutateTypedBlock(props.tabId, props.block.id, "notes", (block) => {
    block.body = String(value ?? "");
  });
}
</script>

<template>
  <div class="group relative flex flex-col gap-4">
    <!-- Toolbar -->
    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <div class="flex flex-wrap items-center gap-2">
        <UBadge variant="subtle" class="rounded-2xl">
          {{ isPreview ? "Preview" : "Editing" }}
        </UBadge>
        <UBadge color="neutral" variant="soft" class="rounded-2xl">
          {{ wordCount }} {{ wordCount === 1 ? "word" : "words" }}
        </UBadge>
      </div>

      <div class="flex items-center gap-2">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
          Markdown supported
        </p>
        <UButton
          color="neutral"
          variant="subtle"
          size="xs"
          :icon="isPreview ? 'i-lucide-pencil' : 'i-lucide-eye'"
          class="rounded-full px-3"
          :aria-label="isPreview ? 'Switch to note editing' : 'Switch to note preview'"
          @click="toggleNotePreview(block.id)"
        >
          {{ isPreview ? "Edit" : "Preview" }}
        </UButton>
      </div>
    </div>

    <!-- Editor/Preview Area -->
    <div
      class="min-h-[240px] rounded-3xl border border-muted/20 bg-default/40 shadow-sm transition-all focus-within:border-primary/30 focus-within:bg-default/60"
      :class="{ 'p-8': isPreview }"
    >
      <UTextarea
        v-if="!isPreview"
        :model-value="block.body"
        variant="none"
        placeholder="Capture notes, decisions, or raw thinking..."
        autoresize
        :rows="12"
        :max-rows="30"
        class="w-full"
        :ui="{
          base: 'p-8 text-base leading-relaxed text-toned placeholder:text-muted/30 font-serif selection:bg-primary/20',
        }"
        @update:model-value="updateBody($event)"
      />

      <!-- Empty State for Preview -->
      <div
        v-else-if="!block.body.trim()"
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <UIcon name="i-lucide-sticky-note" class="mb-3 size-8 text-muted/20" />
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/40">
          No notes to preview
        </p>
      </div>

      <div
        v-else
        class="prose prose-primary dark:prose-invert max-w-none text-toned selection:bg-primary/20"
        v-html="renderNotesPreview(block.body)"
      />
    </div>
  </div>
</template>

<style scoped>
:deep(.prose) {
  font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
}
:deep(.prose p) {
  line-height: 1.8;
}
</style>
