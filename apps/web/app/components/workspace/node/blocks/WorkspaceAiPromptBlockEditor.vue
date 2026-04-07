<script setup lang="ts">
import type { WorkspaceAiPromptBlock } from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { getErrorMessage } from "~/utils/get-error-message";
import { formatDateTime } from "~/utils/format-date-time";

const props = defineProps<{
    block: WorkspaceAiPromptBlock;
    tabId: string;
}>();

const { mutateTypedBlock, runPromptBlock, getBlockOperationState } =
    useWorkspaceNodeEditorContext();

const runError = ref<string | null>(null);

const operationState = computed(() =>
    getBlockOperationState(props.tabId, props.block.id),
);

const hasPrompt = computed(() => props.block.prompt.trim().length > 0);

const contextModeLabel = computed(() =>
    props.block.includeContext ? "Uses current node" : "Standalone prompt",
);

async function handleRun() {
    if (operationState.value.pending || !hasPrompt.value) {
        return;
    }

    runError.value = null;

    try {
        await runPromptBlock(props.tabId, props.block.id);
    } catch (error) {
        runError.value = getErrorMessage(error, "Could not run this prompt.");
    }
}

function updateIncludeContext(value: boolean | string | undefined) {
    mutateTypedBlock(props.tabId, props.block.id, "ai-prompt", (block) => {
        block.includeContext = Boolean(value);
    });
}

function updatePrompt(value: string | number | undefined) {
    mutateTypedBlock(props.tabId, props.block.id, "ai-prompt", (block) => {
        block.prompt = String(value ?? "");
    });
}
</script>

<template>
    <div class="space-y-6">
        <div class="relative group">
            <div
                class="absolute -inset-1 rounded-[32px] bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 opacity-30 blur-xl transition-all group-focus-within:opacity-60"
            />
            <div
                class="relative rounded-3xl border border-primary/20 bg-default/80 p-5 backdrop-blur-sm"
            >
                <div
                    class="mb-4 flex flex-wrap items-start justify-between gap-3 px-1"
                >
                    <div class="space-y-3">
                        <div class="flex items-center gap-2 text-primary">
                            <UIcon name="i-lucide-sparkles" class="size-5" />
                            <h3
                                class="text-[10px] font-bold uppercase tracking-[0.2em]"
                            >
                                AI Strategist
                            </h3>
                        </div>

                        <div class="flex flex-wrap items-center gap-2">
                            <UBadge variant="subtle" class="rounded-2xl">
                                {{ contextModeLabel }}
                            </UBadge>
                            <UBadge
                                v-if="operationState.pending"
                                color="primary"
                                variant="soft"
                                class="rounded-2xl"
                            >
                                {{ operationState.label || "Running prompt" }}
                            </UBadge>
                        </div>

                        <label
                            class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                        >
                            <UCheckbox
                                :model-value="block.includeContext"
                                size="sm"
                                @update:model-value="
                                    updateIncludeContext($event)
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
                        :loading="operationState.pending"
                        :disabled="!hasPrompt || operationState.pending"
                        @click="handleRun"
                    >
                        {{
                            operationState.pending
                                ? "Running prompt"
                                : "Run prompt"
                        }}
                    </UButton>
                </div>

                <UTextarea
                    :model-value="block.prompt"
                    variant="none"
                    placeholder="Ask for a structured summary, next actions, critique, or standalone answer..."
                    autoresize
                    :max-rows="10"
                    class="w-full"
                    :ui="{
                        base: 'p-0 text-base text-toned font-medium leading-relaxed placeholder:text-muted/40',
                    }"
                    @update:model-value="updatePrompt($event)"
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
                    <UIcon
                        name="i-lucide-terminal"
                        class="size-4 text-muted/60"
                    />
                    <h4
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >
                        Latest result
                    </h4>
                </div>
                <UBadge variant="subtle" class="rounded-2xl">
                    {{ contextModeLabel }}
                </UBadge>
            </div>

            <div
                class="rounded-3xl border border-muted/20 bg-elevated/10 p-6 shadow-sm"
            >
                <div
                    class="prose prose-sm max-w-none whitespace-pre-wrap text-toned leading-relaxed"
                >
                    {{ block.latestOutput }}
                </div>
            </div>
        </div>

        <div v-if="block.outputHistory.length > 0" class="space-y-3">
            <div class="flex items-center justify-between px-2">
                <div class="flex items-center gap-2">
                    <UIcon
                        name="i-lucide-history"
                        class="size-4 text-muted/60"
                    />
                    <h4
                        class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                    >
                        Prompt history
                    </h4>
                </div>
                <span
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/40"
                >
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
                        <span
                            class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                        >
                            {{ formatDateTime(entry.createdAt) }}
                        </span>
                    </div>
                    <p class="text-xs italic text-toned/80 line-clamp-2">
                        "{{ entry.prompt }}"
                    </p>
                    <div
                        class="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-toned line-clamp-4"
                    >
                        {{ entry.output }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
