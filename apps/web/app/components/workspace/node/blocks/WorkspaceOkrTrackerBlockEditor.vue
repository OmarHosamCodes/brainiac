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
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-3">
      <div class="rounded-[28px] bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">
          Average Progress
        </p>
        <p class="mt-2 text-4xl font-black tracking-tight text-primary">
          {{ summary.averageProgress }}%
        </p>
      </div>

      <div class="rounded-[28px] bg-warning/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-warning/70">Off Track</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-warning">
          {{ summary.offTrackCount }}
        </p>
      </div>

      <div class="rounded-[28px] bg-success/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-success/70">Healthy</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-success">
          {{ summary.healthyCount }}
        </p>
      </div>
    </div>

    <div class="flex items-center justify-between gap-3 px-1">
      <div>
        <p class="text-sm font-semibold text-highlighted">Objectives</p>
        <p class="text-sm text-muted">
          Track objective health from the average of each objective's key results.
        </p>
      </div>

      <UButton
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        class="rounded-full px-4"
        @click="addObjective"
      >
        New Objective
      </UButton>
    </div>

    <div
      v-if="block.objectives.length === 0"
      class="rounded-[32px] border border-dashed border-muted/50 bg-elevated/10 py-14 text-center"
    >
      <p class="text-sm font-semibold text-muted">No objectives added yet.</p>
    </div>

    <div v-else class="space-y-5">
      <article
        v-for="objective in block.objectives"
        :key="objective.id"
        class="overflow-hidden rounded-[32px] border-l-4 border border-muted/30 bg-default/50 p-5 transition-colors"
        :class="getHealthClasses(getOkrHealth(getOkrObjectiveProgress(objective)))"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <UInput
              :model-value="objective.title"
              variant="none"
              placeholder="Objective title"
              class="w-full"
              :ui="{ base: 'px-0 text-lg font-bold text-highlighted placeholder:text-muted/60' }"
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
            <p class="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted">
              {{ objective.keyResults.length }} key results
            </p>
          </div>

          <div class="flex items-start gap-3">
            <div class="text-right">
              <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">
                Objective Progress
              </p>
              <p
                class="mt-1 text-4xl font-black tracking-tight"
                :class="getHealthTextClasses(getOkrHealth(getOkrObjectiveProgress(objective)))"
              >
                {{ getOkrObjectiveProgress(objective) }}%
              </p>
            </div>

            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              class="rounded-xl hover:text-error"
              @click="removeObjective(objective.id)"
            />
          </div>
        </div>

        <div class="mt-5 space-y-3">
          <div
            v-for="keyResult in objective.keyResults"
            :key="keyResult.id"
            class="rounded-[24px] border border-muted/30 bg-default/70 p-4"
          >
            <div class="flex items-center gap-3">
              <UInput
                :model-value="keyResult.title"
                variant="none"
                placeholder="Key result"
                class="flex-1"
                :ui="{
                  base: 'px-0 text-sm font-semibold text-highlighted placeholder:text-muted/60',
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

              <span class="min-w-14 text-right text-sm font-bold text-primary">
                {{ keyResult.progress }}%
              </span>

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                size="xs"
                class="rounded-lg hover:text-error"
                @click="removeKeyResult(objective.id, keyResult.id)"
              />
            </div>

            <div class="mt-3 space-y-2">
              <UProgress :model-value="keyResult.progress" size="sm" class="rounded-full" />
              <input
                :value="keyResult.progress"
                type="range"
                min="0"
                max="100"
                class="h-2 w-full appearance-none rounded-full bg-muted/20 accent-primary"
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
            </div>
          </div>
        </div>

        <div class="mt-4 flex justify-end">
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-plus"
            class="rounded-full px-4"
            @click="addKeyResult(objective.id)"
          >
            Add KR
          </UButton>
        </div>
      </article>
    </div>
  </div>
</template>
