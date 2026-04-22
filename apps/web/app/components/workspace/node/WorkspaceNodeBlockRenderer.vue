<script setup lang="ts">
import type { WorkspaceBlock } from "@brainiac/workspace";
import type { Component } from "vue";

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
  toggleAgentContextBlock,
  isAgentContextBlock,
  saveBlockToMarketplace,
  removeBlock,
  getBlockOperationState,
} = useWorkspaceNodeEditorContext();

const registryEntry = computed(() => getWorkspaceBlockRegistryEntry(props.block.type));
const editorComponent = computed<Component>(() => registryEntry.value.component as Component);
const isContextBlock = computed(() => isAgentContextBlock(props.tabId, props.block.id));
const operationState = computed(() => getBlockOperationState(props.tabId, props.block.id));
</script>

<template>
  <div
    class="group relative flex flex-col gap-5 rounded-[32px] border border-muted/40 bg-default/50 p-6 transition-all duration-300 hover:border-primary/30 hover:bg-default/80 hover:shadow-xl hover:shadow-black/5 focus-within:border-primary/30 focus-within:bg-default/80 focus-within:shadow-xl focus-within:shadow-black/5"
  >
    <!-- Block Header -->
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <div
          class="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-muted/60 bg-elevated/50 text-toned transition-colors group-hover:border-primary/40 group-hover:text-primary"
        >
          <UIcon :name="registryEntry.icon" class="size-5" />
        </div>

        <div class="min-w-0 flex-1">
          <UInput
            :model-value="block.title"
            variant="none"
            placeholder="Untitled block"
            class="w-full"
            :ui="{
              base: 'px-0 text-xl font-bold tracking-tight text-highlighted placeholder:text-muted transition-colors focus:text-primary',
            }"
            @update:model-value="updateBlockTitle(tabId, block.id, $event ?? '')"
          />
          <p class="text-[11px] font-semibold uppercase tracking-widest text-muted/80">
            {{ registryEntry.label }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-2">
        <UBadge v-if="operationState.pending" color="primary" variant="soft" class="rounded-full">
          <span class="inline-flex items-center gap-1.5">
            <UIcon name="i-lucide-loader-2" class="size-3.5 animate-spin" />
            {{ operationState.label || "Working" }}
          </span>
        </UBadge>

        <UButton
          color="primary"
          :variant="isContextBlock ? 'soft' : 'ghost'"
          :icon="isContextBlock ? 'i-lucide-check' : 'i-lucide-plus'"
          class="rounded-xl"
          :aria-label="isContextBlock ? 'Remove block from AI context' : 'Add block to AI context'"
          @click="toggleAgentContextBlock(tabId, block.id)"
        >
          {{ isContextBlock ? "In AI context" : "Add to AI context" }}
        </UButton>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-store"
          class="rounded-xl"
          aria-label="Save block to marketplace"
          @click="saveBlockToMarketplace(block)"
        />
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-trash-2"
          class="rounded-xl hover:bg-error/10 hover:text-error"
          aria-label="Delete block"
          @click="removeBlock(tabId, block.id)"
        />
      </div>
    </div>

    <!-- Search Matches -->
    <div
      v-if="normalizedBlockSearch && getBlockSearchMatches(block).length > 0"
      class="space-y-2 rounded-2xl border border-warning/40 bg-warning/5 p-4"
    >
      <div class="flex items-center gap-2 text-warning">
        <UIcon name="i-lucide-search" class="size-4" />
        <p class="text-xs font-bold uppercase tracking-wider">Search matches</p>
      </div>
      <div class="space-y-1.5">
        <p
          v-for="(match, index) in getBlockSearchMatches(block)"
          :key="`${block.id}-match-${index}`"
          class="text-sm leading-relaxed text-toned"
          v-html="highlightSearchMatch(match)"
        />
      </div>
    </div>

    <!-- Block Content -->
    <div class="relative min-h-[50px]">
      <component :is="editorComponent" :block="block" :tab-id="tabId" />
    </div>
  </div>
</template>
