<script setup lang="ts">
import type { SelectMenuItem } from "@nuxt/ui";

type Draft = {
  projectId: string;
  date: string;
  startTime: string;
  endTime: string;
  durationInput: string;
  description: string;
  linkUrl: string;
  tagIds: string[];
};

type Tag = {
  id: string;
  name: string;
};

defineProps<{
  draft: Draft;
  projectItems: SelectMenuItem[];
  tags: Tag[];
  error: string | null;
  saving: boolean;
}>();

const emit = defineEmits<{
  save: [];
  cancel: [];
  toggleTag: [tagId: string];
  updateDuration: [value: string | number | undefined];
  updateEndTime: [value: string | number | undefined];
}>();
</script>

<template>
  <form class="space-y-2" @submit.prevent="emit('save')">
    <!-- Primary row: mirrors the tracker bar layout -->
    <div class="flex flex-wrap items-center gap-2">
      <UInput
        v-model="draft.description"
        placeholder="What did you work on?"
        size="sm"
        class="min-w-0 flex-1"
      />

      <USelectMenu
        v-model="draft.projectId"
        :items="projectItems"
        value-key="value"
        placeholder="Project"
        size="sm"
        class="w-40 shrink-0"
        :content="{ align: 'start' }"
        :ui="{
          content: 'max-h-72 overflow-hidden',
          viewport: 'max-h-72 overflow-y-auto',
        }"
      />

      <UInput
        v-model="draft.date"
        type="date"
        size="sm"
        class="w-32 shrink-0"
      />

      <div class="flex shrink-0 items-center gap-1">
        <UInput
          v-model="draft.startTime"
          type="time"
          size="sm"
          class="w-24 font-mono"
          @update:model-value="emit('updateDuration', draft.durationInput)"
        />
        <span class="text-xs text-muted">to</span>
        <UInput
          :model-value="draft.endTime"
          type="time"
          size="sm"
          class="w-24 font-mono"
          @update:model-value="emit('updateEndTime', $event as string | number | undefined)"
        />
      </div>

      <UInput
        :model-value="draft.durationInput"
        size="sm"
        class="w-20 shrink-0 font-mono"
        placeholder="1:00"
        @update:model-value="emit('updateDuration', $event as string | number | undefined)"
      />

      <!-- Tags popover -->
      <UPopover v-if="tags.length > 0" :content="{ align: 'end' }">
        <UButton
          icon="i-lucide-tag"
          size="xs"
          variant="ghost"
          :color="draft.tagIds.length > 0 ? 'primary' : 'neutral'"
          :aria-label="`Tags${draft.tagIds.length > 0 ? ` (${draft.tagIds.length} selected)` : ''}`"
        />
        <template #content>
          <div class="w-56 space-y-2 p-2">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Tags</p>
            <div class="flex flex-wrap gap-1">
              <button
                v-for="tag in tags"
                :key="tag.id"
                type="button"
                class="rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                :class="
                  draft.tagIds.includes(tag.id)
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-default bg-transparent text-muted hover:border-muted/60 hover:text-highlighted'
                "
                @click="emit('toggleTag', tag.id)"
              >
                {{ tag.name }}
              </button>
            </div>
          </div>
        </template>
      </UPopover>

      <!-- Link popover -->
      <UPopover :content="{ align: 'end' }">
        <UButton
          icon="i-lucide-link"
          size="xs"
          variant="ghost"
          :color="draft.linkUrl ? 'primary' : 'neutral'"
          aria-label="Link URL"
        />
        <template #content>
          <div class="w-72 space-y-2 p-2">
            <UInput
              v-model="draft.linkUrl"
              icon="i-lucide-link"
              placeholder="Task, ticket, or brief URL"
              size="xs"
            />
            <div class="flex justify-end">
              <UButton
                label="Clear"
                color="neutral"
                variant="ghost"
                size="xs"
                :disabled="!draft.linkUrl"
                @click="draft.linkUrl = ''"
              />
            </div>
          </div>
        </template>
      </UPopover>

      <UButton
        type="submit"
        label="Save"
        color="primary"
        size="sm"
        class="shrink-0 font-bold"
        :loading="saving"
      />

      <UButton
        type="button"
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="sm"
        square
        aria-label="Cancel"
        @click="emit('cancel')"
      />
    </div>

    <!-- Tag pills (selected, shown inline below bar) -->
    <div v-if="draft.tagIds.length > 0" class="flex flex-wrap items-center gap-1.5 pl-0.5">
      <span
        v-for="tag in tags.filter(t => draft.tagIds.includes(t.id))"
        :key="tag.id"
        class="rounded-full border border-primary/20 bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary"
      >{{ tag.name }}</span>
    </div>

    <p v-if="error" class="text-xs text-error">{{ error }}</p>
  </form>
</template>
