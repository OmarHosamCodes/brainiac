<script setup lang="ts">
import {
  agencyFocusRingClass,
  agencyFormFieldClass,
  agencyFormLabelClass,
  agencyPanelClass,
} from "~/utils/agency-ui";

import { FISCAL_MONTHS, type FiscalMonth } from "./tenure-utils";

export type TenurePolicyDraft = {
  fiscalYearStartMonth: FiscalMonth;
  fiscalYearStartDay: string;
  quarterlyMinHours: string;
  penaltyMonths: string;
  internDurationMonths: string;
  internDurationWeeks: string;
  policyEffectiveFrom: string;
  enabled: boolean;
};

defineProps<{
  isOwner: boolean;
  fiscalYearPreview: string;
  saving: boolean;
}>();

const emit = defineEmits<{
  save: [];
}>();

const policyDraft = defineModel<TenurePolicyDraft>("policyDraft", { required: true });

const advancedOpen = ref(false);
</script>

<template>
  <section v-if="isOwner" :class="agencyPanelClass" class="p-5 sm:p-6">
    <h3 class="text-sm font-bold text-highlighted">Team policy</h3>
    <p class="mt-1 text-sm text-muted">
      Each fiscal month runs from the start day through the day before the next period (UTC).
    </p>

    <form class="mt-5 space-y-5" @submit.prevent="emit('save')">
      <div class="grid gap-4 sm:grid-cols-2">
        <div :class="agencyFormFieldClass">
          <label :class="agencyFormLabelClass">Fiscal year starts</label>
          <USelectMenu
            :model-value="policyDraft.fiscalYearStartMonth"
            :items="[...FISCAL_MONTHS]"
            value-key="value"
            label-key="label"
            size="sm"
            class="w-full"
            @update:model-value="
              (value) => {
                policyDraft.fiscalYearStartMonth = Number(value) as FiscalMonth;
              }
            "
          />
        </div>

        <div :class="agencyFormFieldClass">
          <label :class="agencyFormLabelClass">Start day</label>
          <UInput
            v-model="policyDraft.fiscalYearStartDay"
            type="number"
            min="1"
            max="31"
            size="sm"
            class="w-full max-w-[8rem]"
          />
        </div>

        <div :class="agencyFormFieldClass">
          <label :class="agencyFormLabelClass">Min hours per quarter</label>
          <UInput
            v-model="policyDraft.quarterlyMinHours"
            type="number"
            min="1"
            size="sm"
            class="w-full max-w-[10rem]"
          />
        </div>

        <div :class="agencyFormFieldClass">
          <label :class="agencyFormLabelClass">Effective from</label>
          <UInput
            v-model="policyDraft.policyEffectiveFrom"
            type="date"
            size="sm"
            class="w-full max-w-[14rem]"
          />
        </div>
      </div>

      <p class="text-sm text-muted">{{ fiscalYearPreview }}</p>

      <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
        <UCheckbox v-model="policyDraft.enabled" label="Enable tenure tracking" />
        <UButton type="submit" label="Save policy" color="primary" size="sm" :loading="saving" />
      </div>

      <div class="border-t border-default pt-4">
        <button
          type="button"
          class="flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-highlighted"
          :class="agencyFocusRingClass"
          :aria-expanded="advancedOpen"
          @click="advancedOpen = !advancedOpen"
        >
          <UIcon
            name="i-lucide-chevron-right"
            class="size-4 transition-transform"
            :class="advancedOpen ? 'rotate-90' : ''"
          />
          Advanced
        </button>

        <div v-show="advancedOpen" class="mt-4 grid gap-4 sm:grid-cols-2">
          <div :class="agencyFormFieldClass">
            <label :class="agencyFormLabelClass">Intern duration (months)</label>
            <UInput
              v-model="policyDraft.internDurationMonths"
              type="number"
              min="0"
              size="sm"
              class="w-full max-w-[10rem]"
            />
          </div>

          <div :class="agencyFormFieldClass">
            <label :class="agencyFormLabelClass">Extra intern weeks</label>
            <UInput
              v-model="policyDraft.internDurationWeeks"
              type="number"
              min="0"
              size="sm"
              class="w-full max-w-[10rem]"
            />
          </div>

          <div :class="[agencyFormFieldClass, 'sm:col-span-2']">
            <label :class="agencyFormLabelClass">Penalty per missed quarter (months)</label>
            <UInput
              v-model="policyDraft.penaltyMonths"
              type="number"
              min="1"
              size="sm"
              class="w-full max-w-[10rem]"
            />
          </div>
        </div>
      </div>
    </form>
  </section>
</template>
