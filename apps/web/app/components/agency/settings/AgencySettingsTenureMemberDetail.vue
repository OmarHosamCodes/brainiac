<script setup lang="ts">
import {
  agencyFocusRingClass,
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyMetricClass,
  agencyPanelClass,
} from "~/utils/agency-ui";

import {
  FISCAL_MONTHS,
  type FiscalMonth,
  formatPeriodEndExclusive,
  formatTenureHours,
  formatUtcDate,
  tenureStatusClass,
  tenureStatusLabel,
} from "./tenure-utils";

type QuarterSummary = {
  fiscalYear: number;
  fiscalQuarter: number;
  label: string;
  periodStart: string | null;
  periodEnd: string | null;
  requiredHours: number;
  loggedHours: number;
  status: string;
  penaltyMonthsApplied: number;
};

type MemberDetail = {
  userEmail: string;
  internStart: string | null;
  internEnd: string | null;
  internDerived: boolean;
  rawTenureLabel: string;
  netTenureLabel: string;
  penaltyMonths: number;
  awaitingFirstEntry: boolean;
  currentQuarter: QuarterSummary | null;
  quarters: QuarterSummary[];
};

type ExemptionItem = {
  id: string;
  fiscalYear: number;
  fiscalQuarter: number;
  type: string;
  userName: string | null;
  userId: string | null;
};

export type TenureProfileDraft = {
  internStart: string;
  internEnd: string;
  internCountsTowardTenure: boolean;
  internExemptFromQuarterMin: boolean;
  notes: string;
};

export type TenureExemptionDraft = {
  type: "team_holiday" | "member_waiver" | "member_reduced_min" | "member_frozen_month";
  fiscalYear: string;
  fiscalQuarter: "1" | "2" | "3" | "4";
  userId: string;
  reducedMinHours: string;
  frozenMonth: FiscalMonth;
  reason: string;
};

const props = defineProps<{
  memberName: string;
  memberDetail: MemberDetail | null;
  loading: boolean;
  isOwner: boolean;
  exemptions: ExemptionItem[];
  savingProfile: boolean;
  savingExemption: boolean;
}>();

const emit = defineEmits<{
  close: [];
  saveProfile: [];
  addExemption: [];
  removeExemption: [exemptionId: string];
}>();

const profileDraft = defineModel<TenureProfileDraft>("profileDraft", { required: true });
const exemptionDraft = defineModel<TenureExemptionDraft>("exemptionDraft", { required: true });

type DetailTabSlot = "history" | "profile" | "exemptions";

const detailTabs = computed(() => {
  const tabs: { label: string; slot: DetailTabSlot }[] = [
    { label: "Quarter history", slot: "history" },
  ];
  if (props.isOwner) {
    tabs.push({ label: "Profile", slot: "profile" });
    tabs.push({ label: "Exemptions", slot: "exemptions" });
  }
  return tabs;
});

const selectedTabIndex = ref(0);

const activeTab = computed(
  (): DetailTabSlot => detailTabs.value[selectedTabIndex.value]?.slot ?? "history",
);

watch(
  () => props.isOwner,
  () => {
    selectedTabIndex.value = 0;
  },
);

const currentQuarterPct = computed(() => {
  const quarter = props.memberDetail?.currentQuarter;
  if (!quarter || quarter.requiredHours <= 0) return 0;
  return Math.min(100, Math.round((quarter.loggedHours / quarter.requiredHours) * 100));
});

const internWindowLabel = computed(() => {
  const detail = props.memberDetail;
  if (!detail) return "—";
  if (detail.internStart && detail.internEnd) {
    const start = new Date(detail.internStart).toLocaleDateString();
    const end = new Date(detail.internEnd).toLocaleDateString();
    return detail.internDerived ? `${start} – ${end} (computed)` : `${start} – ${end}`;
  }
  if (detail.awaitingFirstEntry) return "Awaiting first tracked entry";
  return "Starts on first tracked entry";
});

const exemptionFormOpen = ref(false);

watch(
  () => props.savingExemption,
  (pending, wasPending) => {
    if (wasPending && !pending) {
      exemptionFormOpen.value = false;
    }
  },
);

watch(
  () => props.memberName,
  () => {
    selectedTabIndex.value = 0;
  },
);
</script>

<template>
  <section class="space-y-4">
    <div class="flex items-center gap-2">
      <UButton
        label="Back to roster"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="emit('close')"
      />
    </div>

    <div v-if="loading" class="space-y-3">
      <div class="h-28 animate-pulse rounded-2xl bg-elevated/60" />
      <div class="h-48 animate-pulse rounded-2xl bg-elevated/60" />
    </div>

    <template v-else-if="memberDetail">
      <div :class="agencyPanelClass" class="p-5 sm:p-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <h3 class="truncate text-lg font-bold text-highlighted">{{ memberName }}</h3>
            <p class="mt-0.5 truncate text-sm text-muted">{{ memberDetail.userEmail }}</p>
          </div>
          <span
            v-if="memberDetail.currentQuarter"
            class="inline-flex items-center rounded-full border border-default bg-muted px-3 py-1 text-xs font-bold"
            :class="tenureStatusClass(memberDetail.currentQuarter.status)"
          >
            {{ tenureStatusLabel(memberDetail.currentQuarter.status) }}
          </span>
        </div>

        <dl
          class="mt-5 grid gap-4 border-t border-default pt-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <dt class="text-xs font-semibold text-muted">Net tenure</dt>
            <dd :class="[agencyMetricClass, 'mt-1 text-base']">{{ memberDetail.netTenureLabel }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold text-muted">Raw tenure</dt>
            <dd :class="[agencyMetricClass, 'mt-1 text-base']">
              {{ memberDetail.rawTenureLabel }}
              <span v-if="memberDetail.penaltyMonths > 0" class="text-sm text-error">
                −{{ memberDetail.penaltyMonths }}m
              </span>
            </dd>
          </div>
          <div class="sm:col-span-2 lg:col-span-2">
            <dt class="text-xs font-semibold text-muted">Intern window</dt>
            <dd class="mt-1 text-sm text-highlighted">{{ internWindowLabel }}</dd>
          </div>
        </dl>

        <div
          v-if="memberDetail.currentQuarter"
          class="mt-5 border-t border-default pt-5"
        >
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <p class="text-sm font-semibold text-highlighted">
              {{ memberDetail.currentQuarter.label }}
            </p>
            <p :class="[agencyMetricClass, 'text-sm']">
              {{ formatTenureHours(memberDetail.currentQuarter.loggedHours) }} /
              {{ formatTenureHours(memberDetail.currentQuarter.requiredHours) }} h
            </p>
          </div>
          <div
            class="mt-2 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            :aria-valuenow="currentQuarterPct"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              class="h-full rounded-full bg-primary transition-[width] duration-200"
              :style="{ width: `${currentQuarterPct}%` }"
            />
          </div>
        </div>
      </div>

      <div :class="agencyPanelClass" class="overflow-hidden">
        <div class="border-b border-default px-4 pt-3 sm:px-5">
          <UTabs v-model="selectedTabIndex" :items="detailTabs" variant="pill" size="sm" />
        </div>

        <div class="p-4 sm:p-5">
          <div v-if="activeTab === 'history'">
            <div
              v-if="memberDetail.quarters.length === 0"
              class="py-8 text-center text-sm text-muted"
            >
              No quarter history yet.
            </div>
            <ul v-else class="divide-y divide-default">
              <li
                v-for="quarter in [...memberDetail.quarters].reverse()"
                :key="`${quarter.fiscalYear}-${quarter.fiscalQuarter}`"
                class="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
              >
                <div class="min-w-0">
                  <p class="font-mono text-sm font-bold text-highlighted">{{ quarter.label }}</p>
                  <p
                    v-if="quarter.periodStart && quarter.periodEnd"
                    class="mt-0.5 text-xs text-muted"
                  >
                    {{ formatUtcDate(quarter.periodStart) }} –
                    {{ formatPeriodEndExclusive(quarter.periodEnd) }}
                  </p>
                </div>
                <div class="flex flex-wrap items-center gap-4 text-sm">
                  <span :class="[agencyMetricClass, 'text-muted']">
                    {{ formatTenureHours(quarter.loggedHours) }} /
                    {{ formatTenureHours(quarter.requiredHours) }} h
                  </span>
                  <span class="font-bold" :class="tenureStatusClass(quarter.status)">
                    {{ tenureStatusLabel(quarter.status) }}
                  </span>
                  <span
                    v-if="quarter.penaltyMonthsApplied > 0"
                    class="font-mono text-xs text-error"
                  >
                    −{{ quarter.penaltyMonthsApplied }}m
                  </span>
                </div>
              </li>
            </ul>
          </div>

          <div v-else-if="activeTab === 'profile'" class="max-w-xl space-y-4">
            <p class="text-sm text-muted">
              Override intern dates and how intern time affects tenure and quarterly minimums.
            </p>
            <div class="grid gap-4 sm:grid-cols-2">
              <div :class="agencyFormFieldClass">
                <label :class="agencyFormLabelClass">Intern start override</label>
                <UInput v-model="profileDraft.internStart" type="date" size="sm" class="w-full" />
              </div>
              <div :class="agencyFormFieldClass">
                <label :class="agencyFormLabelClass">Intern end override</label>
                <UInput v-model="profileDraft.internEnd" type="date" size="sm" class="w-full" />
              </div>
            </div>
            <div class="space-y-2">
              <UCheckbox
                v-model="profileDraft.internCountsTowardTenure"
                label="Intern period counts toward tenure"
              />
              <UCheckbox
                v-model="profileDraft.internExemptFromQuarterMin"
                label="Intern period exempt from quarter minimum"
              />
            </div>
            <div :class="agencyFormFieldClass">
              <label :class="agencyFormLabelClass">Notes</label>
              <UTextarea v-model="profileDraft.notes" :rows="3" size="sm" class="w-full" />
            </div>
            <UButton
              label="Save profile"
              color="primary"
              size="sm"
              :loading="savingProfile"
              @click="emit('saveProfile')"
            />
          </div>

          <div v-else-if="activeTab === 'exemptions'" class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm text-muted">
                Waivers and adjustments for this member, plus team-wide holidays.
              </p>
              <UPopover v-model:open="exemptionFormOpen" :content="{ align: 'end' }">
                <UButton label="Add exemption" icon="i-lucide-plus" color="primary" size="sm" />
                <template #content>
                  <form class="w-80 space-y-4 p-4" @submit.prevent="emit('addExemption')">
                    <p class="text-sm font-bold text-highlighted">New exemption</p>
                    <div :class="agencyFormFieldClass">
                      <label :class="agencyFormLabelClass">Type</label>
                      <USelectMenu
                        v-model="exemptionDraft.type"
                        :items="[
                          { label: 'Team holiday quarter', value: 'team_holiday' },
                          { label: 'Member waiver', value: 'member_waiver' },
                          { label: 'Reduced minimum', value: 'member_reduced_min' },
                          { label: 'Frozen month', value: 'member_frozen_month' },
                        ]"
                        value-key="value"
                        label-key="label"
                        size="sm"
                        class="w-full"
                      />
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                      <div :class="agencyFormFieldClass">
                        <label :class="agencyFormLabelClass">Fiscal year</label>
                        <UInput
                          v-model="exemptionDraft.fiscalYear"
                          type="number"
                          size="sm"
                          class="w-full"
                        />
                      </div>
                      <div :class="agencyFormFieldClass">
                        <label :class="agencyFormLabelClass">Quarter</label>
                        <USelectMenu
                          v-model="exemptionDraft.fiscalQuarter"
                          :items="[
                            { label: 'Q1', value: '1' },
                            { label: 'Q2', value: '2' },
                            { label: 'Q3', value: '3' },
                            { label: 'Q4', value: '4' },
                          ]"
                          value-key="value"
                          label-key="label"
                          size="sm"
                          class="w-full"
                        />
                      </div>
                    </div>
                    <div
                      v-if="exemptionDraft.type === 'member_reduced_min'"
                      :class="agencyFormFieldClass"
                    >
                      <label :class="agencyFormLabelClass">Reduced min hours</label>
                      <UInput
                        v-model="exemptionDraft.reducedMinHours"
                        type="number"
                        min="1"
                        size="sm"
                        class="w-full"
                      />
                    </div>
                    <div
                      v-if="exemptionDraft.type === 'member_frozen_month'"
                      :class="agencyFormFieldClass"
                    >
                      <label :class="agencyFormLabelClass">Frozen month</label>
                      <USelectMenu
                        v-model="exemptionDraft.frozenMonth"
                        :items="[...FISCAL_MONTHS]"
                        value-key="value"
                        label-key="label"
                        size="sm"
                        class="w-full"
                      />
                    </div>
                    <div :class="agencyFormFieldClass">
                      <label :class="agencyFormLabelClass">Reason</label>
                      <UInput v-model="exemptionDraft.reason" size="sm" class="w-full" />
                    </div>
                    <UButton
                      type="submit"
                      label="Save exemption"
                      color="primary"
                      size="sm"
                      block
                      :loading="savingExemption"
                    />
                  </form>
                </template>
              </UPopover>
            </div>

            <ul v-if="exemptions.length > 0" class="divide-y divide-default">
              <li
                v-for="exemption in exemptions"
                :key="exemption.id"
                class="flex items-center justify-between gap-3 py-3 first:pt-0"
              >
                <div class="min-w-0 text-sm text-highlighted">
                  <p class="font-semibold">
                    FY{{ String(exemption.fiscalYear).slice(-2) }} Q{{ exemption.fiscalQuarter }}
                    · {{ exemption.type.replaceAll("_", " ") }}
                  </p>
                  <p v-if="exemption.type === 'team_holiday'" class="text-xs text-muted">
                    Applies to all members
                  </p>
                </div>
                <button
                  v-if="exemption.type !== 'team_holiday'"
                  type="button"
                  class="shrink-0 rounded-md p-1 text-dimmed hover:text-error"
                  :class="agencyFocusRingClass"
                  aria-label="Remove exemption"
                  @click="emit('removeExemption', exemption.id)"
                >
                  <UIcon name="i-lucide-trash-2" class="size-4" />
                </button>
              </li>
            </ul>
            <p v-else class="py-6 text-center text-sm text-muted">No exemptions for this member.</p>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
