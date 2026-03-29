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

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getProsConsSummary(props.block));
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
  mutateBlock(props.tabId, props.block.id, (entry) => {
    if (entry.type !== "pros-cons") {
      return;
    }

    entry[list].push(createWorkspaceProsConsItem({ text: "" }));
  });
}
</script>

<template>
  <div class="space-y-8">
    <div class="rounded-3xl border border-muted/20 p-6 transition-colors" :class="verdictClass">
      <div class="mb-4 flex items-center justify-between gap-4">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Verdict</p>
          <p class="mt-1 text-2xl sm:text-3xl font-black tracking-tight">{{ verdictLabel }}</p>
        </div>
        <div class="text-right">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Score Delta</p>
          <p class="mt-1 text-2xl sm:text-3xl font-black tracking-tight">
            {{ summary.totalScore > 0 ? "+" : "" }}{{ summary.totalScore }}
          </p>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Pro score</p>
          <p class="mt-1 text-xl sm:text-2xl font-black tracking-tight">{{ summary.prosWeight }}</p>
        </div>
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Con score</p>
          <p class="mt-1 text-xl sm:text-2xl font-black tracking-tight">{{ summary.consWeight }}</p>
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
          class="group flex items-center gap-3 rounded-2xl border border-muted/20 bg-default/40 p-3 transition-all hover:bg-default/60"
        >
          <UInput
            :model-value="item.text"
            variant="none"
            placeholder="Add a reason in favor..."
            class="flex-1"
            :ui="{ base: 'px-0 text-sm text-highlighted font-semibold' }"
            @update:model-value="
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== 'pros-cons') {
                  return;
                }

                const target = entry.pros.find((candidate) => candidate.id === item.id);

                if (target) {
                  target.text = ($event ?? '').slice(0, 240);
                }
              })
            "
          />

          <div class="flex items-center gap-1">
            <button
              v-for="weight in 5"
              :key="weight"
              type="button"
              class="h-5 w-3 rounded-full transition-colors"
              :class="weight <= item.weight ? 'bg-success' : 'bg-muted/25'"
              @click="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'pros-cons') {
                    return;
                  }

                  const target = entry.pros.find((candidate) => candidate.id === item.id);

                  if (target) {
                    target.weight = weight;
                  }
                })
              "
            />
          </div>

          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            size="xs"
            class="rounded-lg opacity-0 group-hover:opacity-100 hover:text-error"
            @click="
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== 'pros-cons') {
                  return;
                }

                entry.pros = entry.pros.filter((candidate) => candidate.id !== item.id);
              })
            "
          />
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
          class="group flex items-center gap-3 rounded-2xl border border-muted/20 bg-default/40 p-3 transition-all hover:bg-default/60"
        >
          <UInput
            :model-value="item.text"
            variant="none"
            placeholder="Add a risk or downside..."
            class="flex-1"
            :ui="{ base: 'px-0 text-sm text-highlighted font-semibold' }"
            @update:model-value="
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== 'pros-cons') {
                  return;
                }

                const target = entry.cons.find((candidate) => candidate.id === item.id);

                if (target) {
                  target.text = ($event ?? '').slice(0, 240);
                }
              })
            "
          />

          <div class="flex items-center gap-1">
            <button
              v-for="weight in 5"
              :key="weight"
              type="button"
              class="h-5 w-3 rounded-full transition-colors"
              :class="weight <= item.weight ? 'bg-error' : 'bg-muted/25'"
              @click="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'pros-cons') {
                    return;
                  }

                  const target = entry.cons.find((candidate) => candidate.id === item.id);

                  if (target) {
                    target.weight = weight;
                  }
                })
              "
            />
          </div>

          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            size="xs"
            class="rounded-lg opacity-0 group-hover:opacity-100 hover:text-error"
            @click="
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== 'pros-cons') {
                  return;
                }

                entry.cons = entry.cons.filter((candidate) => candidate.id !== item.id);
              })
            "
          />
        </div>
      </section>
    </div>
  </div>
</template>
