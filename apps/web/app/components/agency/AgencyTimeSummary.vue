<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

const props = defineProps<{
  teamId: string;
}>();

const orpc = useOrpc();

type DatePreset = "this-week" | "last-month" | "year-to-date" | "custom";

const datePreset = ref<DatePreset>("this-week");
const customFromDate = ref("");
const customToDate = ref("");
const selectedClientId = ref("");
const selectedProjectId = ref("");
const selectedMemberUserId = ref("");
const selectedTagIds = ref<string[]>([]);

const effectiveTeamId = computed(() => props.teamId);

const dateRange = computed(() => {
  const now = new Date();
  let from: Date;
  let to: Date;

  switch (datePreset.value) {
    case "this-week": {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      from = new Date(now.getFullYear(), now.getMonth(), diff);
      to = new Date(from);
      to.setDate(to.getDate() + 6);
      break;
    }
    case "last-month": {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    }
    case "year-to-date": {
      from = new Date(now.getFullYear(), 0, 1);
      to = now;
      break;
    }
    case "custom": {
      from = customFromDate.value
        ? new Date(customFromDate.value)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      to = customToDate.value ? new Date(customToDate.value) : now;
      break;
    }
    default:
      from = new Date();
      to = new Date();
  }

  return { from, to };
});

const clientsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.clients.list.queryOptions({
      input: {
        teamId: effectiveTeamId.value,
      },
    }),
    enabled: Boolean(effectiveTeamId.value),
  })),
);

const clients = computed(() => clientsQuery.data.value?.items ?? []);

const projectsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.projects.list.queryOptions({
      input: {
        teamId: effectiveTeamId.value,
        clientId: selectedClientId.value || undefined,
      },
    }),
    enabled: Boolean(effectiveTeamId.value),
  })),
);

const projects = computed(() => projectsQuery.data.value?.items ?? []);

const tagsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.tags.list.queryOptions({
      input: {
        teamId: effectiveTeamId.value,
      },
    }),
    enabled: Boolean(effectiveTeamId.value),
  })),
);

const tags = computed(() => tagsQuery.data.value?.items ?? []);

const summaryQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.summary.list.queryOptions({
      input: {
        teamId: effectiveTeamId.value,
        from: dateRange.value.from.toISOString(),
        to: dateRange.value.to.toISOString(),
        clientId: selectedClientId.value || undefined,
        projectId: selectedProjectId.value || undefined,
        memberUserId: selectedMemberUserId.value || undefined,
        tagIds: selectedTagIds.value.length > 0 ? selectedTagIds.value : undefined,
      },
    }),
    enabled: Boolean(effectiveTeamId.value),
  })),
);

const summaryData = computed(() => summaryQuery.data.value?.summary ?? null);

function updateDatePreset(preset: DatePreset) {
  datePreset.value = preset;
}

function toggleTag(tagId: string) {
  if (selectedTagIds.value.includes(tagId)) {
    selectedTagIds.value = selectedTagIds.value.filter((id) => id !== tagId);
  } else {
    selectedTagIds.value = [...selectedTagIds.value, tagId];
  }
}

function formatHours(seconds: number) {
  return (seconds / 3600).toFixed(1);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Filter bar -->
    <div
      class="space-y-4 rounded-2xl border border-zinc-200/30 bg-zinc-950/40 p-4 backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-950/50"
    >
      <!-- Date preset -->
      <div>
        <label
          class="mb-2 block text-xs font-semibold uppercase tracking-widest text-zinc-600 dark:text-zinc-400"
        >
          Period
        </label>
        <div class="flex flex-wrap gap-2">
          <UButton
            v-for="preset in [
              { label: 'This week', value: 'this-week' as DatePreset },
              { label: 'Last month', value: 'last-month' as DatePreset },
              { label: 'YTD', value: 'year-to-date' as DatePreset },
              { label: 'Custom', value: 'custom' as DatePreset },
            ]"
            :key="preset.value"
            :label="preset.label"
            size="xs"
            :variant="datePreset === preset.value ? 'soft' : 'ghost'"
            :color="datePreset === preset.value ? 'primary' : 'neutral'"
            class="rounded-full"
            @click="updateDatePreset(preset.value)"
          />
        </div>
      </div>

      <!-- Custom range -->
      <div v-if="datePreset === 'custom'" class="grid gap-3 md:grid-cols-2">
        <UFormField label="From" size="sm" class="mb-0">
          <UInput v-model="customFromDate" type="date" size="sm" />
        </UFormField>
        <UFormField label="To" size="sm" class="mb-0">
          <UInput v-model="customToDate" type="date" size="sm" />
        </UFormField>
      </div>

      <!-- Detailed filters -->
      <div class="grid gap-3 md:grid-cols-4">
        <UFormField label="Client" size="sm" class="mb-0">
          <USelect
            v-model="selectedClientId"
            :items="
              clients.map((client) => ({
                label: client.name,
                value: client.id,
              }))
            "
            clearable
            placeholder="All clients"
            size="sm"
          />
        </UFormField>

        <UFormField label="Project" size="sm" class="mb-0">
          <USelect
            v-model="selectedProjectId"
            :items="
              projects.map((project) => ({
                label: project.name,
                value: project.id,
              }))
            "
            clearable
            placeholder="All projects"
            size="sm"
          />
        </UFormField>

        <UFormField label="Member" size="sm" class="mb-0">
          <USelect
            v-model="selectedMemberUserId"
            :items="
              summaryData?.teamMembers?.map((member) => ({
                label: member.name,
                value: member.id,
              })) ?? []
            "
            clearable
            placeholder="All members"
            size="sm"
          />
        </UFormField>

        <UFormField label="Tags" size="sm" class="mb-0">
          <div v-if="tags.length > 0" class="flex flex-wrap gap-2">
            <UButton
              v-for="tag in tags.slice(0, 3)"
              :key="tag.id"
              :label="tag.name"
              size="xs"
              :variant="selectedTagIds.includes(tag.id) ? 'soft' : 'ghost'"
              :color="selectedTagIds.includes(tag.id) ? 'primary' : 'neutral'"
              class="rounded-full"
              @click="toggleTag(tag.id)"
            />
            <span v-if="tags.length > 3" class="text-xs text-zinc-500">
              +{{ tags.length - 3 }} more
            </span>
          </div>
          <p v-else class="text-xs text-zinc-500">No tags yet</p>
        </UFormField>
      </div>
    </div>

    <!-- Summary stats -->
    <div v-if="summaryData" class="grid gap-4 md:grid-cols-3">
      <div
        class="rounded-2xl border border-zinc-200/30 bg-zinc-950/40 p-4 backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-950/50"
      >
        <p class="text-xs font-semibold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
          Total hours
        </p>
        <p class="mt-2 text-2xl font-bold text-zinc-100">
          {{ formatHours(summaryData.totalSeconds) }}
        </p>
      </div>

      <div
        class="rounded-2xl border border-zinc-200/30 bg-zinc-950/40 p-4 backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-950/50"
      >
        <p class="text-xs font-semibold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
          Active timers
        </p>
        <p class="mt-2 text-2xl font-bold text-emerald-500">
          {{ summaryData.activeCount ?? 0 }}
        </p>
      </div>

      <div
        class="rounded-2xl border border-zinc-200/30 bg-zinc-950/40 p-4 backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-950/50"
      >
        <p class="text-xs font-semibold uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
          Team members
        </p>
        <p class="mt-2 text-2xl font-bold text-zinc-100">
          {{ summaryData.teamMembers?.length ?? 0 }}
        </p>
      </div>
    </div>

    <!-- Team activity table -->
    <div
      v-if="summaryData?.teamMembers && summaryData.teamMembers.length > 0"
      class="overflow-hidden rounded-2xl border border-zinc-200/30 bg-zinc-950/40 backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-950/50"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="border-b border-zinc-200/20 bg-zinc-900/50 dark:border-zinc-800/50">
            <tr>
              <th class="px-4 py-3 text-left font-semibold text-zinc-300">Member</th>
              <th class="px-4 py-3 text-left font-semibold text-zinc-300">Latest Activity</th>
              <th class="px-4 py-3 text-right font-semibold text-zinc-300">Hours</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-200/10 dark:divide-zinc-800/30">
            <tr
              v-for="member in summaryData.teamMembers"
              :key="member.id"
              class="transition-colors hover:bg-zinc-800/30"
            >
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <UAvatar :src="member.avatar ?? undefined" :alt="member.name" size="sm" />
                  <div class="min-w-0">
                    <p class="font-medium text-zinc-100">
                      {{ member.name }}
                    </p>
                    <p class="truncate text-xs text-zinc-500">
                      {{ member.email }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <div v-if="member.latestEntry">
                  <div class="flex items-center gap-2">
                    <span
                      v-if="member.isActive"
                      class="inline-block size-2 animate-pulse rounded-full bg-emerald-500"
                    />
                    <p class="text-sm text-zinc-300">
                      {{ member.latestEntry.projectName }}
                    </p>
                  </div>
                  <p
                    v-if="member.latestEntry.description"
                    class="mt-1 truncate text-xs text-zinc-500"
                  >
                    {{ member.latestEntry.description }}
                  </p>
                </div>
                <p v-else class="text-xs text-zinc-500">No activity</p>
              </td>
              <td class="px-4 py-3 text-right">
                <p class="font-mono font-semibold text-zinc-100">
                  {{ formatHours(member.totalSeconds) }}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!summaryQuery.isPending.value"
      class="rounded-2xl border border-dashed border-zinc-400/30 p-8 text-center dark:border-zinc-700/30"
    >
      <UIcon name="i-lucide-inbox" class="mx-auto size-8 text-zinc-400" />
      <p class="mt-4 font-medium text-zinc-400">No time tracked in this period</p>
      <p class="mt-1 text-sm text-zinc-500">Try adjusting your filters or date range.</p>
    </div>

    <!-- Loading -->
    <div
      v-if="summaryQuery.isPending.value"
      class="rounded-2xl border border-zinc-200/30 bg-zinc-950/40 p-8 text-center backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-950/50"
    >
      <UIcon name="i-lucide-loader-2" class="mx-auto size-6 animate-spin text-zinc-400" />
      <p class="mt-4 text-sm text-zinc-400">Loading data...</p>
    </div>
  </div>
</template>
