<script setup lang="ts">
import {
  createWorkspaceDecisionMatrixCriterion,
  createWorkspaceDecisionMatrixOption,
  getDecisionMatrixSummary,
  type WorkspaceDecisionMatrixBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceDecisionMatrixBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getDecisionMatrixSummary(props.block));
const summaryByOptionId = computed(
  () => new Map(summary.value.optionScores.map((option) => [option.optionId, option])),
);
const matrixGridStyle = computed(() => ({
  gridTemplateColumns: `minmax(15rem, 1.35fr) repeat(${props.block.options.length}, minmax(12rem, 1fr))`,
}));

function clampWeight(value: string) {
  const numeric = Number(value || 5);
  return Math.min(10, Math.max(1, Math.round(numeric)));
}

function clampScore(value: string) {
  const numeric = Number(value || 0);
  return Math.min(10, Math.max(0, Math.round(numeric)));
}

function getInputValue(event: Event) {
  return (event.target as HTMLInputElement | null)?.value ?? "0";
}

function getNextOptionLabel(index: number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return index < alphabet.length ? `Option ${alphabet[index]}` : `Option ${index + 1}`;
}

function addCriterion() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "decision-matrix") {
      return;
    }

    const criterion = createWorkspaceDecisionMatrixCriterion();
    block.criteria.push(criterion);

    for (const option of block.options) {
      option.scores[criterion.id] = 5;
    }
  });
}

function removeCriterion(criterionId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "decision-matrix" || block.criteria.length <= 1) {
      return;
    }

    block.criteria = block.criteria.filter((criterion) => criterion.id !== criterionId);

    for (const option of block.options) {
      delete option.scores[criterionId];
    }
  });
}

function addOption() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "decision-matrix") {
      return;
    }

    block.options.push(
      createWorkspaceDecisionMatrixOption({
        label: getNextOptionLabel(block.options.length),
        scores: Object.fromEntries(block.criteria.map((criterion) => [criterion.id, 5])),
      }),
    );
  });
}

function removeOption(optionId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "decision-matrix" || block.options.length <= 1) {
      return;
    }

    block.options = block.options.filter((option) => option.id !== optionId);
  });
}

function getOptionSummary(optionId: string) {
  return summaryByOptionId.value.get(optionId) ?? null;
}
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
        Decision Prompt
      </p>
      <UInput
        :model-value="block.question"
        variant="none"
        placeholder="What decision are you making?"
        class="mt-2 w-full"
        :ui="{
          base: 'px-0 text-xl font-bold tracking-tight text-highlighted placeholder:text-muted/40',
        }"
        @update:model-value="
          mutateBlock(tabId, block.id, (entry) => {
            if (entry.type !== 'decision-matrix') return;
            entry.question = ($event ?? '').slice(0, 240);
          })
        "
      />
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="option in block.options"
        :key="option.id"
        class="rounded-3xl border border-muted/20 bg-default/40 p-5"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <UInput
              :model-value="option.label"
              variant="none"
              placeholder="Option name"
              class="w-full"
              :ui="{ base: 'px-0 text-lg font-bold text-highlighted placeholder:text-muted/60' }"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'decision-matrix') return;
                  const target = entry.options.find((candidate) => candidate.id === option.id);
                  if (!target) return;
                  target.label = ($event ?? '').slice(0, 80);
                })
              "
            />
            <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-primary">
              {{ getOptionSummary(option.id)?.totalScore ?? 0 }}
            </p>
          </div>

          <div class="flex flex-col items-end gap-2">
            <UBadge
              v-if="getOptionSummary(option.id)?.isWinner"
              color="primary"
              variant="soft"
              size="sm"
              class="rounded-full px-3 uppercase tracking-[0.18em]"
            >
              {{ summary.hasTie ? "Tied Lead" : "Recommended" }}
            </UBadge>

            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              size="xs"
              class="rounded-2xl hover:text-error"
              :disabled="block.options.length <= 1"
              @click="removeOption(option.id)"
            />
          </div>
        </div>

        <div class="mt-4 space-y-2">
          <div
            class="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
          >
            <span>Relative Score</span>
            <span>{{ getOptionSummary(option.id)?.progress ?? 0 }}%</span>
          </div>
          <UProgress
            :model-value="getOptionSummary(option.id)?.progress ?? 0"
            size="sm"
            class="rounded-full"
          />
          <p class="text-xs text-muted/60 mt-2 font-medium">
            Average weighted score: {{ getOptionSummary(option.id)?.averageScore ?? 0 }}
          </p>
        </div>
      </article>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <div>
        <p class="text-sm font-semibold text-highlighted">Weighted scoring matrix</p>
        <p class="text-sm text-muted">
          Increase criterion weight when it matters more, then score each option from 0 to 10.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          class="rounded-full px-4"
          @click="addCriterion"
        >
          Add Criteria
        </UButton>
        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-columns-2"
          class="rounded-full px-4"
          @click="addOption"
        >
          Add Option
        </UButton>
      </div>
    </div>

    <div class="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
      <div
        class="grid min-w-[760px] gap-px overflow-hidden rounded-3xl border border-muted/20 bg-muted/20"
        :style="matrixGridStyle"
      >
        <div class="bg-elevated/10 p-4 flex flex-col justify-center">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Criteria</p>
          <p class="mt-1 text-xs font-medium text-toned/70">
            {{ summary.criteriaCount }} criteria, {{ summary.totalWeight }} weight pts
          </p>
        </div>

        <div
          v-for="option in block.options"
          :key="`${option.id}-header`"
          class="bg-elevated/10 p-4 flex flex-col justify-center"
        >
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 truncate">
            {{ option.label || "Option" }}
          </p>
          <p class="mt-1 text-lg font-black text-highlighted">
            {{ getOptionSummary(option.id)?.totalScore ?? 0 }}
          </p>
        </div>

        <template v-for="criterion in block.criteria" :key="criterion.id">
          <div class="space-y-3 bg-default/40 p-4 flex flex-col justify-center">
            <div class="flex items-start justify-between gap-3">
              <UInput
                :model-value="criterion.label"
                variant="none"
                placeholder="Criterion name"
                class="flex-1"
                :ui="{
                  base: 'px-0 text-sm font-semibold text-highlighted placeholder:text-muted/40',
                }"
                @update:model-value="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'decision-matrix') return;
                    const target = entry.criteria.find(
                      (candidate) => candidate.id === criterion.id,
                    );
                    if (!target) return;
                    target.label = ($event ?? '').slice(0, 120);
                  })
                "
              />

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                size="xs"
                class="rounded-lg hover:text-error"
                :disabled="block.criteria.length <= 1"
                @click="removeCriterion(criterion.id)"
              />
            </div>

            <div class="space-y-1.5">
              <div
                class="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
              >
                <span>Weight</span>
                <span>{{ criterion.weight }}/10</span>
              </div>
              <input
                :value="criterion.weight"
                type="range"
                min="1"
                max="10"
                class="h-1.5 w-full appearance-none rounded-full bg-muted/20 accent-primary"
                @input="
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== 'decision-matrix') return;
                    const target = entry.criteria.find(
                      (candidate) => candidate.id === criterion.id,
                    );
                    if (!target) return;
                    target.weight = clampWeight(getInputValue($event));
                  })
                "
              />
            </div>
          </div>

          <div
            v-for="option in block.options"
            :key="`${criterion.id}-${option.id}`"
            class="bg-default/40 p-4 flex flex-col justify-center"
          >
            <div
              class="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
            >
              <span>Score</span>
              <span>{{ option.scores[criterion.id] ?? 0 }}/10</span>
            </div>

            <input
              :value="option.scores[criterion.id] ?? 0"
              type="range"
              min="0"
              max="10"
              class="mt-2 h-1.5 w-full appearance-none rounded-full bg-muted/20 accent-primary"
              @input="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'decision-matrix') return;
                  const target = entry.options.find((candidate) => candidate.id === option.id);
                  if (!target) return;
                  target.scores[criterion.id] = clampScore(getInputValue($event));
                })
              "
            />

            <div class="mt-3 flex justify-between text-xs font-medium text-toned/70">
              <span>Weighted</span>
              <span class="font-black text-highlighted">
                {{ (option.scores[criterion.id] ?? 0) * criterion.weight }}
              </span>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
