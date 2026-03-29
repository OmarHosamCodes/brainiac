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
    class="rounded-3xl border border-warning/20 bg-warning/5 p-4 text-sm text-warning"
  >
    This block's template was removed. Delete the block or recreate the template.
  </div>

  <template v-else>
    <div class="flex flex-wrap items-center gap-2">
      <UBadge color="warning" variant="soft">Legacy block</UBadge>
      <UBadge color="neutral" variant="soft">{{ template.name }}</UBadge>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <template v-for="field in template.fields" :key="field.id">
        <UFormField :label="field.label">
          <template v-if="field.type === 'textarea'">
            <UTextarea
              :model-value="String(block.values[field.key] ?? '')"
              :rows="4"
              autoresize
              class="w-full"
              :ui="{ base: 'rounded-2xl' }"
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
              class="flex items-center gap-3 rounded-2xl border border-muted/20 bg-elevated/10 px-4 py-3"
            >
              <input
                :checked="Boolean(block.values[field.key])"
                type="checkbox"
                class="size-4 rounded border border-muted/20 text-primary focus:ring-primary"
                @change="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'custom') {
                      return;
                    }

                    entry.values[field.key] = getCheckedValue($event);
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
              class="w-full"
              :ui="{ base: 'rounded-2xl' }"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'custom') {
                    return;
                  }

                  entry.values[field.key] =
                    field.type === 'number' ? Number($event ?? 0) : ($event ?? '');
                })
              "
            />
          </template>
        </UFormField>
      </template>
    </div>

    <div v-if="template.formula" class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
        {{ template.formula.label }}
      </p>
      <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-highlighted">
        {{ formatFormulaResult(getCustomFormulaResult(block)) }}
      </p>
    </div>

    <UFormField v-if="template.includeNotes" label="Notes">
      <UTextarea
        :model-value="block.notes"
        :rows="4"
        autoresize
        class="w-full"
        :ui="{ base: 'rounded-2xl' }"
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
      class="space-y-4 rounded-3xl border border-muted/20 bg-default/40 p-5"
    >
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-highlighted">AI Prompt Template</p>
          <p class="mt-1 text-sm text-muted">
            {{ getCustomPromptPreview(block) }}
          </p>
        </div>

        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-play"
          class="rounded-full px-4"
          @click="runCustomPrompt(tabId, block.id)"
        >
          Run
        </UButton>
      </div>

      <div class="rounded-2xl border border-muted/20 bg-elevated/10 p-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Latest Output</p>
        <p class="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-toned">
          {{ block.latestAiOutput || "Run the template to capture output." }}
        </p>
      </div>
    </div>
  </template>
</template>
