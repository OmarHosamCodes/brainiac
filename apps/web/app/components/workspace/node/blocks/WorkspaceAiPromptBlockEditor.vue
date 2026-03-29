<script setup lang="ts">
import type { WorkspaceAiPromptBlock } from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { getErrorMessage } from "~/utils/get-error-message";
import { formatDateTime } from "~/utils/format-date-time";

const props = defineProps<{
  block: WorkspaceAiPromptBlock;
  tabId: string;
}>();

const { mutateBlock, runPromptBlock } = useWorkspaceNodeEditorContext();

const isRunning = ref(false);
const runError = ref<string | null>(null);

async function handleRun() {
  if (isRunning.value || !props.block.prompt.trim()) {
    return;
  }

  isRunning.value = true;
  runError.value = null;

  try {
    await runPromptBlock(props.tabId, props.block.id);
  } catch (error) {
    runError.value = getErrorMessage(error, "AI prompt execution failed.");
  } finally {
    isRunning.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="relative group">
      <div class="absolute -inset-1 rounded-[32px] bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 opacity-30 blur-xl transition-all group-focus-within:opacity-60" />
      <div class="relative rounded-[28px] border border-primary/20 bg-default/80 p-5 backdrop-blur-sm">
        <div class="mb-4 flex flex-wrap items-start justify-between gap-3 px-1">
          <div class="space-y-2">
            <div class="flex items-center gap-2 text-primary">
              <UIcon name="i-lucide-sparkles" class="size-5" />
              <h3 class="text-xs font-bold uppercase tracking-widest">AI Strategist</h3>
            </div>
            <label class="flex items-center gap-2 text-xs text-toned">
              <UCheckbox
                :model-value="block.includeContext"
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'ai-prompt') {
                      return;
                    }

                    entry.includeContext = Boolean($event);
                  })
                "
              />
              <span>Include current node context</span>
            </label>
          </div>

          <UButton
            color="primary"
            icon="i-lucide-zap"
            size="sm"
            class="rounded-full px-5 shadow-lg shadow-primary/20"
            :loading="isRunning"
            :disabled="!block.prompt.trim() || isRunning"
            @click="handleRun"
          >
            Run
          </UButton>
        </div>

        <UTextarea
          :model-value="block.prompt"
          variant="none"
          placeholder="Ask for a structured summary, next actions, a critique, or a standalone answer..."
          autoresize
          :max-rows="10"
          class="w-full"
          :ui="{ base: 'p-0 text-base text-toned font-medium leading-relaxed placeholder:text-muted/40' }"
          @update:model-value="
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== 'ai-prompt') {
                return;
              }

              entry.prompt = $event ?? '';
            })
          "
        />
      </div>
    </div>

    <UAlert
      v-if="runError"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="runError"
      class="rounded-3xl"
    />

    <div v-if="block.latestOutput" class="space-y-3">
      <div class="flex items-center justify-between gap-3 px-2">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-terminal" class="size-4 text-muted/60" />
          <h4 class="text-[10px] font-bold uppercase tracking-widest text-muted/60">
            Latest Result
          </h4>
        </div>
        <UBadge variant="subtle" class="rounded-lg">
          {{ block.includeContext ? "Context aware" : "Standalone" }}
        </UBadge>
      </div>

      <div class="rounded-3xl border border-muted/20 bg-elevated/20 p-6 shadow-sm">
        <div class="prose prose-sm max-w-none whitespace-pre-wrap text-toned leading-relaxed">
          {{ block.latestOutput }}
        </div>
      </div>
    </div>

    <div v-if="block.outputHistory.length > 0" class="space-y-3">
      <div class="flex items-center justify-between px-2">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-history" class="size-4 text-muted/60" />
          <h4 class="text-[10px] font-bold uppercase tracking-widest text-muted/60">
            Prompt History
          </h4>
        </div>
        <span class="text-[10px] font-bold uppercase tracking-widest text-muted/40">
          {{ block.outputHistory.length }} entries
        </span>
      </div>

      <div class="grid gap-3">
        <div
          v-for="entry in block.outputHistory"
          :key="entry.id"
          class="rounded-2xl border border-muted/20 bg-default/40 p-4"
        >
          <div class="mb-2 flex items-center justify-between gap-3">
            <span class="text-[10px] font-bold uppercase tracking-widest text-muted/60">
              {{ formatDateTime(entry.createdAt) }}
            </span>
          </div>
          <p class="text-xs italic text-toned/80 line-clamp-2">"{{ entry.prompt }}"</p>
          <div class="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-toned line-clamp-4">
            {{ entry.output }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
