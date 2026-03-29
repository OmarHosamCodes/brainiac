<script setup lang="ts">
import {
  createWorkspaceChecklistItem,
  getChecklistProgress,
  type WorkspaceChecklistBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceChecklistBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const progress = computed(() => getChecklistProgress(props.block));

function addItem() {
  mutateBlock(props.tabId, props.block.id, (entry) => {
    if (entry.type !== "checklist") {
      return;
    }

    entry.items.push(createWorkspaceChecklistItem({ text: "" }));
  });
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center gap-6 rounded-3xl bg-elevated/10 border border-muted/20 p-5">
      <div
        class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20"
      >
        <span class="text-lg font-black tracking-tight">{{ progress.percent }}%</span>
      </div>

      <div class="flex-1 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Completion</p>
          <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/40">
            {{ progress.completed }}/{{ progress.total }}
          </p>
        </div>
        <UProgress
          :model-value="progress.completed"
          :max="Math.max(progress.total, 1)"
          size="sm"
          class="rounded-full"
          color="primary"
        />
      </div>

      <UButton
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        class="rounded-full px-4"
        @click="addItem"
      >
        Add Item
      </UButton>
    </div>

    <div class="space-y-2">
      <div
        v-for="item in block.items"
        :key="item.id"
        class="group flex items-center gap-3 rounded-2xl border border-muted/20 bg-default/40 p-3 transition-all hover:border-primary/20 hover:bg-default/60"
      >
        <UCheckbox
          :model-value="item.completed"
          size="sm"
          class="shrink-0"
          @update:model-value="
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== 'checklist') {
                return;
              }

              const target = entry.items.find((candidate) => candidate.id === item.id);

              if (target) {
                target.completed = Boolean($event);
              }
            })
          "
        />

        <UInput
          :model-value="item.text"
          variant="none"
          placeholder="Checklist item"
          class="flex-1"
          :ui="{
            base: [
              'px-0 font-medium placeholder:text-muted/50 transition-all',
              item.completed ? 'text-muted/60 line-through' : 'text-highlighted',
            ].join(' '),
          }"
          @update:model-value="
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== 'checklist') {
                return;
              }

              const target = entry.items.find((candidate) => candidate.id === item.id);

              if (target) {
                target.text = ($event ?? '').slice(0, 240);
              }
            })
          "
        />

        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-trash-2"
          class="rounded-lg opacity-0 group-hover:opacity-100 hover:text-error transition-opacity"
          @click="
            mutateBlock(tabId, block.id, (entry) => {
              if (entry.type !== 'checklist') {
                return;
              }

              entry.items = entry.items.filter((candidate) => candidate.id !== item.id);
            })
          "
        />
      </div>

      <div
        v-if="block.items.length === 0"
        class="border-dashed border border-muted/20 rounded-3xl py-12 text-center bg-elevated/5"
      >
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/40">No checklist items</p>
      </div>
    </div>
  </div>
</template>
