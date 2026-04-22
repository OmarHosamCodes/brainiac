<script setup lang="ts">
import {
  createWorkspaceProsConsItem,
  getProsConsSummary,
  type WorkspaceProsConsBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceProsConsBlock;
  tabId: string;
}>();

const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getProsConsSummary(props.block));
const totalWeight = computed(() =>
  Math.max(summary.value.prosWeight + summary.value.consWeight, 1),
);
const verdictLabel = computed(() => {
  if (summary.value.verdict === "do-it") {
    return "DO IT";
  }

  if (summary.value.verdict === "dont") {
    return "DON'T";
  }

  return "TIE";
});
const verdictClass = computed(() => {
  if (summary.value.verdict === "do-it") {
    return "border-success/30 bg-success/10 text-success";
  }

  if (summary.value.verdict === "dont") {
    return "border-error/30 bg-error/10 text-error";
  }

  return "border-warning/30 bg-warning/10 text-warning";
});

function addItem(list: "pros" | "cons") {
  mutateTypedBlock(props.tabId, props.block.id, "pros-cons", (entry) => {
    entry[list].push(createWorkspaceProsConsItem({ text: "" }));
  });
}

function updateItemText(list: "pros" | "cons", itemId: string, value: string | number | undefined) {
  mutateTypedBlock(props.tabId, props.block.id, "pros-cons", (entry) => {
    const target = entry[list].find((candidate) => candidate.id === itemId);

    if (!target) {
      return;
    }

    target.text = String(value ?? "").slice(0, 240);
  });
}

function updateItemWeight(list: "pros" | "cons", itemId: string, weight: number) {
  mutateTypedBlock(props.tabId, props.block.id, "pros-cons", (entry) => {
    const target = entry[list].find((candidate) => candidate.id === itemId);

    if (!target) {
      return;
    }

    target.weight = Math.min(5, Math.max(1, Math.round(weight)));
  });
}

function removeItem(list: "pros" | "cons", itemId: string) {
  mutateTypedBlock(props.tabId, props.block.id, "pros-cons", (entry) => {
    entry[list] = entry[list].filter((candidate) => candidate.id !== itemId);
  });
}

function getWeightButtonClass(list: "pros" | "cons", currentWeight: number, value: number) {
  const isActive = value <= currentWeight;

  if (list === "pros") {
    return isActive
      ? "border-success/30 bg-success text-white"
      : "border-muted/20 bg-default/60 text-muted/70 hover:border-success/30 hover:text-success";
  }

  return isActive
    ? "border-error/30 bg-error text-white"
    : "border-muted/20 bg-default/60 text-muted/70 hover:border-error/30 hover:text-error";
}
</script>

<template>
  <div class="space-y-8">
    <div
      class="rounded-3xl border border-muted/20 p-6 transition-colors space-y-5"
      :class="verdictClass"
    >
      <div class="flex flex-wrap items-center gap-2">
        <UBadge variant="subtle" class="rounded-2xl"> {{ block.pros.length }} pros </UBadge>
        <UBadge color="neutral" variant="soft" class="rounded-2xl">
          {{ block.cons.length }} cons
        </UBadge>
        <UBadge color="success" variant="soft" class="rounded-2xl">
          {{ summary.prosWeight }} pro weight
        </UBadge>
        <UBadge color="error" variant="soft" class="rounded-2xl">
          {{ summary.consWeight }} con weight
        </UBadge>
      </div>

      <div class="mb-4 flex items-center justify-between gap-4">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Verdict</p>
          <p class="mt-1 text-2xl sm:text-3xl font-black tracking-tight">
            {{ verdictLabel }}
          </p>
        </div>
        <div class="flex-1 px-4 sm:px-8">
          <div class="relative h-2 overflow-hidden rounded-full bg-muted/20">
            <div
              class="absolute inset-y-0 left-0 bg-success transition-all duration-500"
              :style="{
                width: `${(summary.prosWeight / totalWeight) * 100}%`,
              }"
            />
            <div
              class="absolute inset-y-0 right-0 bg-error transition-all duration-500"
              :style="{
                width: `${(summary.consWeight / totalWeight) * 100}%`,
              }"
            />
          </div>
          <div class="mt-4 text-center">
            <p class="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">
              Score Delta
            </p>
            <p class="text-lg font-black tracking-tight">
              {{ summary.totalScore > 0 ? "+" : "" }}{{ summary.totalScore }}
            </p>
          </div>
        </div>
        <div class="text-right">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Current Signal</p>
          <p class="mt-1 text-2xl sm:text-3xl font-black tracking-tight">
            {{ summary.verdict === "tie" ? "Balanced" : verdictLabel }}
          </p>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Pro score</p>
          <p class="mt-1 text-xl sm:text-2xl font-black tracking-tight">
            {{ summary.prosWeight }}
          </p>
        </div>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Con score</p>
          <p class="mt-1 text-xl sm:text-2xl font-black tracking-tight">
            {{ summary.consWeight }}
          </p>
        </div>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <section class="space-y-4">
        <div class="flex items-center justify-between px-2">
          <div class="flex items-center gap-2 text-success">
            <UIcon name="i-lucide-plus-circle" class="size-5" />
            <h3 class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Pros</h3>
          </div>
          <UButton
            color="success"
            variant="soft"
            icon="i-lucide-plus"
            size="xs"
            class="rounded-full px-4"
            @click="addItem('pros')"
          >
            Add Point
          </UButton>
        </div>

        <div
          v-for="item in block.pros"
          :key="item.id"
          class="group space-y-3 rounded-2xl border border-muted/20 bg-default/40 p-3 transition-all hover:bg-default/60"
        >
          <div class="flex items-start gap-3">
            <UInput
              :model-value="item.text"
              variant="none"
              placeholder="Add a reason in favor..."
              class="flex-1"
              :ui="{
                base: 'px-0 text-sm text-highlighted font-semibold',
              }"
              @update:model-value="updateItemText('pros', item.id, $event)"
            />

            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              size="xs"
              class="rounded-lg hover:text-error"
              aria-label="Remove pro point"
              @click="removeItem('pros', item.id)"
            />
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-success/70">Weight</p>

            <div class="flex flex-wrap items-center gap-2">
              <button
                v-for="weight in 5"
                :key="weight"
                type="button"
                class="min-w-8 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors"
                :class="getWeightButtonClass('pros', item.weight, weight)"
                :aria-label="`Set pro weight to ${weight}`"
                @click="updateItemWeight('pros', item.id, weight)"
              >
                {{ weight }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="space-y-4">
        <div class="flex items-center justify-between px-2">
          <div class="flex items-center gap-2 text-error">
            <UIcon name="i-lucide-minus-circle" class="size-5" />
            <h3 class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Cons</h3>
          </div>
          <UButton
            color="error"
            variant="soft"
            icon="i-lucide-plus"
            size="xs"
            class="rounded-full px-4"
            @click="addItem('cons')"
          >
            Add Point
          </UButton>
        </div>

        <div
          v-for="item in block.cons"
          :key="item.id"
          class="group space-y-3 rounded-2xl border border-muted/20 bg-default/40 p-3 transition-all hover:bg-default/60"
        >
          <div class="flex items-start gap-3">
            <UInput
              :model-value="item.text"
              variant="none"
              placeholder="Add a risk or downside..."
              class="flex-1"
              :ui="{
                base: 'px-0 text-sm text-highlighted font-semibold',
              }"
              @update:model-value="updateItemText('cons', item.id, $event)"
            />

            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              size="xs"
              class="rounded-lg hover:text-error"
              aria-label="Remove con point"
              @click="removeItem('cons', item.id)"
            />
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-error/70">Weight</p>

            <div class="flex flex-wrap items-center gap-2">
              <button
                v-for="weight in 5"
                :key="weight"
                type="button"
                class="min-w-8 rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors"
                :class="getWeightButtonClass('cons', item.weight, weight)"
                :aria-label="`Set con weight to ${weight}`"
                @click="updateItemWeight('cons', item.id, weight)"
              >
                {{ weight }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
