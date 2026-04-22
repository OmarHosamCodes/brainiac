<script setup lang="ts">
import {
  createWorkspaceOkrKeyResult,
  createWorkspaceOkrObjective,
  getOkrHealth,
  getOkrObjectiveProgress,
  getOkrTrackerSummary,
  type WorkspaceOkrHealth,
  type WorkspaceOkrTrackerBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceOkrTrackerBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getOkrTrackerSummary(props.block));

function clampProgress(value: string) {
  const numeric = Number(value || 0);
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function getInputValue(event: Event) {
  return (event.target as HTMLInputElement | null)?.value ?? "0";
}

function addObjective() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "okr-tracker") {
      return;
    }

    block.objectives.push(
      createWorkspaceOkrObjective({
        keyResults: [createWorkspaceOkrKeyResult()],
      }),
    );
  });
}

function addKeyResult(objectiveId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "okr-tracker") {
      return;
    }

    const objective = block.objectives.find((entry) => entry.id === objectiveId);

    if (!objective) {
      return;
    }

    objective.keyResults.push(createWorkspaceOkrKeyResult());
  });
}

function removeObjective(objectiveId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "okr-tracker") {
      return;
    }

    block.objectives = block.objectives.filter((objective) => objective.id !== objectiveId);
  });
}

function removeKeyResult(objectiveId: string, keyResultId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "okr-tracker") {
      return;
    }

    const objective = block.objectives.find((entry) => entry.id === objectiveId);

    if (!objective) {
      return;
    }

    objective.keyResults = objective.keyResults.filter((keyResult) => keyResult.id !== keyResultId);
  });
}

function getHealthClasses(health: WorkspaceOkrHealth) {
  switch (health) {
    case "healthy":
      return "border-success/40 bg-success/5";
    case "watch":
      return "border-warning/40 bg-warning/5";
    default:
      return "border-error/40 bg-error/5";
  }
}

function getHealthTextClasses(health: WorkspaceOkrHealth) {
  switch (health) {
    case "healthy":
      return "text-success";
    case "watch":
      return "text-warning";
    default:
      return "text-error";
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Summary Stats -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div class="rounded-2xl bg-primary/5 p-4 border border-primary/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
          Average Progress
        </p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-primary">
          {{ summary.averageProgress }}%
        </p>
      </div>

      <div class="rounded-2xl bg-warning/5 p-4 border border-warning/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Off Track</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-warning">
          {{ summary.offTrackCount }}
        </p>
      </div>

      <div class="rounded-2xl bg-success/5 p-4 border border-success/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Healthy</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-success">
          {{ summary.healthyCount }}
        </p>
      </div>
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between gap-3 px-1">
      <div>
        <h2 class="text-sm font-black text-highlighted tracking-tight">Objectives</h2>
        <p class="text-xs text-muted">Track objective health from the average of key results.</p>
      </div>

      <UButton
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        size="sm"
        class="rounded-full"
        @click="addObjective"
      >
        New Objective
      </UButton>
    </div>

    <!-- Empty State -->
    <div
      v-if="block.objectives.length === 0"
      class="border-dashed border-muted/20 rounded-2xl py-10 text-center bg-elevated/5"
    >
      <div
        class="flex size-12 items-center justify-center rounded-xl bg-muted/10 text-muted/30 mx-auto"
      >
        <UIcon name="i-lucide-target" size="24" />
      </div>
      <p class="mt-3 text-xs font-bold text-muted">No objectives yet</p>
      <p class="mt-1 text-[11px] text-muted/60">Add objectives to track progress and health</p>
    </div>

    <!-- Objective Cards -->
    <div v-else class="space-y-4">
      <article
        v-for="objective in block.objectives"
        :key="objective.id"
        class="overflow-hidden rounded-2xl border-l-4 border border-muted/20 bg-default/40 p-4 transition-colors"
        :class="getHealthClasses(getOkrHealth(getOkrObjectiveProgress(objective)))"
      >
        <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div class="min-w-0 flex-1">
            <UInput
              :model-value="objective.title"
              variant="none"
              placeholder="Objective title"
              class="w-full"
              :ui="{ base: 'px-0 text-base font-black text-highlighted placeholder:text-muted/40' }"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'okr-tracker') return;
                  const target = entry.objectives.find(
                    (candidate) => candidate.id === objective.id,
                  );
                  if (!target) return;
                  target.title = ($event ?? '').slice(0, 160);
                })
              "
            />
            <p class="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
              {{ objective.keyResults.length }} key result{{
                objective.keyResults.length !== 1 ? "s" : ""
              }}
            </p>
          </div>

          <div class="flex items-start gap-3 shrink-0">
            <div class="text-right">
              <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Progress</p>
              <p
                class="mt-1 text-xl sm:text-2xl font-black tracking-tight"
                :class="getHealthTextClasses(getOkrHealth(getOkrObjectiveProgress(objective)))"
              >
                {{ getOkrObjectiveProgress(objective) }}%
              </p>
            </div>

            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              size="sm"
              class="rounded-lg hover:text-error hover:bg-error/10"
              aria-label="Remove objective"
              @click="removeObjective(objective.id)"
            />
          </div>
        </div>

        <!-- Key Results -->
        <div class="space-y-3">
          <div
            v-for="keyResult in objective.keyResults"
            :key="keyResult.id"
            class="rounded-xl border border-muted/20 bg-default/60 p-3"
          >
            <div class="flex items-center gap-3 mb-2">
              <UInput
                :model-value="keyResult.title"
                variant="none"
                placeholder="Key result"
                class="flex-1"
                :ui="{
                  base: 'px-0 text-sm font-bold text-highlighted placeholder:text-muted/40',
                }"
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'okr-tracker') return;
                    const targetObjective = entry.objectives.find(
                      (candidate) => candidate.id === objective.id,
                    );
                    const targetKeyResult = targetObjective?.keyResults.find(
                      (candidate) => candidate.id === keyResult.id,
                    );
                    if (!targetKeyResult) return;
                    targetKeyResult.title = ($event ?? '').slice(0, 160);
                  })
                "
              />

              <span class="min-w-12 text-right text-sm font-bold text-primary font-mono">
                {{ keyResult.progress }}%
              </span>

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                size="xs"
                class="rounded-lg hover:text-error hover:bg-error/10"
                aria-label="Remove key result"
                @click="removeKeyResult(objective.id, keyResult.id)"
              />
            </div>

            <!-- Accessible Progress Slider -->
            <div class="space-y-1.5">
              <UProgress :model-value="keyResult.progress" size="sm" class="rounded-full" />
              <div class="flex items-center gap-2">
                <input
                  :id="'kr-progress-' + keyResult.id"
                  :value="keyResult.progress"
                  type="range"
                  min="0"
                  max="100"
                  class="h-1.5 flex-1 appearance-none rounded-full bg-muted/20 accent-primary cursor-pointer"
                  aria-label="Key result progress"
                  @input="
                    mutateBlock(tabId, block.id, (entry) => {
                      if (entry.type !== 'okr-tracker') return;
                      const targetObjective = entry.objectives.find(
                        (candidate) => candidate.id === objective.id,
                      );
                      const targetKeyResult = targetObjective?.keyResults.find(
                        (candidate) => candidate.id === keyResult.id,
                      );
                      if (!targetKeyResult) return;
                      targetKeyResult.progress = clampProgress(getInputValue($event));
                    })
                  "
                />
                <UInput
                  :model-value="String(keyResult.progress)"
                  type="number"
                  size="xs"
                  variant="subtle"
                  class="w-14 rounded-lg"
                  :ui="{ base: 'text-center text-xs font-mono' }"
                  @update:model-value="
                    mutateBlock(tabId, block.id, (entry) => {
                      if (entry.type !== 'okr-tracker') return;
                      const targetObjective = entry.objectives.find(
                        (candidate) => candidate.id === objective.id,
                      );
                      const targetKeyResult = targetObjective?.keyResults.find(
                        (candidate) => candidate.id === keyResult.id,
                      );
                      if (!targetKeyResult) return;
                      targetKeyResult.progress = clampProgress($event as string);
                    })
                  "
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Add KR Button -->
        <div class="mt-4 flex justify-end">
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-plus"
            size="sm"
            class="rounded-full"
            @click="addKeyResult(objective.id)"
          >
            Add Key Result
          </UButton>
        </div>
      </article>
    </div>
  </div>
</template>
