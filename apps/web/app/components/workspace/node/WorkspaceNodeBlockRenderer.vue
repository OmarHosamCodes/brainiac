<script setup lang="ts">
import type { WorkspaceBlock } from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { getWorkspaceBlockRegistryEntry } from "~/utils/workspace-block-registry";

const props = defineProps<{
  block: WorkspaceBlock;
  tabId: string;
}>();

const {
  normalizedBlockSearch,
  getBlockSearchMatches,
  highlightSearchMatch,
  updateBlockTitle,
  saveBlockToMarketplace,
  removeBlock,
} = useWorkspaceNodeEditorContext();

const registryEntry = computed(() => getWorkspaceBlockRegistryEntry(props.block.type));
const editorComponent = computed(() => registryEntry.value.component as any);
</script>

<template>
  <UCard
    :ui="{
      body: 'space-y-5',
      header: 'flex flex-wrap items-center justify-between gap-3',
    }"
    class="rounded-[24px] border border-muted/60"
  >
    <template #header>
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <UInput
          :model-value="block.title"
          size="lg"
          variant="none"
          placeholder="Untitled block"
          class="w-full"
          :ui="{
            base: 'px-0 text-lg font-semibold text-highlighted placeholder:text-muted',
          }"
          @update:model-value="updateBlockTitle(tabId, block.id, $event ?? '')"
        />

        <UBadge color="neutral" variant="soft">
          {{ registryEntry.label }}
        </UBadge>
      </div>

      <div class="flex items-center gap-1">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-store"
          @click="saveBlockToMarketplace(block)"
        />
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-trash-2"
          @click="removeBlock(tabId, block.id)"
        />
      </div>
    </template>

    <div
      v-if="normalizedBlockSearch && getBlockSearchMatches(block).length > 0"
      class="space-y-2 rounded-2xl border border-warning/40 bg-warning/10 p-3"
    >
      <p class="text-xs font-medium uppercase tracking-[0.15em] text-warning">Search matches</p>
      <p
        v-for="(match, index) in getBlockSearchMatches(block)"
        :key="`${block.id}-match-${index}`"
        class="text-sm text-toned"
        v-html="highlightSearchMatch(match)"
      />
    </div>

    <component :is="editorComponent" :block="block" :tab-id="tabId" />
  </UCard>
</template>
