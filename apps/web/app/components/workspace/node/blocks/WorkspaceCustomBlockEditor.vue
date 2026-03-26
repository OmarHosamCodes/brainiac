<script setup lang="ts">
import type { WorkspaceCustomBlock } from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
    block: WorkspaceCustomBlock;
    tabId: string;
}>();

const {
    mutateBlock,
    getCustomTemplate,
    getCustomFormulaResult,
    formatFormulaResult,
    getCustomPromptPreview,
    runCustomPrompt,
} = useWorkspaceNodeEditorContext();

const template = computed(() => getCustomTemplate(props.block.definitionId));

function getCheckedValue(event: Event) {
    return (event.target as HTMLInputElement | null)?.checked ?? false;
}
</script>

<template>
    <div
        v-if="!template"
        class="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning"
    >
        This block's template was removed. Delete the block or recreate the
        template.
    </div>

    <template v-else>
        <div class="flex flex-wrap items-center gap-2">
            <UBadge color="warning" variant="soft">Legacy block</UBadge>
            <UBadge color="neutral" variant="soft">{{ template.name }}</UBadge>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
            <template v-for="field in template.fields" :key="field.id">
                <UFormField :label="field.label">
                    <template v-if="field.type === 'textarea'">
                        <UTextarea
                            :model-value="String(block.values[field.key] ?? '')"
                            :rows="4"
                            autoresize
                            @update:model-value="
                                mutateBlock(tabId, block.id, (entry) => {
                                    if (entry.type !== 'custom') {
                                        return;
                                    }

                                    entry.values[field.key] = $event ?? '';
                                })
                            "
                        />
                    </template>

                    <template v-else-if="field.type === 'checkbox'">
                        <label
                            class="flex items-center gap-3 rounded-2xl border border-muted/60 bg-elevated/30 px-4 py-3"
                        >
                            <input
                                :checked="Boolean(block.values[field.key])"
                                type="checkbox"
                                class="size-4 rounded border border-muted/80 text-primary focus:ring-primary"
                                @change="
                                    mutateBlock(tabId, block.id, (entry) => {
                                        if (entry.type !== 'custom') {
                                            return;
                                        }

                                        entry.values[field.key] =
                                            getCheckedValue($event);
                                    })
                                "
                            />
                            <span class="text-sm text-toned">Checked</span>
                        </label>
                    </template>

                    <template v-else>
                        <UInput
                            :model-value="String(block.values[field.key] ?? '')"
                            :type="field.type === 'number' ? 'number' : 'text'"
                            @update:model-value="
                                mutateBlock(tabId, block.id, (entry) => {
                                    if (entry.type !== 'custom') {
                                        return;
                                    }

                                    entry.values[field.key] =
                                        field.type === 'number'
                                            ? Number($event ?? 0)
                                            : ($event ?? '');
                                })
                            "
                        />
                    </template>
                </UFormField>
            </template>
        </div>

        <div
            v-if="template.formula"
            class="rounded-2xl border border-muted/60 bg-elevated/30 p-4"
        >
            <p class="text-xs uppercase tracking-[0.2em] text-muted">
                {{ template.formula.label }}
            </p>
            <p class="mt-2 text-2xl font-semibold text-highlighted">
                {{ formatFormulaResult(getCustomFormulaResult(block)) }}
            </p>
        </div>

        <UFormField v-if="template.includeNotes" label="Notes">
            <UTextarea
                :model-value="block.notes"
                :rows="4"
                autoresize
                @update:model-value="
                    mutateBlock(tabId, block.id, (entry) => {
                        if (entry.type !== 'custom') {
                            return;
                        }

                        entry.notes = $event ?? '';
                    })
                "
            />
        </UFormField>

        <div
            v-if="template.aiPromptTemplate"
            class="space-y-3 rounded-2xl border border-muted/60 bg-default p-4"
        >
            <p class="text-sm font-medium text-highlighted">
                AI Prompt Template
            </p>
            <p class="text-sm text-muted">
                {{ getCustomPromptPreview(block) }}
            </p>

            <div class="flex justify-end">
                <UButton
                    color="primary"
                    variant="soft"
                    icon="i-lucide-play"
                    @click="runCustomPrompt(tabId, block.id)"
                >
                    Run template
                </UButton>
            </div>

            <div class="rounded-2xl border border-muted/60 bg-elevated/30 p-4">
                <p class="text-xs uppercase tracking-[0.2em] text-muted">
                    Latest Output
                </p>
                <p
                    class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-toned"
                >
                    {{
                        block.latestAiOutput ||
                        "Run the template to capture output."
                    }}
                </p>
            </div>
        </div>
    </template>
</template>
