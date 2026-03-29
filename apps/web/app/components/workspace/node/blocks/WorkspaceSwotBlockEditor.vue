<script setup lang="ts">
import { getSwotSummary, type WorkspaceSwotBlock } from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceSwotBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getSwotSummary(props.block));

const quadrants = [
  {
    key: "strengths",
    label: "Strengths",
    className: "border-emerald-300/40 bg-emerald-500/5 text-emerald-700",
  },
  {
    key: "weaknesses",
    label: "Weaknesses",
    className: "border-rose-300/40 bg-rose-500/5 text-rose-700",
  },
  {
    key: "opportunities",
    label: "Opportunities",
    className: "border-indigo-300/40 bg-indigo-500/5 text-indigo-700",
  },
  {
    key: "threats",
    label: "Threats",
    className: "border-amber-300/40 bg-amber-500/5 text-amber-700",
  },
] as const;
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="rounded-[28px] bg-elevated/20 p-5">
        <p class="text-[10px] font-bold uppercase tracking-widest text-muted/60">Filled</p>
        <p class="mt-2 text-3xl font-black text-highlighted">{{ summary.filledCellCount }}/4</p>
      </div>
      <div class="rounded-[28px] bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-widest text-primary/60">Coverage</p>
        <p class="mt-2 text-3xl font-black text-primary">{{ 100 - summary.emptyCellCount * 25 }}%</p>
      </div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <article
        v-for="quadrant in quadrants"
        :key="quadrant.key"
        class="rounded-[30px] border p-5"
        :class="quadrant.className"
      >
        <div class="mb-3 flex items-center justify-between gap-3">
          <h3 class="text-sm font-black uppercase tracking-widest">{{ quadrant.label }}</h3>
          <span class="text-[10px] font-bold uppercase tracking-widest opacity-60">
            {{ (block.cells[quadrant.key] || '').trim() ? 'Filled' : 'Empty' }}
          </span>
        </div>

        <UTextarea
          :model-value="block.cells[quadrant.key]"
          autoresize
          :max-rows="10"
          variant="none"
          class="w-full"
          :ui="{ base: 'min-h-[140px] p-0 text-sm leading-relaxed text-toned placeholder:text-muted/40' }"
          :placeholder="`Capture ${quadrant.label.toLowerCase()} here...`"
          @update:model-value="
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== 'swot') {
                return;
              }

              entry.cells[quadrant.key] = ($event ?? '').slice(0, 4000);
            })
          "
        />
      </article>
    </div>
  </div>
</template>
