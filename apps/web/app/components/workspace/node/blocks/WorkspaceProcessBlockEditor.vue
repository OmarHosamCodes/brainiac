<script setup lang="ts">
import {
  createWorkspaceProcessStep,
  getProcessSummary,
  type WorkspaceProcessBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceProcessBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getProcessSummary(props.block));
const expandedStepId = ref<string | null>(null);

function addStep() {
  mutateBlock(props.tabId, props.block.id, (entry) => {
    if (entry.type !== "process") {
      return;
    }

    entry.steps.push(createWorkspaceProcessStep({ title: `Step ${entry.steps.length + 1}` }));
  });
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-muted/20 bg-default/40 p-5">
      <div class="space-y-2">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Complete</p>
        <div class="flex items-center gap-3">
          <p class="text-2xl sm:text-3xl font-black tracking-tight text-highlighted">
            {{ summary.completedSteps }}/{{ summary.totalSteps }}
          </p>
          <UBadge color="primary" variant="subtle" class="rounded-lg">
            {{ summary.percent }}%
          </UBadge>
        </div>
      </div>

      <div class="w-full max-w-sm">
        <UProgress
          :model-value="summary.completedSteps"
          :max="Math.max(summary.totalSteps, 1)"
          class="rounded-full"
        />
      </div>

      <UButton
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        class="rounded-full px-4"
        @click="addStep"
      >
        Add Step
      </UButton>
    </div>

    <div class="relative space-y-5 pl-8">
      <div
        class="absolute bottom-2 left-[15px] top-2 w-0.5 bg-gradient-to-b from-primary/30 via-muted/20 to-transparent"
      />

      <article v-for="(step, index) in block.steps" :key="step.id" class="relative">
        <button
          type="button"
          class="absolute -left-[21px] top-1 z-10 flex size-5 items-center justify-center rounded-full border-2 bg-default text-[10px] font-black transition-transform hover:scale-110"
          :class="
            step.completed
              ? 'border-success/50 bg-success/10 text-success'
              : 'border-primary/30 bg-primary/10 text-primary'
          "
          @click="
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== 'process') {
                return;
              }

              const target = entry.steps.find((candidate) => candidate.id === step.id);

              if (target) {
                target.completed = !target.completed;
              }
            })
          "
        >
          {{ index + 1 }}
        </button>

        <div
          class="rounded-3xl border border-muted/20 bg-default/40 p-5 transition-all hover:border-primary/20 hover:bg-default/60"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <UInput
                :model-value="step.title"
                variant="none"
                class="w-full"
                placeholder="Step title"
                :ui="{
                  base: [
                    'px-0 text-lg font-bold leading-tight',
                    step.completed ? 'text-muted line-through' : 'text-highlighted',
                  ].join(' '),
                }"
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'process') {
                      return;
                    }

                    const target = entry.steps.find((candidate) => candidate.id === step.id);

                    if (target) {
                      target.title = ($event ?? '').slice(0, 160);
                    }
                  })
                "
              />
              <p
                v-if="step.note && expandedStepId !== step.id"
                class="mt-2 line-clamp-2 text-sm text-toned"
              >
                {{ step.note }}
              </p>
            </div>

            <div class="flex items-center gap-1">
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                :icon="expandedStepId === step.id ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                class="rounded-lg"
                @click="expandedStepId = expandedStepId === step.id ? null : step.id"
              />
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                icon="i-lucide-trash-2"
                class="rounded-lg hover:text-error"
                @click="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'process') {
                      return;
                    }

                    entry.steps = entry.steps.filter((candidate) => candidate.id !== step.id);
                  })
                "
              />
            </div>
          </div>

          <div v-if="expandedStepId === step.id" class="mt-4 border-t border-muted/10 pt-4">
            <UTextarea
              :model-value="step.note"
              variant="soft"
              autoresize
              :max-rows="8"
              class="rounded-2xl"
              placeholder="Add supporting notes, instructions, or completion criteria..."
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'process') {
                    return;
                  }

                  const target = entry.steps.find((candidate) => candidate.id === step.id);

                  if (target) {
                    target.note = ($event ?? '').slice(0, 2000);
                  }
                })
              "
            />
          </div>
        </div>
      </article>

      <div
        v-if="block.steps.length === 0"
        class="border-dashed border-muted/20 rounded-3xl py-12 text-center bg-elevated/5"
      >
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">No process steps</p>
      </div>
    </div>
  </div>
</template>
