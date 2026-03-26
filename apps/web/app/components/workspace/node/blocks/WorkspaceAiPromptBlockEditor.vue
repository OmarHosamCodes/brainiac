<script setup lang="ts">
import type { WorkspaceAiPromptBlock } from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { formatDateTime } from "~/utils/format-date-time";

const props = defineProps<{
  block: WorkspaceAiPromptBlock;
  tabId: string;
}>();

const { mutateBlock, runPromptBlock } = useWorkspaceNodeEditorContext();
</script>

<template>
  <UFormField label="Prompt">
    <UTextarea
      :model-value="block.prompt"
      :rows="6"
      autoresize
      placeholder="Ask for a structured summary, next actions, or a recommendation. Output only updates when you click Run."
      @update:model-value="
        mutateBlock(tabId, block.id, (entry) => {
          if (entry.type !== 'ai-prompt') {
            return;
          }

          entry.prompt = $event ?? '';
        })
      "
    />
  </UFormField>

  <div class="flex flex-wrap items-center justify-between gap-3">
    <p class="text-sm text-muted">Previous outputs are stored inside this block.</p>

    <UButton
      color="primary"
      icon="i-lucide-play"
      :disabled="!block.prompt.trim()"
      @click="runPromptBlock(tabId, block.id)"
    >
      Run
    </UButton>
  </div>

  <div class="rounded-2xl border border-muted/60 bg-elevated/30 p-4">
    <p class="text-xs uppercase tracking-[0.2em] text-muted">Latest Output</p>
    <p class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-toned">
      {{ block.latestOutput || "Run the prompt to capture an output snapshot." }}
    </p>
  </div>

  <div v-if="block.outputHistory.length > 0" class="space-y-3">
    <p class="text-sm font-medium text-highlighted">History</p>
    <div
      v-for="entry in block.outputHistory"
      :key="entry.id"
      class="rounded-2xl border border-muted/60 bg-default p-4"
    >
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs uppercase tracking-[0.2em] text-muted">
          {{ formatDateTime(entry.createdAt) }}
        </p>
        <UBadge color="neutral" variant="soft">Saved output</UBadge>
      </div>
      <p class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-toned">
        {{ entry.output }}
      </p>
    </div>
  </div>
</template>
