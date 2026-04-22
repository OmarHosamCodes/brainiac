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

const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

const progress = computed(() => getChecklistProgress(props.block));
const openItemCount = computed(() => Math.max(progress.value.total - progress.value.completed, 0));

function mutateChecklistItem(
  itemId: string,
  mutator: (item: WorkspaceChecklistBlock["items"][number]) => void,
) {
  mutateTypedBlock(props.tabId, props.block.id, "checklist", (entry) => {
    const target = entry.items.find((candidate) => candidate.id === itemId);

    if (!target) {
      return;
    }

    mutator(target);
  });
}

function addItem() {
  mutateTypedBlock(props.tabId, props.block.id, "checklist", (entry) => {
    entry.items.push(createWorkspaceChecklistItem({ text: "" }));
  });
}

function updateItemCompleted(itemId: string, value: boolean | string | undefined) {
  mutateChecklistItem(itemId, (item) => {
    item.completed = Boolean(value);
  });
}

function updateItemText(itemId: string, value: string | number | undefined) {
  mutateChecklistItem(itemId, (item) => {
    item.text = String(value ?? "").slice(0, 240);
  });
}

function removeItem(itemId: string) {
  mutateTypedBlock(props.tabId, props.block.id, "checklist", (entry) => {
    entry.items = entry.items.filter((candidate) => candidate.id !== itemId);
  });
}
</script>

<template>
  <div class="space-y-6">
    <div class="space-y-4 rounded-3xl border border-muted/20 bg-elevated/10 p-5">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-6">
          <div
            class="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary"
          >
            <span class="text-lg font-black tracking-tight">{{ progress.percent }}%</span>
          </div>

          <div class="flex-1 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
                Completion
              </p>
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
        </div>

        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-plus"
          class="rounded-full px-4"
          aria-label="Add checklist item"
          @click="addItem"
        >
          Add Item
        </UButton>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <UBadge variant="subtle" class="rounded-2xl"> {{ progress.completed }} completed </UBadge>
        <UBadge color="neutral" variant="soft" class="rounded-2xl">
          {{ openItemCount }} open
        </UBadge>
        <UBadge color="neutral" variant="soft" class="rounded-2xl">
          {{ progress.total }} total
        </UBadge>
      </div>
    </div>

    <div class="space-y-2">
      <div
        v-for="item in block.items"
        :key="item.id"
        class="flex items-center gap-3 rounded-2xl border border-muted/20 bg-default/40 p-3 transition-all hover:border-primary/20 hover:bg-default/60"
      >
        <UCheckbox
          :model-value="item.completed"
          size="sm"
          class="shrink-0"
          :aria-label="
            item.completed ? 'Mark checklist item as open' : 'Mark checklist item as complete'
          "
          @update:model-value="updateItemCompleted(item.id, $event)"
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
          @update:model-value="updateItemText(item.id, $event)"
        />

        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-trash-2"
          class="rounded-lg text-muted/70 transition-colors hover:text-error"
          aria-label="Delete checklist item"
          @click="removeItem(item.id)"
        />
      </div>

      <div
        v-if="block.items.length === 0"
        class="rounded-3xl border border-dashed border-muted/20 bg-elevated/5 py-12 text-center"
      >
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/40">
          No checklist items yet
        </p>
        <p class="mt-2 text-sm text-muted">Add the first item to start tracking completion.</p>
      </div>
    </div>
  </div>
</template>
