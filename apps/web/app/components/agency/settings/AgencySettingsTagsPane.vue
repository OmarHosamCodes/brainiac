<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

import { useAgencyOpsStore } from "~/stores/agency-ops";
import { agencySectionTitleClass } from "~/utils/agency-ui";

const props = defineProps<{
  teamId: string;
  active: boolean;
}>();

const orpc = useOrpc();
const agencyOps = useAgencyOpsStore();

const teamId = computed(() => props.teamId);

const tagsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.tags.list.queryOptions({ input: { teamId: teamId.value } }),
    enabled: Boolean(teamId.value) && props.active,
  })),
);

const tags = computed(() => tagsQuery.data.value?.items ?? []);
const newTagName = ref("");

const tagsQueryKey = computed(
  () => orpc.agencyOps.tags.list.queryOptions({ input: { teamId: teamId.value } }).queryKey,
);

watch(
  tagsQueryKey,
  (next, prev) => {
    if (prev) agencyOps.unregisterTagsQuery(prev);
    if (teamId.value) agencyOps.registerTagsQuery({ queryKey: next, teamId: teamId.value });
  },
  { immediate: true },
);

onUnmounted(() => {
  agencyOps.unregisterTagsQuery(tagsQueryKey.value);
});

async function createTag() {
  const name = newTagName.value.trim();
  if (!name || !teamId.value) return;
  newTagName.value = "";
  await agencyOps.createTag({ teamId: teamId.value, name });
}

async function deleteTag(tagId: string, tagName: string) {
  if (!teamId.value) return;
  await agencyOps.deleteTag({ teamId: teamId.value, tagId, tagName });
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 :class="agencySectionTitleClass">Label time entries across projects</h2>
    </div>

    <form class="flex items-center gap-2" @submit.prevent="createTag">
      <UInput
        v-model="newTagName"
        placeholder="New tag (e.g. design, qa, meetings)"
        size="sm"
        class="max-w-md flex-1"
      />
      <UButton
        type="submit"
        label="Add tag"
        color="primary"
        size="xs"
        :loading="agencyOps.isTagMutationPending"
        :disabled="!newTagName.trim()"
      />
    </form>

    <div v-if="tagsQuery.isPending.value" class="space-y-2">
      <div v-for="i in 3" :key="i" class="h-8 w-24 animate-pulse rounded-full bg-elevated/60" />
    </div>

    <ul v-else-if="tags.length > 0" class="flex flex-wrap gap-2">
      <li
        v-for="tag in tags"
        :key="tag.id"
        class="inline-flex items-center gap-1.5 rounded-full border border-default bg-muted px-3 py-1 text-xs font-bold text-highlighted"
      >
        <span>{{ tag.name }}</span>
        <button
          type="button"
          class="text-dimmed transition-colors hover:text-error"
          :aria-label="`Remove tag ${tag.name}`"
          @click="deleteTag(tag.id, tag.name)"
        >
          <UIcon name="i-lucide-x" class="size-3" />
        </button>
      </li>
    </ul>

    <div v-else class="py-8 text-center">
      <UIcon name="i-lucide-tag" class="mx-auto size-5 text-muted" />
      <p class="mt-2 text-sm text-muted">No tags yet. Add your first above.</p>
    </div>
  </div>
</template>
