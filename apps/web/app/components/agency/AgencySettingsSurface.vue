<script setup lang="ts">
/**
 * Agency Settings — left-rail subnav + section detail.
 *
 * Real today: Tags. Aspirational (honest empty states with shape teaching):
 * Member rates, Integrations, Project hue overrides.
 *
 * Pattern: every settings page in the app eventually lands on a left-rail
 * subnav. This surface rehearses that pattern from day one so it doesn't
 * have to be re-architected when more sections come online.
 */
import { useQuery } from "@tanstack/vue-query";

import { useAgencyOpsStore } from "~/stores/agency-ops";
const props = defineProps<{
  teamId: string;
}>();

const orpc = useOrpc();
const agencyOps = useAgencyOpsStore();

const teamId = computed(() => props.teamId);

type SettingsSection = "tags" | "rates" | "integrations" | "hues";
const section = ref<SettingsSection>("tags");

const sections: { id: SettingsSection; label: string; icon: string; status: "live" | "soon" }[] = [
  { id: "tags", label: "Tags", icon: "i-lucide-tag", status: "live" },
  { id: "rates", label: "Member rates", icon: "i-lucide-dollar-sign", status: "live" },
  { id: "integrations", label: "Integrations", icon: "i-lucide-plug", status: "live" },
  { id: "hues", label: "Project colors", icon: "i-lucide-palette", status: "soon" },
];

// Phase 4 stubs: rates and integrations now read from real oRPC procedures.
// Both return shaped-but-empty data today so the surfaces render their
// production composition with honest empty states.
const ratesQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.rates.list.queryOptions({ input: { teamId: teamId.value } }),
    enabled: Boolean(teamId.value) && section.value === "rates",
  })),
);

const integrationsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.integrations.list.queryOptions({ input: { teamId: teamId.value } }),
    enabled: Boolean(teamId.value) && section.value === "integrations",
  })),
);

const rates = computed(() => ratesQuery.data.value?.items ?? []);
const integrations = computed(() => integrationsQuery.data.value?.items ?? []);

// Inline rate editing
type RateEditDraft = {
  userId: string;
  costRateCents: string;
  billableRateCents: string;
  effectiveFrom: string;
};
const editingRateUserId = ref<string | null>(null);
const rateDraft = ref<RateEditDraft | null>(null);

function openRateEdit(rate: NonNullable<typeof ratesQuery.data.value>["items"][number]) {
  editingRateUserId.value = rate.userId;
  rateDraft.value = {
    userId: rate.userId,
    costRateCents: rate.costRateCents !== null ? String(Math.round(rate.costRateCents / 100)) : "",
    billableRateCents:
      rate.billableRateCents !== null ? String(Math.round(rate.billableRateCents / 100)) : "",
    effectiveFrom: rate.effectiveFrom
      ? new Date(rate.effectiveFrom).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  };
}

// For new rate — sentinel marks the "new row" open.
const newRateDraft = ref<{
  userId: string;
  costRateCents: string;
  billableRateCents: string;
  effectiveFrom: string;
}>({
  userId: "",
  costRateCents: "",
  billableRateCents: "",
  effectiveFrom: new Date().toISOString().slice(0, 10),
});

function openNewRateEdit() {
  editingRateUserId.value = "__new__";
  newRateDraft.value = {
    userId: "",
    costRateCents: "",
    billableRateCents: "",
    effectiveFrom: new Date().toISOString().slice(0, 10),
  };
}

function cancelRateEdit() {
  editingRateUserId.value = null;
  rateDraft.value = null;
}

async function saveRate() {
  if (!teamId.value || !rateDraft.value) return;
  const costCents = rateDraft.value.costRateCents
    ? Math.round(parseFloat(rateDraft.value.costRateCents) * 100)
    : null;
  const billableCents = rateDraft.value.billableRateCents
    ? Math.round(parseFloat(rateDraft.value.billableRateCents) * 100)
    : null;
  const effectiveFrom = rateDraft.value.effectiveFrom
    ? new Date(rateDraft.value.effectiveFrom).toISOString()
    : undefined;

  await agencyOps.upsertRate(
    {
      teamId: teamId.value,
      userId: rateDraft.value.userId,
      costRateCents: costCents,
      billableRateCents: billableCents,
      effectiveFrom,
    },
    { onSuccess: cancelRateEdit },
  );
}

async function saveNewRate() {
  if (!teamId.value || !newRateDraft.value.userId) return;
  const costCents = newRateDraft.value.costRateCents
    ? Math.round(parseFloat(newRateDraft.value.costRateCents) * 100)
    : null;
  const billableCents = newRateDraft.value.billableRateCents
    ? Math.round(parseFloat(newRateDraft.value.billableRateCents) * 100)
    : null;
  const effectiveFrom = newRateDraft.value.effectiveFrom
    ? new Date(newRateDraft.value.effectiveFrom).toISOString()
    : undefined;

  await agencyOps.upsertRate(
    {
      teamId: teamId.value,
      userId: newRateDraft.value.userId,
      costRateCents: costCents,
      billableRateCents: billableCents,
      effectiveFrom,
    },
    {
      onSuccess: () => {
        editingRateUserId.value = null;
        newRateDraft.value = {
          userId: "",
          costRateCents: "",
          billableRateCents: "",
          effectiveFrom: new Date().toISOString().slice(0, 10),
        };
      },
    },
  );
}

// Members list for the new-rate member selector.
// Derived from existing rates items — all team members appear in the list.
const membersWithoutRate = computed(() =>
  rates.value
    .filter((r) => r.costRateCents === null && r.billableRateCents === null)
    .map((r) => ({ label: r.userName, value: r.userId })),
);

function formatRate(cents: number | null, currency: string): string {
  if (cents === null) return "Not set";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

// --- Tags ---------------------------------------------------------------

const tagsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.tags.list.queryOptions({ input: { teamId: teamId.value } }),
    enabled: Boolean(teamId.value) && section.value === "tags",
  })),
);

const tags = computed(() => tagsQuery.data.value?.items ?? []);

const newTagName = ref("");

// Register tags query with the store for optimistic patches.
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
  <div class="agency-settings grid gap-4 lg:grid-cols-[14rem,1fr]">
    <!-- Left rail subnav -->
    <aside class="space-y-1">
      <button
        v-for="entry in sections"
        :key="entry.id"
        type="button"
        class="flex w-full items-center justify-between gap-2 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors"
        :class="section === entry.id ? 'border-default bg-elevated' : 'hover:bg-elevated/60'"
        @click="section = entry.id"
      >
        <span class="flex items-center gap-2">
          <UIcon :name="entry.icon" class="size-4 text-muted" />
          <span class="text-xs font-bold text-highlighted">{{ entry.label }}</span>
        </span>
        <span
          v-if="entry.status === 'soon'"
          class="text-[10px] font-bold uppercase tracking-[0.16em] text-dimmed"
        >
          Soon
        </span>
      </button>
    </aside>

    <!-- Detail -->
    <section>
      <!-- Tags (live) -->
      <div v-if="section === 'tags'" class="rounded-2xl border border-default bg-default">
        <header class="flex items-baseline justify-between border-b border-default px-5 py-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Tags</p>
            <h2 class="mt-1 text-base font-bold text-highlighted">
              Label time entries across projects
            </h2>
          </div>
        </header>

        <form
          class="flex items-center gap-2 border-b border-default px-5 py-4"
          @submit.prevent="createTag"
        >
          <UInput
            v-model="newTagName"
            placeholder="New tag (e.g. design, qa, meetings)"
            size="sm"
            class="flex-1"
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

        <div v-if="tagsQuery.isPending.value" class="px-5 py-6">
          <div class="h-4 animate-pulse rounded-md bg-elevated/60" />
        </div>

        <ul v-else-if="tags.length > 0" class="flex flex-wrap gap-2 px-5 py-4">
          <li
            v-for="tag in tags"
            :key="tag.id"
            class="group inline-flex items-center gap-1.5 rounded-full border border-default bg-muted px-3 py-1 text-xs font-bold text-highlighted"
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

        <div v-else class="px-5 py-8 text-center">
          <UIcon name="i-lucide-tag" class="mx-auto size-5 text-muted" />
          <p class="mt-2 text-xs text-muted">No tags yet. Add your first above.</p>
        </div>
      </div>

      <!-- Member rates (live, empty-shaped) -->
      <div v-else-if="section === 'rates'" class="rounded-2xl border border-default bg-default">
        <header class="flex items-baseline justify-between border-b border-default px-5 py-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Member rates</p>
            <h2 class="mt-1 text-base font-bold text-highlighted">
              Cost and billable rates per member
            </h2>
            <p class="mt-1 text-[11px] text-muted">
              Rates apply going forward, never retroactively. Override per project when a client
              negotiates a special rate.
            </p>
          </div>
        </header>

        <div v-if="ratesQuery.isPending.value" class="px-5 py-6">
          <div class="h-4 animate-pulse rounded-md bg-elevated/60" />
        </div>

        <div
          v-else-if="rates.length === 0 && editingRateUserId !== '__new__'"
          class="px-5 py-10 text-center"
        >
          <UIcon name="i-lucide-dollar-sign" class="mx-auto size-6 text-muted" />
          <p class="mt-3 text-sm font-bold text-highlighted">No rates set yet.</p>
          <p class="mx-auto mt-1 max-w-md text-xs text-muted">
            Once a rate is set for each member, budget burn and invoicing turn on across Projects
            and Billing.
          </p>
          <UButton
            label="Set a rate"
            color="neutral"
            variant="soft"
            size="xs"
            icon="i-lucide-plus"
            class="mt-4"
            @click="openNewRateEdit"
          />
        </div>

        <template v-else>
          <!-- Existing rates table -->
          <table v-if="rates.length > 0" class="w-full text-xs">
            <thead
              class="bg-muted text-left text-[10px] font-bold uppercase tracking-[0.16em] text-muted"
            >
              <tr>
                <th class="px-5 py-2.5 font-bold">Member</th>
                <th class="px-3 py-2.5 font-bold text-right">Cost rate</th>
                <th class="px-3 py-2.5 font-bold text-right">Billable rate</th>
                <th class="px-5 py-2.5 font-bold">Effective from</th>
                <th class="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              <template v-for="rate in rates" :key="rate.userId">
                <!-- Read-only row -->
                <tr
                  v-if="editingRateUserId !== rate.userId"
                  class="group border-b border-default last:border-b-0"
                >
                  <td class="px-5 py-3">
                    <p class="truncate font-bold text-highlighted">{{ rate.userName }}</p>
                    <p class="truncate text-[11px] text-muted">{{ rate.userEmail }}</p>
                  </td>
                  <td class="px-3 py-3 text-right font-mono tabular-nums text-muted">
                    {{ formatRate(rate.costRateCents, rate.currency) }}
                  </td>
                  <td class="px-3 py-3 text-right font-mono tabular-nums text-highlighted">
                    {{ formatRate(rate.billableRateCents, rate.currency) }}
                  </td>
                  <td class="px-5 py-3 text-muted">
                    {{
                      rate.effectiveFrom ? new Date(rate.effectiveFrom).toLocaleDateString() : "—"
                    }}
                  </td>
                  <td class="px-3 py-3 text-right">
                    <button
                      type="button"
                      class="inline-flex size-6 items-center justify-center rounded-md text-dimmed opacity-0 transition-opacity hover:text-muted group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      aria-label="Edit rate"
                      @click="openRateEdit(rate)"
                    >
                      <UIcon name="i-lucide-pencil" class="size-3.5" />
                    </button>
                  </td>
                </tr>
                <!-- Inline edit row -->
                <tr v-else class="border-b border-primary/20 bg-primary/[0.02] last:border-b-0">
                  <td class="px-5 py-3">
                    <p class="truncate font-bold text-highlighted">{{ rate.userName }}</p>
                    <p class="truncate text-[11px] text-muted">{{ rate.userEmail }}</p>
                  </td>
                  <td class="px-3 py-2">
                    <div class="flex items-center gap-1">
                      <UInput
                        v-if="rateDraft"
                        v-model="rateDraft.costRateCents"
                        type="number"
                        min="0"
                        placeholder="0"
                        size="xs"
                        class="w-20 text-right"
                        disabled
                      />
                      <span class="text-[11px] text-muted">/hr</span>
                    </div>
                  </td>
                  <td class="px-3 py-2">
                    <div class="flex items-center gap-1">
                      <UInput
                        v-if="rateDraft"
                        v-model="rateDraft.billableRateCents"
                        type="number"
                        min="0"
                        placeholder="0"
                        size="xs"
                        class="w-20 text-right"
                        disabled
                      />
                      <span class="text-[11px] text-muted">/hr</span>
                    </div>
                  </td>
                  <td class="px-5 py-2">
                    <UInput
                      v-if="rateDraft"
                      v-model="rateDraft.effectiveFrom"
                      type="date"
                      size="xs"
                      class="w-32"
                      disabled
                    />
                  </td>
                  <td class="px-3 py-2">
                    <div class="flex items-center gap-1">
                      <UTooltip text="Rate editing will be available in a future release">
                        <UButton label="Save" color="primary" size="xs" disabled />
                      </UTooltip>
                      <UButton
                        icon="i-lucide-x"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        square
                        aria-label="Cancel"
                        @click="cancelRateEdit"
                      />
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>

          <!-- New rate inline form -->
          <div
            v-if="editingRateUserId === '__new__'"
            class="border-t border-primary/20 bg-primary/[0.02] px-5 py-3"
          >
            <p class="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              New rate
            </p>
            <div class="flex flex-wrap items-end gap-3">
              <div>
                <label class="text-[11px] font-bold text-muted">Member</label>
                <USelectMenu
                  :items="[]"
                  placeholder="Select member"
                  size="xs"
                  disabled
                  class="mt-1 w-36"
                />
              </div>
              <div>
                <label class="text-[11px] font-bold text-muted">Cost rate /hr</label>
                <UInput
                  type="number"
                  min="0"
                  placeholder="0"
                  size="xs"
                  class="mt-1 w-20"
                  disabled
                />
              </div>
              <div>
                <label class="text-[11px] font-bold text-muted">Billable rate /hr</label>
                <UInput
                  type="number"
                  min="0"
                  placeholder="0"
                  size="xs"
                  class="mt-1 w-20"
                  disabled
                />
              </div>
              <div>
                <label class="text-[11px] font-bold text-muted">Effective from</label>
                <UInput
                  type="date"
                  :value="new Date().toISOString().slice(0, 10)"
                  size="xs"
                  class="mt-1 w-32"
                  disabled
                />
              </div>
              <div class="flex items-center gap-2">
                <UTooltip text="Rate editing will be available in a future release">
                  <UButton label="Save" color="primary" size="xs" disabled />
                </UTooltip>
                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  aria-label="Cancel"
                  @click="cancelRateEdit"
                />
              </div>
            </div>
          </div>

          <!-- Add rate footer -->
          <div
            v-if="rates.length > 0 && editingRateUserId !== '__new__'"
            class="border-t border-default px-5 py-3"
          >
            <UButton
              label="Set a rate"
              icon="i-lucide-plus"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="openNewRateEdit"
            />
          </div>
        </template>
      </div>

      <!-- Integrations (live, empty-shaped) -->
      <div
        v-else-if="section === 'integrations'"
        class="rounded-2xl border border-default bg-default"
      >
        <header class="border-b border-default px-5 py-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Integrations</p>
          <h2 class="mt-1 text-base font-bold text-highlighted">
            Push time and budgets to where your team works
          </h2>
        </header>

        <div v-if="integrationsQuery.isPending.value" class="px-5 py-6">
          <div class="h-4 animate-pulse rounded-md bg-elevated/60" />
        </div>

        <ul v-else class="grid gap-px bg-default/40 sm:grid-cols-2">
          <li v-for="integration in integrations" :key="integration.id" class="bg-default p-4">
            <div class="flex items-baseline justify-between gap-3">
              <p class="truncate text-sm font-bold text-highlighted">
                {{ integration.name }}
              </p>
              <span
                class="inline-flex items-center gap-1.5 rounded-full border border-default bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]"
                :class="integration.status === 'connected' ? 'text-success' : 'text-dimmed'"
              >
                <span
                  class="inline-block size-1.5 rounded-full"
                  :class="integration.status === 'connected' ? 'bg-success' : 'bg-muted'"
                  aria-hidden="true"
                />
                {{ integration.status === "connected" ? "Connected" : "Available" }}
              </span>
            </div>
            <p class="mt-1 text-[11px] text-muted">{{ integration.description }}</p>
            <UButton
              :label="integration.status === 'connected' ? 'Manage' : 'Connect'"
              color="neutral"
              variant="soft"
              size="xs"
              class="mt-3"
              :disabled="integration.status !== 'connected'"
            />
          </li>
        </ul>
      </div>

      <!-- Project hues (aspirational) -->
      <div
        v-else-if="section === 'hues'"
        class="rounded-2xl border border-dashed border-default bg-muted/20 p-8"
      >
        <UIcon name="i-lucide-palette" class="size-6 text-muted" />
        <h2 class="mt-3 text-base font-bold text-highlighted">Project colors</h2>
        <p class="mt-1 text-xs text-muted">
          Each project gets a stable color, auto-assigned from a 12-hue palette. Once override
          ships, you'll be able to lock a hue per project here.
        </p>
        <p class="mt-4 text-[11px] text-dimmed">
          The palette is OKLCH-based and tuned for both light and dark themes.
        </p>
      </div>
    </section>
  </div>
</template>
