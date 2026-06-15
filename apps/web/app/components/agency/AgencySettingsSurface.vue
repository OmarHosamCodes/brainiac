<script setup lang="ts">
import AgencySettingsColorsPane from "~/components/agency/settings/AgencySettingsColorsPane.vue";
import AgencySettingsIntegrationsPane from "~/components/agency/settings/AgencySettingsIntegrationsPane.vue";
import AgencySettingsRatesPane from "~/components/agency/settings/AgencySettingsRatesPane.vue";
import AgencySettingsTagsPane from "~/components/agency/settings/AgencySettingsTagsPane.vue";
import AgencySettingsTenurePane from "~/components/agency/settings/AgencySettingsTenurePane.vue";
import {
  AGENCY_SETTINGS_PANES,
  agencySettingsPaneIndex,
  isAgencySettingsPaneId,
  type AgencySettingsPaneId,
} from "~/components/agency/agency-settings-sections";

defineProps<{
  teamId: string;
}>();

const route = useRoute();
const router = useRouter();

const paneFromRoute = computed((): AgencySettingsPaneId => {
  const queryPane = route.query.pane;
  return isAgencySettingsPaneId(queryPane) ? queryPane : "tags";
});

const selectedTabIndex = ref(agencySettingsPaneIndex(paneFromRoute.value));

const settingsTabs = computed(() =>
  AGENCY_SETTINGS_PANES.map((pane) => ({
    label: pane.label,
    icon: pane.icon,
    badge: pane.status === "soon" ? "Soon" : undefined,
  })),
);

const activePane = computed(
  () => AGENCY_SETTINGS_PANES[selectedTabIndex.value]?.id ?? "tags",
);

watch(paneFromRoute, (next) => {
  const index = agencySettingsPaneIndex(next);
  if (selectedTabIndex.value !== index) {
    selectedTabIndex.value = index;
  }
});

watch(selectedTabIndex, (nextIndex) => {
  const nextPane = AGENCY_SETTINGS_PANES[nextIndex]?.id ?? "tags";
  if (route.query.pane === nextPane) return;
  router.replace({ query: { ...route.query, pane: nextPane } });
});

watch(
  () => route.query.section,
  (section) => {
    if (section === "settings" && !isAgencySettingsPaneId(route.query.pane)) {
      router.replace({ query: { ...route.query, pane: "tags" } });
      return;
    }
    if (section !== "settings" && route.query.pane) {
      const next = { ...route.query };
      delete next.pane;
      router.replace({ query: next });
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-4">
    <UTabs v-model="selectedTabIndex" :items="settingsTabs" variant="pill" size="sm" />

    <div class="min-h-0 flex-1 pb-4">
      <AgencySettingsTagsPane
        v-if="activePane === 'tags'"
        :team-id="teamId"
        :active="activePane === 'tags'"
      />
      <AgencySettingsRatesPane
        v-else-if="activePane === 'rates'"
        :team-id="teamId"
        :active="activePane === 'rates'"
      />
      <AgencySettingsTenurePane
        v-else-if="activePane === 'tenure'"
        :team-id="teamId"
        :active="activePane === 'tenure'"
      />
      <AgencySettingsIntegrationsPane
        v-else-if="activePane === 'integrations'"
        :team-id="teamId"
        :active="activePane === 'integrations'"
      />
      <AgencySettingsColorsPane v-else-if="activePane === 'colors'" />
    </div>
  </div>
</template>
