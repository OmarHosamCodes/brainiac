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

      <!-- Member rates (aspirational) -->
      <div
        v-else-if="section === 'rates'"
        class="rounded-2xl border border-dashed border-default bg-muted/20 p-8"
      >
        <UIcon name="i-lucide-dollar-sign" class="size-6 text-muted" />
        <h2 class="mt-3 text-base font-bold text-highlighted">Member rates</h2>
        <p class="mt-1 text-xs text-muted">
          Set hourly rates per member to power budget burn and invoicing. Rates apply going
          forward, never retroactively.
        </p>
        <ul class="mt-5 space-y-2 text-xs text-muted">
          <li class="flex items-start gap-2">
            <UIcon name="i-lucide-corner-down-right" class="size-3.5 shrink-0 text-dimmed mt-0.5" />
            <span>One internal rate (cost) and one billable rate per member.</span>
          </li>
          <li class="flex items-start gap-2">
            <UIcon name="i-lucide-corner-down-right" class="size-3.5 shrink-0 text-dimmed mt-0.5" />
            <span>Override per project when a client negotiates a special rate.</span>
          </li>
          <li class="flex items-start gap-2">
            <UIcon name="i-lucide-corner-down-right" class="size-3.5 shrink-0 text-dimmed mt-0.5" />
            <span>Effective dates so historical reports stay accurate.</span>
          </li>
        </ul>
      </div>

      <!-- Integrations (aspirational) -->
      <div
        v-else-if="section === 'integrations'"
        class="rounded-2xl border border-dashed border-default bg-muted/20 p-8"
      >
        <UIcon name="i-lucide-plug" class="size-6 text-muted" />
        <h2 class="mt-3 text-base font-bold text-highlighted">Integrations</h2>
        <p class="mt-1 text-xs text-muted">
          Push time and budgets out to where your team already works.
        </p>
        <ul class="mt-5 grid gap-2 text-xs sm:grid-cols-2">
          <li class="rounded-xl border border-default bg-default px-3 py-3">
            <p class="font-bold text-highlighted">Slack</p>
            <p class="mt-1 text-muted">Daily totals and budget warnings in your channel.</p>
          </li>
          <li class="rounded-xl border border-default bg-default px-3 py-3">
            <p class="font-bold text-highlighted">Calendar</p>
            <p class="mt-1 text-muted">Suggest entries from Google or Outlook events.</p>
          </li>
          <li class="rounded-xl border border-default bg-default px-3 py-3">
            <p class="font-bold text-highlighted">QuickBooks · Xero</p>
            <p class="mt-1 text-muted">Send invoices straight to your books.</p>
          </li>
          <li class="rounded-xl border border-default bg-default px-3 py-3">
            <p class="font-bold text-highlighted">Webhooks</p>
            <p class="mt-1 text-muted">Stream entries into anything you already script.</p>
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
