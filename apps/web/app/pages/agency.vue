<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

import AgencyBillingSurface from "~/components/agency/AgencyBillingSurface.vue";
import AgencyClientsSurface from "~/components/agency/AgencyClientsSurface.vue";
import AgencyProjectDetail from "~/components/agency/AgencyProjectDetail.vue";
import AgencyProjectsTable from "~/components/agency/AgencyProjectsTable.vue";
import AgencyProUpsell from "~/components/agency/AgencyProUpsell.vue";
import AgencyReportsSurface from "~/components/agency/AgencyReportsSurface.vue";
import AgencyResourcingSurface from "~/components/agency/AgencyResourcingSurface.vue";
import AgencySettingsSurface from "~/components/agency/AgencySettingsSurface.vue";
import AgencyTopBar from "~/components/agency/AgencyTopBar.vue";
import AgencyWorkSurface from "~/components/agency/AgencyWorkSurface.vue";
import { AGENCY_SEGMENTS, type AgencySegmentId } from "~/components/agency/agency-segments";
import { useCurrentAgencyTeam } from "~/composables/usePersistentTimer";
import { useAgencyLiveSync } from "~/composables/useAgencyLiveSync";

definePageMeta({
  layout: "app",
  middleware: ["auth"],
});

const orpc = useOrpc();
const authSession = useAuthSession();
const authEnabled = computed(() => Boolean(authSession.value?.data?.user));

const { limits, billingQuery } = useBilling();
const agencyEnabled = computed(() => Boolean(limits.value.agencyOps));

const teamsQuery = useQuery(
  computed(() => ({
    ...orpc.team.list.queryOptions(),
    enabled: authEnabled.value,
  })),
);

const teams = computed(() => teamsQuery.data.value?.items ?? []);

const route = useRoute();
const router = useRouter();

const selectedTeamId = ref("");
const segment = ref<AgencySegmentId>(
  AGENCY_SEGMENTS.some((entry) => entry.id === route.query.section)
    ? (route.query.section as AgencySegmentId)
    : "work",
);

const currentSegment = computed(
  () => AGENCY_SEGMENTS.find((entry) => entry.id === segment.value) ?? AGENCY_SEGMENTS[0]!,
);

useAppShellPageTitle(computed(() => currentSegment.value.label));

const projectsTableRef = ref<InstanceType<typeof AgencyProjectsTable> | null>(null);
const reportsSurfaceRef = ref<InstanceType<typeof AgencyReportsSurface> | null>(null);

// Sync segment to URL `?section=` so deep links and back/forward work.
watch(segment, (next) => {
  if (route.query.section === next) return;
  router.replace({ query: { ...route.query, section: next } });
});

// Project drill-down: deep-linkable via `?project=<id>`.
const selectedProjectId = computed(() =>
  typeof route.query.project === "string" ? route.query.project : "",
);

function openProject(projectId: string) {
  router.push({ query: { ...route.query, section: "projects", project: projectId } });
}

function closeProject() {
  const next = { ...route.query };
  delete next.project;
  router.push({ query: next });
}

watch(segment, (next) => {
  if (next !== "projects" && selectedProjectId.value) {
    closeProject();
  }
});

watch(
  teams,
  (next) => {
    if (next.length === 0) {
      selectedTeamId.value = "";
      return;
    }
    const stillExists = next.some((team) => team.id === selectedTeamId.value);
    if (!stillExists) {
      selectedTeamId.value = next[0]?.id ?? "";
    }
  },
  { immediate: true },
);

const { setCurrentAgencyTeamId } = useCurrentAgencyTeam();

watch(
  selectedTeamId,
  (next) => {
    setCurrentAgencyTeamId(next || null);
  },
  { immediate: true },
);

const agencyLiveTeamId = computed(() =>
  agencyEnabled.value && selectedTeamId.value ? selectedTeamId.value : "",
);
const { connectionState } = useAgencyLiveSync(agencyLiveTeamId);

const isInitialLoading = computed(() => billingQuery.isPending.value || teamsQuery.isPending.value);

function panelIdFor(segmentId: AgencySegmentId) {
  return `agency-panel-${segmentId}`;
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden bg-default text-default">
    <main class="mx-auto flex h-full w-full max-w-[120rem] flex-col px-6 pb-16 pt-6 lg:px-8">
      <div v-if="isInitialLoading" class="space-y-4">
        <USkeleton class="h-12 w-full rounded-2xl" />
        <USkeleton class="h-6 w-2/3 rounded-lg" />
        <USkeleton class="h-64 w-full rounded-[32px]" />
      </div>

      <AgencyProUpsell v-else-if="!agencyEnabled" />

      <AgencyPlaceholderSurface
        v-else-if="teams.length === 0"
        icon="i-lucide-users"
        title="No team yet"
        body="Create a team in your workspace to start using agency tools."
        :hints="['Open Dashboard and create or join a team from the team panel.']"
      />

      <div v-else class="flex min-h-0 flex-1 flex-col gap-4">
        <AgencyTopBar
          :segment="segment"
          :team-id="selectedTeamId"
          :teams="teams"
          :connection-state="connectionState"
          @update:segment="segment = $event"
          @update:team-id="selectedTeamId = $event"
        >
          <template #actions>
            <UButton
              v-if="segment === 'projects' && !selectedProjectId"
              label="New project"
              icon="i-lucide-plus"
              color="primary"
              size="xs"
              @click="projectsTableRef?.openNewProject()"
            />
            <UButton
              v-if="segment === 'reports'"
              label="Export CSV"
              icon="i-lucide-download"
              color="neutral"
              variant="soft"
              size="xs"
              :loading="reportsSurfaceRef?.isExporting"
              :disabled="!reportsSurfaceRef?.canExport"
              @click="reportsSurfaceRef?.downloadCsv()"
            />
          </template>
        </AgencyTopBar>

        <div
          :id="panelIdFor(segment)"
          class="min-h-0 flex-1"
          role="tabpanel"
          :aria-labelledby="`agency-tab-${segment}`"
        >
          <AgencyWorkSurface
            v-if="segment === 'work'"
            :team-id="selectedTeamId"
            @select-project="openProject"
          />

          <template v-else-if="segment === 'projects'">
            <AgencyProjectDetail
              v-if="selectedProjectId"
              :team-id="selectedTeamId"
              :project-id="selectedProjectId"
              @back="closeProject"
            />
            <AgencyProjectsTable
              v-else
              ref="projectsTableRef"
              :team-id="selectedTeamId"
              hide-toolbar-actions
              @select="openProject"
            />
          </template>

          <AgencyClientsSurface v-else-if="segment === 'clients'" :team-id="selectedTeamId" />

          <AgencyReportsSurface
            v-else-if="segment === 'reports'"
            ref="reportsSurfaceRef"
            :team-id="selectedTeamId"
            hide-toolbar-export
          />

          <AgencyResourcingSurface
            v-else-if="segment === 'resourcing'"
            :team-id="selectedTeamId"
            @update:segment="segment = $event as AgencySegmentId"
          />

          <AgencyBillingSurface v-else-if="segment === 'billing'" :team-id="selectedTeamId" />

          <AgencySettingsSurface v-else-if="segment === 'settings'" :team-id="selectedTeamId" />
        </div>
      </div>
    </main>
  </div>
</template>
