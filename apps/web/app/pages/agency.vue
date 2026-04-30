<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

import AgencyDashboard from "~/components/agency/AgencyDashboard.vue";
import AgencyManagement from "~/components/agency/AgencyManagement.vue";
import AgencyOverview from "~/components/agency/AgencyOverview.vue";
import AgencyProUpsell from "~/components/agency/AgencyProUpsell.vue";
import AgencySidebar from "~/components/agency/AgencySidebar.vue";

definePageMeta({
  layout: "app",
  middleware: ["auth"],
});

useAppShellPageTitle("Agency");

type AgencySection = "overview" | "dashboard" | "management";

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

const selectedTeamId = ref("");
const section = ref<AgencySection>("overview");

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

const sectionTitles: Record<AgencySection, { title: string; subtitle: string }> = {
  overview: {
    title: "Overview",
    subtitle: "Track time and review your entries.",
  },
  dashboard: {
    title: "Dashboard",
    subtitle: "Team-wide hours, activity, and filters.",
  },
  management: {
    title: "Management",
    subtitle: "Manage clients, projects, and tags.",
  },
};

const isInitialLoading = computed(() => billingQuery.isPending.value || teamsQuery.isPending.value);
</script>

<template>
  <div class="h-full overflow-y-auto bg-default text-default">
    <main class="w-full px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <header class="mb-6 flex items-center gap-3">
        <div
          class="flex size-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20"
        >
          <UIcon name="i-lucide-briefcase" class="size-5" />
        </div>
        <div>
          <h1 class="text-xl font-semibold tracking-tight text-highlighted">Agency</h1>
          <p class="text-xs text-muted">
            Time tracking, reporting, and client management for your team.
          </p>
        </div>
      </header>

      <div v-if="isInitialLoading" class="flex items-center justify-center py-24">
        <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
      </div>

      <AgencyProUpsell v-else-if="!agencyEnabled" />

      <div
        v-else-if="teams.length === 0"
        class="rounded-3xl border border-dashed border-muted/30 p-10 text-center"
      >
        <UIcon name="i-lucide-users" class="mx-auto size-8 text-muted" />
        <p class="mt-4 text-sm font-medium text-highlighted">No team available</p>
        <p class="mt-1 text-xs text-muted">
          Create a team in your workspace to start using agency tools.
        </p>
      </div>

      <div v-else class="flex flex-col gap-6 md:flex-row md:items-start">
        <AgencySidebar
          :section="section"
          :team-id="selectedTeamId"
          :teams="teams"
          @update:section="section = $event"
          @update:team-id="selectedTeamId = $event"
        />

        <section class="min-w-0 flex-1 space-y-4">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h2 class="text-base font-semibold text-highlighted">
                {{ sectionTitles[section].title }}
              </h2>
              <p class="text-xs text-muted">{{ sectionTitles[section].subtitle }}</p>
            </div>
          </div>

          <AgencyOverview v-if="section === 'overview'" :team-id="selectedTeamId" />
          <AgencyDashboard v-else-if="section === 'dashboard'" :team-id="selectedTeamId" />
          <AgencyManagement v-else-if="section === 'management'" :team-id="selectedTeamId" />
        </section>
      </div>
    </main>
  </div>
</template>
