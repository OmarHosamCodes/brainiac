<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

import AgencyDashboard from "~/components/agency/AgencyDashboard.vue";
import AgencyManagement from "~/components/agency/AgencyManagement.vue";
import AgencyPlaceholderSurface from "~/components/agency/AgencyPlaceholderSurface.vue";
import AgencyProjectsTable from "~/components/agency/AgencyProjectsTable.vue";
import AgencyProUpsell from "~/components/agency/AgencyProUpsell.vue";
import AgencyTimeWeekGrid from "~/components/agency/AgencyTimeWeekGrid.vue";
import AgencyTopBar from "~/components/agency/AgencyTopBar.vue";
import {
  AGENCY_SEGMENTS,
  type AgencySegmentId,
} from "~/components/agency/agency-segments";
import { useCurrentAgencyTeam } from "~/composables/usePersistentTimer";

definePageMeta({
  layout: "app",
  middleware: ["auth"],
});

useAppShellPageTitle("Agency");

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
    : "time",
);

// Sync segment to URL `?section=` so deep links and back/forward work.
watch(segment, (next) => {
  if (route.query.section === next) return;
  router.replace({ query: { ...route.query, section: next } });
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

// Publish current team to the global app-shell state so the persistent timer
// in the chrome resolves the right active-timer query.
const { setCurrentAgencyTeamId } = useCurrentAgencyTeam();

watch(
  selectedTeamId,
  (next) => {
    setCurrentAgencyTeamId(next || null);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  // Keep the chrome timer alive while the user navigates within the agency
  // surface; only clear on explicit team-removal (handled above).
});

const currentSegment = computed(
  () => AGENCY_SEGMENTS.find((entry) => entry.id === segment.value) ?? AGENCY_SEGMENTS[0]!,
);

const isInitialLoading = computed(() => billingQuery.isPending.value || teamsQuery.isPending.value);
</script>

<template>
  <div class="h-full overflow-y-auto bg-default text-default">
    <main class="mx-auto w-full max-w-[120rem] px-6 pb-16 pt-6 lg:px-8">
      <div v-if="isInitialLoading" class="flex items-center justify-center py-24">
        <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
      </div>

      <AgencyProUpsell v-else-if="!agencyEnabled" />

      <div
        v-else-if="teams.length === 0"
        class="rounded-2xl border border-dashed border-default bg-muted/20 p-10 text-center"
      >
        <UIcon name="i-lucide-users" class="mx-auto size-8 text-muted" />
        <p class="mt-4 text-sm font-bold text-highlighted">No team yet.</p>
        <p class="mt-1 text-xs text-muted">
          Create a team in your workspace to start using agency tools.
        </p>
      </div>

      <div v-else class="space-y-6">
        <AgencyTopBar
          :segment="segment"
          :team-id="selectedTeamId"
          :teams="teams"
          @update:segment="segment = $event"
          @update:team-id="selectedTeamId = $event"
        />

        <header class="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              {{ currentSegment.label }}
            </p>
            <h1 class="mt-1 text-xl font-bold text-highlighted">
              {{ currentSegment.subtitle }}
            </h1>
          </div>
        </header>

        <AgencyTimeWeekGrid v-if="segment === 'time'" :team-id="selectedTeamId" />

        <AgencyProjectsTable v-else-if="segment === 'projects'" :team-id="selectedTeamId" />

        <AgencyManagement v-else-if="segment === 'clients'" :team-id="selectedTeamId" />

        <AgencyDashboard v-else-if="segment === 'reports'" :team-id="selectedTeamId" />

        <AgencyPlaceholderSurface
          v-else-if="segment === 'resourcing'"
          icon="i-lucide-calendar-range"
          title="Resourcing isn't set up yet."
          body="Capacity planning lives here once weekly hours per member are configured. You'll see utilization heatmaps across the team and forecast next week's load."
          :hints="[
            'Member × week heatmap, color-scaled by utilization.',
            'Drill into a week to rebalance assignments without leaving the page.',
            'Forecast hours alongside committed project budgets.',
          ]"
        />

        <AgencyPlaceholderSurface
          v-else-if="segment === 'billing'"
          icon="i-lucide-receipt"
          title="No invoices yet."
          body="Bill your first period from a closed week. Invoices flow through draft, sent, and paid lanes; the period-close checklist guides each cycle."
          :hints="[
            'Pipeline view: draft, sent, paid.',
            'Period-close checklist with reconciliation hooks.',
            'Export PDFs or push to your accounting tool.',
          ]"
        />

        <AgencyPlaceholderSurface
          v-else-if="segment === 'settings'"
          icon="i-lucide-settings"
          title="Settings live here soon."
          body="Tags, member rates, integrations, and project hue overrides will be grouped into a left-rail subnav. For now, project and tag editing happens in Clients."
          :hints="[
            'Tags and rates per member.',
            'Member roles and removal.',
            'Integrations (Slack, calendar, exports).',
            'Override the auto-assigned project hue.',
          ]"
        />
      </div>
    </main>
  </div>
</template>
