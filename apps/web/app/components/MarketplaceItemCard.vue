<script setup lang="ts">
import type { WorkspaceMarketplaceItem } from "@brainiac/workspace";
import {
  getMarketplacePayloadSummary,
  getMarketplacePayloadTypeLabel,
} from "~/utils/workspace-marketplace";

const props = defineProps<{
  item: WorkspaceMarketplaceItem;
  loading?: boolean;
}>();

defineEmits<{
  insert: [item: WorkspaceMarketplaceItem];
}>();

const kindIcon = computed(() => {
  switch (props.item.payload.kind) {
    case "node":
      return "i-lucide-box";
    case "tab":
      return "i-lucide-layout";
    case "block":
      return "i-lucide-component";
    default:
      return "i-lucide-help-circle";
  }
});

const kindColor = computed(() => {
  switch (props.item.payload.kind) {
    case "node":
      return "primary";
    case "tab":
      return "success";
    case "block":
      return "warning";
    default:
      return "neutral";
  }
});
</script>

<template>
  <UCard
    class="flex flex-col h-full transition-all hover:ring-2 hover:ring-primary/30 group"
    :ui="{
      body: 'flex-1 flex flex-col gap-4',
      footer: 'pt-0 border-none'
    }"
  >
    <template #header>
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <div
            class="p-2 rounded-xl bg-opacity-10 shrink-0"
            :class="[
              item.payload.kind === 'node' && 'bg-primary text-primary',
              item.payload.kind === 'tab' && 'bg-success text-success',
              item.payload.kind === 'block' && 'bg-warning text-warning'
            ]"
          >
            <UIcon :name="kindIcon" class="size-5" />
          </div>
          <div class="min-w-0">
            <h3 class="font-semibold text-highlighted truncate leading-tight">
              {{ item.title }}
            </h3>
            <p class="text-xs font-medium text-muted uppercase tracking-wider mt-0.5">
              {{ getMarketplacePayloadTypeLabel(item.payload) }}
            </p>
          </div>
        </div>
        <UBadge :color="kindColor" variant="subtle" size="sm" class="shrink-0">
          {{ getMarketplacePayloadSummary(item.payload) }}
        </UBadge>
      </div>
    </template>

    <div class="flex-1">
      <p class="text-sm text-muted line-clamp-3">
        {{ item.summary || getMarketplacePayloadSummary(item.payload) }}
      </p>
    </div>

    <div class="flex items-center justify-between gap-3 pt-2">
      <div class="flex items-center gap-2 min-w-0">
        <UAvatar
          :alt="item.createdByName"
          size="xs"
          class="shrink-0 ring-1 ring-muted/30"
        />
        <span class="text-xs text-muted truncate font-medium">
          {{ item.createdByName }}
        </span>
      </div>
      
      <time :datetime="item.createdAt" class="text-[10px] text-muted/60 whitespace-nowrap uppercase tracking-tighter">
        {{ formatDateTime(item.createdAt) }}
      </time>
    </div>

    <template #footer>
      <UButton
        label="Add to Dashboard"
        :icon="item.payload.kind === 'node' ? 'i-lucide-plus' : 'i-lucide-download'"
        block
        color="neutral"
        variant="subtle"
        :loading="loading"
        class="group-hover:bg-primary group-hover:text-white transition-colors"
        @click="$emit('insert', item)"
      />
    </template>
  </UCard>
</template>
