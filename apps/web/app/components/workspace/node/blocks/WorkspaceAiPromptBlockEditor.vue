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
  <div class="space-y-6">
    <!-- Prompt Input Area -->
    <div class="relative group">
        <div class="absolute -inset-1 rounded-[32px] bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 opacity-30 blur-xl transition-all group-focus-within:opacity-60" />
        <div class="relative rounded-[28px] border border-primary/20 bg-default/80 p-5 backdrop-blur-sm">
            <div class="mb-4 flex items-center justify-between gap-2 px-1">
                <div class="flex items-center gap-2 text-primary">
                    <UIcon name="i-lucide-sparkles" class="size-5" />
                    <h3 class="text-xs font-bold uppercase tracking-widest">AI Strategist</h3>
                </div>
                <UButton
                    color="primary"
                    icon="i-lucide-zap"
                    size="sm"
                    class="rounded-full px-5 shadow-lg shadow-primary/20"
                    :disabled="!block.prompt.trim()"
                    @click="runPromptBlock(tabId, block.id)"
                >
                    Generate
                </UButton>
            </div>
            
            <UTextarea
                :model-value="block.prompt"
                variant="none"
                placeholder="Ask for a structured summary, next actions, or a strategic recommendation..."
                autoresize
                :max-rows="10"
                class="w-full"
                :ui="{ base: 'p-0 text-base text-toned font-medium leading-relaxed placeholder:text-muted/40' }"
                @update:model-value="
                    mutateBlock(tabId, block.id, (entry) => {
                        if (entry.type === 'ai-prompt') entry.prompt = $event ?? '';
                    })
                "
            />
        </div>
    </div>

    <!-- Latest Output -->
    <div v-if="block.latestOutput" class="space-y-3">
        <div class="flex items-center gap-2 px-2">
            <UIcon name="i-lucide-terminal" class="size-4 text-muted/60" />
            <h4 class="text-[10px] font-bold uppercase tracking-widest text-muted/60">Execution Output</h4>
        </div>
        
        <div class="rounded-3xl border border-muted/20 bg-elevated/20 p-6 shadow-sm">
            <div class="prose prose-sm dark:prose-invert max-w-none text-toned leading-relaxed whitespace-pre-wrap">
                {{ block.latestOutput }}
            </div>
        </div>
    </div>

    <!-- History -->
    <div v-if="block.outputHistory.length > 0" class="space-y-3">
        <div class="flex items-center justify-between px-2">
            <div class="flex items-center gap-2">
                <UIcon name="i-lucide-history" class="size-4 text-muted/60" />
                <h4 class="text-[10px] font-bold uppercase tracking-widest text-muted/60">Previous Syntheses</h4>
            </div>
            <span class="text-[10px] font-bold text-muted/40 uppercase tracking-widest">{{ block.outputHistory.length }} entries</span>
        </div>
        
        <div class="grid gap-3">
            <div
                v-for="entry in block.outputHistory"
                :key="entry.id"
                class="group relative overflow-hidden rounded-2xl border border-muted/20 bg-default/40 p-4 transition-all hover:border-primary/20 hover:bg-default/60"
            >
                <div class="flex items-center justify-between gap-3 mb-2">
                    <span class="text-[10px] font-bold uppercase tracking-widest text-muted/60">
                        {{ formatDateTime(entry.createdAt) }}
                    </span>
                    <UIcon name="i-lucide-file-check-2" class="size-3 text-primary/40 group-hover:text-primary transition-colors" />
                </div>
                <p class="text-xs text-toned/80 line-clamp-2 italic">"{{ entry.prompt }}"</p>
                <div class="mt-2 text-xs text-toned line-clamp-3 leading-relaxed whitespace-pre-wrap">
                    {{ entry.output }}
                </div>
            </div>
        </div>
    </div>
  </div>
</template>
