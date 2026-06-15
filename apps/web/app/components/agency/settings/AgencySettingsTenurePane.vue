<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

import AgencySettingsTenureMemberDetail from "~/components/agency/settings/AgencySettingsTenureMemberDetail.vue";
import AgencySettingsTenurePolicy from "~/components/agency/settings/AgencySettingsTenurePolicy.vue";
import AgencySettingsTenureRoster from "~/components/agency/settings/AgencySettingsTenureRoster.vue";
import { getErrorMessage } from "~/utils/get-error-message";
import { withAgencyLiveQueryOptions } from "~/utils/agency-query-options";
import { agencySectionTitleClass } from "~/utils/agency-ui";

import type { FiscalMonth } from "./tenure-utils";

const props = defineProps<{
  teamId: string;
  active: boolean;
}>();

const orpc = useOrpc();
const toast = useToast();
const queryClient = useQueryClient();

const teamId = computed(() => props.teamId);

const teamQuery = useQuery(
  computed(() => ({
    ...orpc.team.get.queryOptions({ input: { teamId: teamId.value } }),
    enabled: Boolean(teamId.value) && props.active,
  })),
);

const isOwner = computed(() => teamQuery.data.value?.role === "owner");

const policyQuery = useQuery(
  computed(() =>
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.tenure.policy.get.queryOptions({ input: { teamId: teamId.value } }),
      enabled: Boolean(teamId.value) && props.active,
    }),
  ),
);

const summaryQuery = useQuery(
  computed(() =>
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.tenure.summary.list.queryOptions({ input: { teamId: teamId.value } }),
      enabled: Boolean(teamId.value) && props.active,
    }),
  ),
);

const exemptionsQuery = useQuery(
  computed(() =>
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.tenure.exemptions.list.queryOptions({ input: { teamId: teamId.value } }),
      enabled: Boolean(teamId.value) && props.active,
    }),
  ),
);

const policy = computed(() => policyQuery.data.value?.policy ?? null);
const members = computed(() => summaryQuery.data.value?.items ?? []);
const policyEnabled = computed(() => summaryQuery.data.value?.policyEnabled ?? false);
const exemptions = computed(() => exemptionsQuery.data.value?.items ?? []);

const policyDraft = ref({
  fiscalYearStartMonth: 1 as FiscalMonth,
  fiscalYearStartDay: "1",
  quarterlyMinHours: "525",
  penaltyMonths: "6",
  internDurationMonths: "4",
  internDurationWeeks: "0",
  policyEffectiveFrom: new Date().toISOString().slice(0, 10),
  enabled: false,
});

watch(
  policy,
  (next) => {
    if (!next) return;
    policyDraft.value = {
      fiscalYearStartMonth: next.fiscalYearStartMonth as FiscalMonth,
      fiscalYearStartDay: String(next.fiscalYearStartDay),
      quarterlyMinHours: String(next.quarterlyMinHours),
      penaltyMonths: String(next.penaltyMonths),
      internDurationMonths: String(next.internDurationMonths),
      internDurationWeeks: String(next.internDurationWeeks),
      policyEffectiveFrom: next.policyEffectiveFrom.slice(0, 10),
      enabled: next.enabled,
    };
  },
  { immediate: true },
);

const savePolicyMutation = useMutation(orpc.agencyOps.tenure.policy.upsert.mutationOptions());
const saveProfileMutation = useMutation(orpc.agencyOps.tenure.profiles.upsert.mutationOptions());
const saveExemptionMutation = useMutation(
  orpc.agencyOps.tenure.exemptions.upsert.mutationOptions(),
);
const deleteExemptionMutation = useMutation(
  orpc.agencyOps.tenure.exemptions.delete.mutationOptions(),
);

const selectedUserId = ref<string | null>(null);

const memberDetailQuery = useQuery(
  computed(() =>
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.tenure.member.get.queryOptions({
        input: { teamId: teamId.value, userId: selectedUserId.value ?? "" },
      }),
      enabled: Boolean(teamId.value && selectedUserId.value && props.active),
    }),
  ),
);

const memberDetail = computed(() => memberDetailQuery.data.value?.member ?? null);

const selectedMemberName = computed(() => {
  if (!selectedUserId.value) return "";
  return members.value.find((member) => member.userId === selectedUserId.value)?.userName ?? "Member";
});

const profileDraft = ref({
  internStart: "",
  internEnd: "",
  internCountsTowardTenure: false,
  internExemptFromQuarterMin: true,
  notes: "",
});

watch(memberDetail, (next) => {
  if (!next) return;
  profileDraft.value = {
    internStart: next.internStart?.slice(0, 10) ?? "",
    internEnd: next.internEnd?.slice(0, 10) ?? "",
    internCountsTowardTenure: next.internCountsTowardTenure,
    internExemptFromQuarterMin: next.internExemptFromQuarterMin,
    notes: next.notes ?? "",
  };
});

const exemptionDraft = ref({
  type: "member_waiver" as
    | "team_holiday"
    | "member_waiver"
    | "member_reduced_min"
    | "member_frozen_month",
  fiscalYear: String(new Date().getUTCFullYear()),
  fiscalQuarter: "1" as "1" | "2" | "3" | "4",
  userId: "",
  reducedMinHours: "",
  frozenMonth: 1 as FiscalMonth,
  reason: "",
});

async function invalidateTenureQueries() {
  if (!teamId.value) return;
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: orpc.agencyOps.tenure.policy.get.key({ input: { teamId: teamId.value } }),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.agencyOps.tenure.summary.list.key({ input: { teamId: teamId.value } }),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.agencyOps.tenure.exemptions.list.key({ input: { teamId: teamId.value } }),
    }),
    queryClient.invalidateQueries({
      queryKey: orpc.agencyOps.tenure.profiles.list.key({ input: { teamId: teamId.value } }),
    }),
  ]);
  if (selectedUserId.value) {
    await queryClient.invalidateQueries({
      queryKey: orpc.agencyOps.tenure.member.get.key({
        input: { teamId: teamId.value, userId: selectedUserId.value },
      }),
    });
  }
}

async function savePolicy() {
  if (!teamId.value || !isOwner.value) return;
  try {
    await savePolicyMutation.mutateAsync({
      teamId: teamId.value,
      fiscalYearStartMonth: policyDraft.value.fiscalYearStartMonth,
      fiscalYearStartDay: Number.parseInt(policyDraft.value.fiscalYearStartDay, 10),
      quarterlyMinHours: Number.parseInt(policyDraft.value.quarterlyMinHours, 10),
      penaltyMonths: Number.parseInt(policyDraft.value.penaltyMonths, 10),
      internDurationMonths: Number.parseInt(policyDraft.value.internDurationMonths, 10),
      internDurationWeeks: Number.parseInt(policyDraft.value.internDurationWeeks, 10),
      policyEffectiveFrom: new Date(policyDraft.value.policyEffectiveFrom).toISOString(),
      enabled: policyDraft.value.enabled,
    });
    await invalidateTenureQueries();
    toast.add({ title: "Tenure policy saved", color: "success" });
  } catch (error) {
    toast.add({
      title: "Couldn't save policy",
      description: getErrorMessage(error, "Try again."),
      color: "error",
    });
  }
}

function selectMember(userId: string) {
  selectedUserId.value = userId;
}

const memberExemptions = computed(() => {
  if (!selectedUserId.value) return [];
  return exemptions.value.filter(
    (exemption) =>
      exemption.type === "team_holiday" || exemption.userId === selectedUserId.value,
  );
});

function closeMemberDetail() {
  selectedUserId.value = null;
}

async function saveProfile() {
  if (!teamId.value || !isOwner.value || !selectedUserId.value) return;
  try {
    await saveProfileMutation.mutateAsync({
      teamId: teamId.value,
      userId: selectedUserId.value,
      internStart: profileDraft.value.internStart
        ? new Date(profileDraft.value.internStart).toISOString()
        : null,
      internEnd: profileDraft.value.internEnd
        ? new Date(profileDraft.value.internEnd).toISOString()
        : null,
      internCountsTowardTenure: profileDraft.value.internCountsTowardTenure,
      internExemptFromQuarterMin: profileDraft.value.internExemptFromQuarterMin,
      notes: profileDraft.value.notes || null,
    });
    await invalidateTenureQueries();
    toast.add({ title: "Member profile saved", color: "success" });
  } catch (error) {
    toast.add({
      title: "Couldn't save profile",
      description: getErrorMessage(error, "Try again."),
      color: "error",
    });
  }
}

async function addExemption() {
  if (!teamId.value || !isOwner.value) return;
  try {
    const type = exemptionDraft.value.type;
    await saveExemptionMutation.mutateAsync({
      teamId: teamId.value,
      type,
      fiscalYear: Number.parseInt(exemptionDraft.value.fiscalYear, 10),
      fiscalQuarter: Number.parseInt(exemptionDraft.value.fiscalQuarter, 10) as 1 | 2 | 3 | 4,
      userId: type === "team_holiday" ? null : exemptionDraft.value.userId || selectedUserId.value,
      reducedMinHours:
        type === "member_reduced_min"
          ? Number.parseInt(exemptionDraft.value.reducedMinHours, 10)
          : null,
      frozenMonth:
        type === "member_frozen_month" ? exemptionDraft.value.frozenMonth : null,
      reason: exemptionDraft.value.reason || null,
    });
    await invalidateTenureQueries();
    toast.add({ title: "Exemption saved", color: "success" });
  } catch (error) {
    toast.add({
      title: "Couldn't save exemption",
      description: getErrorMessage(error, "Try again."),
      color: "error",
    });
  }
}

async function removeExemption(exemptionId: string) {
  if (!teamId.value || !isOwner.value) return;
  try {
    await deleteExemptionMutation.mutateAsync({ teamId: teamId.value, exemptionId });
    await invalidateTenureQueries();
    toast.add({ title: "Exemption removed", color: "success" });
  } catch (error) {
    toast.add({
      title: "Couldn't remove exemption",
      description: getErrorMessage(error, "Try again."),
      color: "error",
    });
  }
}

const fiscalYearPreview = computed(() => {
  const month = policyDraft.value.fiscalYearStartMonth;
  const day = Number.parseInt(policyDraft.value.fiscalYearStartDay, 10) || 1;
  const year = new Date().getUTCFullYear();
  const start = new Date(Date.UTC(year, month - 1, day));
  const endExclusive = new Date(Date.UTC(year + 1, month - 1, day));
  endExclusive.setUTCDate(endExclusive.getUTCDate() - 1);
  const fmt = (date: Date) =>
    date.toLocaleDateString(undefined, {
      timeZone: "UTC",
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  return `Example fiscal year: ${fmt(start)} – ${fmt(endExclusive)} (UTC).`;
});

const isLoading = computed(
  () => policyQuery.isPending.value || summaryQuery.isPending.value || teamQuery.isPending.value,
);
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 :class="agencySectionTitleClass">Agency tenure and quarterly hour requirements</h2>
    </div>

    <div v-if="isLoading" class="space-y-2">
      <div class="h-24 animate-pulse rounded-xl bg-elevated/60" />
      <div class="h-40 animate-pulse rounded-xl bg-elevated/60" />
    </div>

    <template v-else>
      <AgencySettingsTenurePolicy
        v-model:policy-draft="policyDraft"
        :is-owner="isOwner"
        :fiscal-year-preview="fiscalYearPreview"
        :saving="savePolicyMutation.isPending.value"
        @save="savePolicy"
      />

      <AgencySettingsTenureMemberDetail
        v-if="selectedUserId"
        v-model:profile-draft="profileDraft"
        v-model:exemption-draft="exemptionDraft"
        :member-name="selectedMemberName"
        :member-detail="memberDetail"
        :loading="memberDetailQuery.isPending.value"
        :is-owner="isOwner"
        :exemptions="memberExemptions"
        :saving-profile="saveProfileMutation.isPending.value"
        :saving-exemption="saveExemptionMutation.isPending.value"
        @close="closeMemberDetail"
        @save-profile="saveProfile"
        @add-exemption="addExemption"
        @remove-exemption="removeExemption"
      />

      <AgencySettingsTenureRoster
        v-else
        :members="members"
        :policy-enabled="policyEnabled"
        @select="selectMember"
      />
    </template>
  </div>
</template>
