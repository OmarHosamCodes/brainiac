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

const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getDecisionMatrixSummary(props.block));

const summaryByOptionId = computed(
  () => new Map(summary.value.optionScores.map((option) => [option.optionId, option])),
);

const optionRanks = computed(() => {
  const sorted = [...summary.value.optionScores].sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }

    return a.label.localeCompare(b.label);
  });

  return new Map(sorted.map((option, index) => [option.optionId, index + 1]));
});

const matrixGridStyle = computed(() => ({
  gridTemplateColumns: `minmax(15rem, 1.35fr) repeat(${props.block.options.length}, minmax(12rem, 1fr))`,
}));

function clampWeight(value: string | number | undefined) {
  const numeric = Number(value || 5);
  return Math.min(10, Math.max(1, Math.round(numeric)));
}

function clampScore(value: string | number | undefined) {
  const numeric = Number(value || 0);
  return Math.min(10, Math.max(0, Math.round(numeric)));
}

function getNextOptionLabel(index: number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return index < alphabet.length ? `Option ${alphabet[index]}` : `Option ${index + 1}`;
}

function getOptionSummary(optionId: string) {
  return summaryByOptionId.value.get(optionId) ?? null;
}

function getOptionRank(optionId: string) {
  return optionRanks.value.get(optionId) ?? null;
}

function updateQuestion(value: string | number | undefined) {
  mutateTypedBlock(props.tabId, props.block.id, "decision-matrix", (entry) => {
    entry.question = String(value ?? "").slice(0, 240);
  });
}

function updateOptionLabel(optionId: string, value: string | number | undefined) {
  mutateTypedBlock(props.tabId, props.block.id, "decision-matrix", (entry) => {
    const target = entry.options.find((candidate) => candidate.id === optionId);

    if (!target) {
      return;
    }

    target.label = String(value ?? "").slice(0, 80);
  });
}

function updateCriterionLabel(criterionId: string, value: string | number | undefined) {
  mutateTypedBlock(props.tabId, props.block.id, "decision-matrix", (entry) => {
    const target = entry.criteria.find((candidate) => candidate.id === criterionId);

    if (!target) {
      return;
    }

    target.label = String(value ?? "").slice(0, 120);
  });
}

function updateCriterionWeight(criterionId: string, value: string | number | undefined) {
  mutateTypedBlock(props.tabId, props.block.id, "decision-matrix", (entry) => {
    const target = entry.criteria.find((candidate) => candidate.id === criterionId);

    if (!target) {
      return;
    }

    target.weight = clampWeight(value);
  });
}

function updateOptionScore(
  optionId: string,
  criterionId: string,
  value: string | number | undefined,
) {
  mutateTypedBlock(props.tabId, props.block.id, "decision-matrix", (entry) => {
    const target = entry.options.find((candidate) => candidate.id === optionId);

    if (!target) {
      return;
    }

    target.scores[criterionId] = clampScore(value);
  });
}

function addCriterion() {
  mutateTypedBlock(props.tabId, props.block.id, "decision-matrix", (entry) => {
    const criterion = createWorkspaceDecisionMatrixCriterion();
    entry.criteria.push(criterion);

    for (const option of entry.options) {
      option.scores[criterion.id] = 5;
    }
  });
}

function removeCriterion(criterionId: string) {
  mutateTypedBlock(props.tabId, props.block.id, "decision-matrix", (entry) => {
    if (entry.criteria.length <= 1) {
      return;
    }

    entry.criteria = entry.criteria.filter((criterion) => criterion.id !== criterionId);

    for (const option of entry.options) {
      delete option.scores[criterionId];
    }
  });
}

function addOption() {
  mutateTypedBlock(props.tabId, props.block.id, "decision-matrix", (entry) => {
    entry.options.push(
      createWorkspaceDecisionMatrixOption({
        label: getNextOptionLabel(entry.options.length),
        scores: Object.fromEntries(entry.criteria.map((criterion) => [criterion.id, 5])),
      }),
    );
  });
}

function removeOption(optionId: string) {
  mutateTypedBlock(props.tabId, props.block.id, "decision-matrix", (entry) => {
    if (entry.options.length <= 1) {
      return;
    }

    entry.options = entry.options.filter((option) => option.id !== optionId);
  });
}
</script>

<template>
  <div class="space-y-6">
    <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
            Decision prompt
          </p>
          <p class="text-sm text-muted">
            Compare options with weighted criteria, then score each path from 0 to 10.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UBadge variant="subtle" class="rounded-2xl">
            {{ summary.criteriaCount }} criteria
          </UBadge>
          <UBadge color="neutral" variant="soft" class="rounded-2xl">
            {{ block.options.length }} options
          </UBadge>
          <UBadge color="primary" variant="soft" class="rounded-2xl">
            {{ summary.totalWeight }} weight pts
          </UBadge>
        </div>
      </div>

      <UInput
        :model-value="block.question"
        variant="none"
        placeholder="What decision are you making?"
        class="mt-4 w-full"
        aria-label="Decision question"
        :ui="{
          base: 'px-0 text-xl font-bold tracking-tight text-highlighted placeholder:text-muted/40',
        }"
        @update:model-value="updateQuestion($event)"
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
            <div class="flex flex-wrap items-center gap-2">
              <UBadge color="neutral" variant="soft" class="rounded-2xl">
                Rank #{{ getOptionRank(option.id) ?? "—" }}
              </UBadge>
              <UBadge
                v-if="getOptionSummary(option.id)?.isWinner"
                color="primary"
                variant="soft"
                size="sm"
                class="rounded-full px-3 uppercase tracking-[0.18em]"
              >
                {{ summary.hasTie ? "Tied lead" : "Recommended" }}
              </UBadge>
            </div>

            <UInput
              :model-value="option.label"
              variant="none"
              placeholder="Option name"
              class="mt-3 w-full"
              :aria-label="`Option label for ${option.label || 'decision option'}`"
              :ui="{
                base: 'px-0 text-lg font-bold text-highlighted placeholder:text-muted/60',
              }"
              @update:model-value="updateOptionLabel(option.id, $event)"
            />

            <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-primary">
              {{ getOptionSummary(option.id)?.totalScore ?? 0 }}
            </p>
          </div>

          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            size="xs"
            class="rounded-2xl hover:text-error"
            :disabled="block.options.length <= 1"
            :aria-label="`Remove ${option.label || 'decision'} option`"
            @click="removeOption(option.id)"
          />
        </div>

        <div class="mt-4 space-y-2">
          <div
            class="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
          >
            <span>Relative score</span>
            <span>{{ getOptionSummary(option.id)?.progress ?? 0 }}%</span>
          </div>
          <UProgress
            :model-value="getOptionSummary(option.id)?.progress ?? 0"
            size="sm"
            class="rounded-full"
          />
          <div class="flex flex-wrap items-center gap-2 pt-1">
            <UBadge color="neutral" variant="soft" class="rounded-2xl">
              Avg
              {{ getOptionSummary(option.id)?.averageScore ?? 0 }}
            </UBadge>
            <UBadge color="primary" variant="soft" class="rounded-2xl">
              {{ getOptionSummary(option.id)?.totalScore ?? 0 }}
              weighted pts
            </UBadge>
          </div>
        </div>
      </article>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <div>
        <p class="text-sm font-semibold text-highlighted">Weighted scoring matrix</p>
        <p class="text-sm text-muted">
          Increase criterion weight when it matters more, then score each option against that
          criterion.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          class="rounded-full px-4"
          aria-label="Add decision criterion"
          @click="addCriterion"
        >
          Add Criterion
        </UButton>
        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-columns-2"
          class="rounded-full px-4"
          aria-label="Add decision option"
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
        role="table"
        aria-label="Decision matrix scoring grid"
      >
        <div class="bg-elevated/10 p-4 flex flex-col justify-center" role="columnheader">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Criteria</p>
          <p class="mt-1 text-xs font-medium text-toned/70">
            {{ summary.criteriaCount }} criteria,
            {{ summary.totalWeight }}
            weight pts
          </p>
        </div>

        <div
          v-for="option in block.options"
          :key="`${option.id}-header`"
          class="bg-elevated/10 p-4 flex flex-col justify-center"
          role="columnheader"
        >
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 truncate">
            {{ option.label || "Option" }}
          </p>
          <p class="mt-1 text-lg font-black text-highlighted">
            {{ getOptionSummary(option.id)?.totalScore ?? 0 }}
          </p>
          <p class="text-[10px] font-bold uppercase tracking-widest text-muted/40">
            Rank #{{ getOptionRank(option.id) ?? "—" }}
          </p>
        </div>

        <template v-for="criterion in block.criteria" :key="criterion.id">
          <div class="space-y-3 bg-default/40 p-4 flex flex-col justify-center" role="rowheader">
            <div class="flex items-start justify-between gap-3">
              <UInput
                :model-value="criterion.label"
                variant="none"
                placeholder="Criterion name"
                class="flex-1"
                :aria-label="`Criterion label for ${criterion.label || 'decision criterion'}`"
                :ui="{
                  base: 'px-0 text-sm font-semibold text-highlighted placeholder:text-muted/40',
                }"
                @update:model-value="updateCriterionLabel(criterion.id, $event)"
              />

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                size="xs"
                class="rounded-lg hover:text-error"
                :disabled="block.criteria.length <= 1"
                :aria-label="`Remove ${criterion.label || 'decision'} criterion`"
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
                :aria-label="`Weight for ${criterion.label || 'criterion'}`"
                @input="
                  updateCriterionWeight(
                    criterion.id,
                    ($event.target as HTMLInputElement | null)?.value,
                  )
                "
              />
            </div>
          </div>

          <div
            v-for="option in block.options"
            :key="`${criterion.id}-${option.id}`"
            class="bg-default/40 p-4 flex flex-col justify-center"
            role="cell"
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
              :aria-label="`Score for ${option.label || 'option'} on ${criterion.label || 'criterion'}`"
              @input="
                updateOptionScore(
                  option.id,
                  criterion.id,
                  ($event.target as HTMLInputElement | null)?.value,
                )
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
