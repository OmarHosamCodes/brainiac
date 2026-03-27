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

const isPreview = computed(() => isNotePreviewEnabled(props.block.id));
</script>

<template>
  <div class="group relative flex flex-col gap-4">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1">
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          :icon="isPreview ? 'i-lucide-edit-3' : 'i-lucide-eye'"
          class="rounded-lg"
          @click="toggleNotePreview(block.id)"
        >
          {{ isPreview ? 'Edit' : 'Preview' }}
        </UButton>
      </div>
      <p class="text-[10px] font-bold uppercase tracking-widest text-muted/50">
        Markdown Supported
      </p>
    </div>

    <!-- Editor/Preview Area -->
    <div 
      class="min-h-[200px] rounded-3xl border border-muted/20 bg-default/40 transition-all focus-within:border-primary/30 focus-within:bg-default/60"
      :class="{ 'p-6': isPreview }"
    >
      <UTextarea
        v-if="!isPreview"
        :model-value="block.body"
        variant="none"
        placeholder="Start writing something brilliant..."
        autoresize
        :max-rows="20"
        class="w-full"
        :ui="{
          base: 'p-6 text-base leading-relaxed text-toned placeholder:text-muted/40 font-serif',
        }"
        @update:model-value="
          mutateBlock(tabId, block.id, (entry) => {
            if (entry.type !== 'notes') {
              return;
            }

            entry.body = $event ?? '';
          })
        "
      />

      <div
        v-else
        class="prose prose-primary dark:prose-invert max-w-none text-toned"
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
