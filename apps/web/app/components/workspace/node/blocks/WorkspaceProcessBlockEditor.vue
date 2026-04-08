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
  <div class="space-y-5">
    <!-- Header with Progress -->
    <div class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-muted/20 bg-default/40 p-4">
      <div class="space-y-1.5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Progress</p>
        <div class="flex items-center gap-3">
          <p class="text-xl sm:text-2xl font-black tracking-tight text-highlighted">
            {{ summary.completedSteps }}/{{ summary.totalSteps }}
          </p>
          <UBadge color="primary" variant="soft" size="md" class="rounded-lg">
            {{ summary.percent }}%
          </UBadge>
        </div>
      </div>

      <div class="w-full max-w-xs">
        <UProgress
          :model-value="summary.completedSteps"
          :max="Math.max(summary.totalSteps, 1)"
          size="md"
          class="rounded-full"
        />
      </div>

      <UButton
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        size="sm"
        class="rounded-full"
        @click="addStep"
      >
        Add Step
      </UButton>
    </div>

    <!-- Steps Timeline -->
    <div class="relative space-y-4 pl-7">
      <div
        class="absolute bottom-1 left-[13px] top-1 w-0.5 bg-gradient-to-b from-primary/30 via-muted/20 to-transparent"
      />

      <article v-for="(step, index) in block.steps" :key="step.id" class="relative">
        <button
          type="button"
          :id="'step-toggle-' + step.id"
          class="absolute -left-[19px] top-1 z-10 flex size-5 items-center justify-center rounded-full border-2 bg-default text-[10px] font-black transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50"
          :class="
            step.completed
              ? 'border-success/50 bg-success/10 text-success'
              : 'border-primary/30 bg-primary/10 text-primary'
          "
          :aria-label="`Step ${index + 1}: ${step.completed ? 'Mark as incomplete' : 'Mark as complete'}`"
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
          class="rounded-2xl border border-muted/20 bg-default/40 p-4 transition-all hover:border-muted/30"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <UInput
                :model-value="step.title"
                variant="none"
                class="w-full"
                placeholder="Step title"
                size="lg"
                :ui="{
                  base: [
                    'px-0 text-base font-black leading-tight',
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
                class="mt-1.5 text-sm text-toned line-clamp-2"
              >
                {{ step.note }}
              </p>
            </div>

            <div class="flex items-center gap-1 shrink-0">
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                :icon="expandedStepId === step.id ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                class="rounded-lg"
                :aria-label="expandedStepId === step.id ? 'Collapse notes' : 'Expand notes'"
                @click="expandedStepId = expandedStepId === step.id ? null : step.id"
              />
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                size="sm"
                class="rounded-lg hover:text-error hover:bg-error/10"
                aria-label="Remove step"
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
            <label :for="'step-note-' + step.id" class="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 mb-2">
              Notes
            </label>
            <UTextarea
              :id="'step-note-' + step.id"
              :model-value="step.note"
              variant="soft"
              autoresize
              :max-rows="8"
              class="rounded-xl"
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
        class="border-dashed border-muted/20 rounded-2xl py-10 text-center bg-elevated/5"
      >
        <div class="flex size-12 items-center justify-center rounded-xl bg-muted/10 text-muted/30 mx-auto">
          <UIcon name="i-lucide-list-checks" size="24" />
        </div>
        <p class="mt-3 text-xs font-bold text-muted">No steps yet</p>
        <p class="mt-1 text-[11px] text-muted/60">Add steps to build your process</p>
      </div>
    </div>
  </div>
</template>
