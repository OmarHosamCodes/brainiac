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
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

import { getErrorMessage } from "~/utils/get-error-message";

const props = defineProps<{
  teamId: string;
}>();

const orpc = useOrpc();
const queryClient = useQueryClient();
const toast = useToast();

const teamId = computed(() => props.teamId);

type SettingsSection = "tags" | "rates" | "integrations" | "hues";
const section = ref<SettingsSection>("tags");

const sections: { id: SettingsSection; label: string; icon: string; status: "live" | "soon" }[] = [
  { id: "tags", label: "Tags", icon: "i-lucide-tag", status: "live" },
  { id: "rates", label: "Member rates", icon: "i-lucide-dollar-sign", status: "soon" },
  { id: "integrations", label: "Integrations", icon: "i-lucide-plug", status: "soon" },
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
const createTagMutation = useMutation(orpc.agencyOps.tags.create.mutationOptions());
const deleteTagMutation = useMutation(orpc.agencyOps.tags.delete.mutationOptions());

async function createTag() {
  const name = newTagName.value.trim();
  if (!name || !teamId.value) return;
  try {
    await createTagMutation.mutateAsync({ teamId: teamId.value, name });
    newTagName.value = "";
    await queryClient.invalidateQueries({
      queryKey: orpc.agencyOps.tags.list.queryOptions({ input: { teamId: teamId.value } })
        .queryKey,
    });
    toast.add({ title: "Tag created", description: name, color: "success" });
  } catch (error) {
    toast.add({
      title: "Couldn't create tag",
      description: getErrorMessage(error, "Try again."),
      color: "error",
    });
  }
}

async function deleteTag(tagId: string, tagName: string) {
  if (!teamId.value) return;
  try {
    await deleteTagMutation.mutateAsync({ teamId: teamId.value, tagId });
    await queryClient.invalidateQueries({
      queryKey: orpc.agencyOps.tags.list.queryOptions({ input: { teamId: teamId.value } })
        .queryKey,
    });
    toast.add({ title: "Tag removed", description: tagName, color: "success" });
  } catch (error) {
    toast.add({
      title: "Couldn't remove tag",
      description: getErrorMessage(error, "Try again."),
      color: "error",
    });
  }
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
        :class="
          section === entry.id ? 'border-default bg-elevated' : 'hover:bg-elevated/60'
        "
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
            :loading="createTagMutation.isPending.value"
            :disabled="!newTagName.trim()"
          />
        </form>

        <div v-if="tagsQuery.isPending.value" class="px-5 py-6">
          <div class="h-4 animate-pulse rounded-md bg-elevated/60" />
        </div>

        <ul
          v-else-if="tags.length > 0"
          class="flex flex-wrap gap-2 px-5 py-4"
        >
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
      <div
        v-else-if="section === 'rates'"
        class="rounded-2xl border border-default bg-default"
      >
        <header class="flex items-baseline justify-between border-b border-default px-5 py-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              Member rates
            </p>
            <h2 class="mt-1 text-base font-bold text-highlighted">
              Cost and billable rates per member
            </h2>
            <p class="mt-1 text-[11px] text-muted">
              Rates apply going forward, never retroactively. Override per project when a
              client negotiates a special rate.
            </p>
          </div>
        </header>

        <div v-if="ratesQuery.isPending.value" class="px-5 py-6">
          <div class="h-4 animate-pulse rounded-md bg-elevated/60" />
        </div>

        <div v-else-if="rates.length === 0" class="px-5 py-10 text-center">
          <UIcon name="i-lucide-dollar-sign" class="mx-auto size-6 text-muted" />
          <p class="mt-3 text-sm font-bold text-highlighted">No rates set yet.</p>
          <p class="mx-auto mt-1 max-w-md text-xs text-muted">
            Once a rate is set for each member, budget burn and invoicing turn on across
            Projects and Billing.
          </p>
        </div>

        <table v-else class="w-full text-xs">
          <thead class="bg-muted text-left text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            <tr>
              <th class="px-5 py-2.5 font-bold">Member</th>
              <th class="px-3 py-2.5 font-bold text-right">Cost rate</th>
              <th class="px-3 py-2.5 font-bold text-right">Billable rate</th>
              <th class="px-5 py-2.5 font-bold">Effective from</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="rate in rates"
              :key="rate.userId"
              class="border-b border-default last:border-b-0"
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
                {{ rate.effectiveFrom ? new Date(rate.effectiveFrom).toLocaleDateString() : "—" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Integrations (live, empty-shaped) -->
      <div
        v-else-if="section === 'integrations'"
        class="rounded-2xl border border-default bg-default"
      >
        <header class="border-b border-default px-5 py-4">
          <p class="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
            Integrations
          </p>
          <h2 class="mt-1 text-base font-bold text-highlighted">
            Push time and budgets to where your team works
          </h2>
        </header>

        <div v-if="integrationsQuery.isPending.value" class="px-5 py-6">
          <div class="h-4 animate-pulse rounded-md bg-elevated/60" />
        </div>

        <ul v-else class="grid gap-px bg-default/40 sm:grid-cols-2">
          <li
            v-for="integration in integrations"
            :key="integration.id"
            class="bg-default p-4"
          >
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
