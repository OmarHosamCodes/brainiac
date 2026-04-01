<script setup lang="ts">
import type { WorkspaceAgencyTimeReportsBlock } from "@brainiac/workspace";
import { useMutation, useQuery } from "@tanstack/vue-query";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { getErrorMessage } from "~/utils/get-error-message";

const props = defineProps<{
  block: WorkspaceAgencyTimeReportsBlock;
  tabId: string;
}>();

const { currentNode, mutateBlock } = useWorkspaceNodeEditorContext();
const orpc = useOrpc();
const toast = useToast();

const teamsQuery = useQuery(orpc.team.list.queryOptions());
const teams = computed(() => teamsQuery.data.value?.items ?? []);
const teamsById = computed(() => new Map(teams.value.map((team) => [team.id, team])));
const preferredTeamId = computed(() => props.block.teamId ?? currentNode.value?.teamId ?? "");
const selectedTeamIsUnavailable = computed(
  () => Boolean(preferredTeamId.value) && !teamsById.value.has(preferredTeamId.value),
);
const effectiveTeamId = computed(() => {
  if (!preferredTeamId.value) {
    return teams.value[0]?.id ?? "";
  }

  if (!teamsById.value.has(preferredTeamId.value)) {
    return "";
  }

  return preferredTeamId.value;
});
const effectiveTeamRole = computed(() => teamsById.value.get(effectiveTeamId.value)?.role ?? null);
const canAccessReports = computed(() => effectiveTeamRole.value === "owner");

const presetOptions = [
  { label: "This week", value: "this-week" },
  { label: "Last month", value: "last-month" },
  { label: "Year to date", value: "year-to-date" },
  { label: "Custom", value: "custom" },
] satisfies Array<{
  label: string;
  value: WorkspaceAgencyTimeReportsBlock["datePreset"];
}>;

const clientsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.clients.list.queryOptions({
      input: {
        teamId: effectiveTeamId.value,
        includeArchived: true,
      },
    }),
    enabled: Boolean(effectiveTeamId.value),
  })),
);

const projectsQuery = useQuery(
  computed(() => ({
    ...orpc.agencyOps.projects.list.queryOptions({
      input: {
        teamId: effectiveTeamId.value,
        includeArchived: true,
        ...(props.block.selectedClientId ? { clientId: props.block.selectedClientId } : {}),
      },
    }),
    enabled: Boolean(effectiveTeamId.value),
  })),
);

const teamDetailQuery = useQuery(
  computed(() => ({
    ...orpc.team.get.queryOptions({
      input: {
        teamId: effectiveTeamId.value,
      },
    }),
    enabled: Boolean(effectiveTeamId.value),
  })),
);

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPresetDateRange(preset: WorkspaceAgencyTimeReportsBlock["datePreset"]) {
  const now = new Date();

  if (preset === "this-week") {
    const start = new Date(now);
    const day = start.getDay();
    const distanceFromMonday = (day + 6) % 7;
    start.setDate(start.getDate() - distanceFromMonday);

    return {
      fromDate: formatDateInput(start),
      toDate: formatDateInput(now),
    };
  }

  if (preset === "last-month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);

    return {
      fromDate: formatDateInput(start),
      toDate: formatDateInput(end),
    };
  }

  if (preset === "year-to-date") {
    const start = new Date(now.getFullYear(), 0, 1);

    return {
      fromDate: formatDateInput(start),
      toDate: formatDateInput(now),
    };
  }

  return {
    fromDate: props.block.fromDate,
    toDate: props.block.toDate,
  };
}

const resolvedDateRange = computed(() => {
  const range = getPresetDateRange(props.block.datePreset);

  if (!range.fromDate || !range.toDate) {
    return null;
  }

  const from = new Date(`${range.fromDate}T00:00:00`);
  const to = new Date(`${range.toDate}T23:59:59`);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return null;
  }

  return {
    fromDate: range.fromDate,
    toDate: range.toDate,
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
  };
});

const reportInput = computed(() => {
  if (!effectiveTeamId.value || !resolvedDateRange.value || !canAccessReports.value) {
    return null;
  }

  return {
    teamId: effectiveTeamId.value,
    from: resolvedDateRange.value.fromIso,
    to: resolvedDateRange.value.toIso,
    ...(props.block.selectedClientId ? { clientId: props.block.selectedClientId } : {}),
    ...(props.block.selectedProjectId ? { projectId: props.block.selectedProjectId } : {}),
    ...(props.block.selectedMemberUserId ? { memberUserId: props.block.selectedMemberUserId } : {}),
  };
});

const summaryQuery = useQuery(
  computed(() => {
    if (!reportInput.value) {
      return {
        ...orpc.agencyOps.reports.summary.queryOptions({
          input: {
            teamId: "pending",
            from: new Date(0).toISOString(),
            to: new Date(0).toISOString(),
          },
        }),
        enabled: false,
      };
    }

    return {
      ...orpc.agencyOps.reports.summary.queryOptions({
        input: reportInput.value,
      }),
      enabled: true,
    };
  }),
);

const exportCsvMutation = useMutation(orpc.agencyOps.reports.exportCsv.mutationOptions());

const clients = computed(() => clientsQuery.data.value?.items ?? []);
const projects = computed(() => projectsQuery.data.value?.items ?? []);
const members = computed(() => teamDetailQuery.data.value?.members ?? []);
const summary = computed(() => summaryQuery.data.value?.summary ?? null);

function updateBlock(mutator: (block: WorkspaceAgencyTimeReportsBlock) => void) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "agency-time-reports") {
      return;
    }

    mutator(block);
  });
}

function setTeamId(teamId: string | undefined) {
  updateBlock((block) => {
    block.teamId = teamId || null;
    block.selectedClientId = null;
    block.selectedProjectId = null;
    block.selectedMemberUserId = null;
  });
}

function setDatePreset(value: WorkspaceAgencyTimeReportsBlock["datePreset"]) {
  updateBlock((block) => {
    block.datePreset = value;

    if (value !== "custom") {
      const range = getPresetDateRange(value);
      block.fromDate = range.fromDate ?? null;
      block.toDate = range.toDate ?? null;
    }
  });
}

function setCustomFromDate(value: string | undefined) {
  updateBlock((block) => {
    block.fromDate = value || null;
  });
}

function setCustomToDate(value: string | undefined) {
  updateBlock((block) => {
    block.toDate = value || null;
  });
}

function setSelectedClient(clientId: string | undefined) {
  updateBlock((block) => {
    block.selectedClientId = clientId || null;
    block.selectedProjectId = null;
  });
}

function setSelectedProject(projectId: string | undefined) {
  updateBlock((block) => {
    block.selectedProjectId = projectId || null;
  });
}

function setSelectedMember(memberUserId: string | undefined) {
  updateBlock((block) => {
    block.selectedMemberUserId = memberUserId || null;
  });
}

function formatHours(value: number) {
  return `${value.toFixed(2)}h`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function getBurnBadgeColor(burnPercent: number) {
  if (burnPercent >= 100) {
    return "error" as const;
  }

  if (burnPercent >= 80) {
    return "warning" as const;
  }

  return "success" as const;
}

async function exportCsv() {
  if (!reportInput.value || !canAccessReports.value) {
    return;
  }

  try {
    const payload = await exportCsvMutation.mutateAsync(reportInput.value);

    if (!import.meta.client) {
      return;
    }

    const blob = new Blob([payload.csv], { type: payload.contentType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = payload.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    toast.add({
      title: "CSV export failed",
      description: getErrorMessage(error, "Please try again."),
      color: "error",
    });
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="grid gap-3 rounded-3xl border border-muted/20 bg-elevated/10 p-4 md:grid-cols-2 xl:grid-cols-4">
      <UFormField label="Team binding" size="sm">
        <USelect
          :model-value="effectiveTeamId"
          :items="teams.map((team) => ({ label: `${team.name} (${team.role})`, value: team.id }))"
          placeholder="Select a team"
          size="sm"
          @update:model-value="setTeamId($event as string | undefined)"
        />
      </UFormField>

      <UFormField label="Date preset" size="sm">
        <USelect
          :model-value="block.datePreset"
          :items="presetOptions"
          size="sm"
          @update:model-value="setDatePreset(($event as WorkspaceAgencyTimeReportsBlock['datePreset'] | undefined) ?? 'this-week')"
        />
      </UFormField>

      <UFormField label="Client" size="sm">
        <USelect
          :model-value="block.selectedClientId ?? ''"
          :items="[
            { label: 'All clients', value: '' },
            ...clients.map((client) => ({ label: client.name, value: client.id })),
          ]"
          size="sm"
          :disabled="!effectiveTeamId"
          @update:model-value="setSelectedClient($event as string | undefined)"
        />
      </UFormField>

      <UFormField label="Project" size="sm">
        <USelect
          :model-value="block.selectedProjectId ?? ''"
          :items="[
            { label: 'All projects', value: '' },
            ...projects.map((project) => ({ label: `${project.name} · ${project.clientName}`, value: project.id })),
          ]"
          size="sm"
          :disabled="!effectiveTeamId"
          @update:model-value="setSelectedProject($event as string | undefined)"
        />
      </UFormField>
    </div>

    <div v-if="block.datePreset === 'custom'" class="grid gap-3 rounded-3xl border border-muted/20 bg-elevated/10 p-4 md:grid-cols-2">
      <UFormField label="From date" size="sm">
        <UInput
          :model-value="block.fromDate ?? ''"
          type="date"
          @update:model-value="setCustomFromDate($event as string | undefined)"
        />
      </UFormField>
      <UFormField label="To date" size="sm">
        <UInput
          :model-value="block.toDate ?? ''"
          type="date"
          @update:model-value="setCustomToDate($event as string | undefined)"
        />
      </UFormField>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <UFormField label="Member" size="sm" class="max-w-sm flex-1">
        <USelect
          :model-value="block.selectedMemberUserId ?? ''"
          :items="[
            { label: 'All members', value: '' },
            ...members.map((member) => ({
              label: `${member.userName} (${member.role})`,
              value: member.userId,
            })),
          ]"
          size="sm"
          :disabled="!effectiveTeamId"
          @update:model-value="setSelectedMember($event as string | undefined)"
        />
      </UFormField>

      <UButton
        color="primary"
        variant="soft"
        icon="i-lucide-download"
        :loading="exportCsvMutation.isPending.value"
        :disabled="!reportInput"
        @click="exportCsv"
      >
        Export CSV
      </UButton>
    </div>

    <UAlert
      v-if="!effectiveTeamId"
      color="warning"
      variant="soft"
      icon="i-lucide-users-round"
      :title="selectedTeamIsUnavailable ? 'Team access unavailable' : 'Team required'"
      :description="
        selectedTeamIsUnavailable
          ? 'Your current team binding is no longer available. Select a team you belong to before running analytics.'
          : 'Bind this reports block to a team before running analytics.'
      "
    />

    <UAlert
      v-else-if="!canAccessReports"
      color="warning"
      variant="soft"
      icon="i-lucide-shield-alert"
      title="Owner role required"
      description="Reports are restricted to team owners. Switch to a team where you are an owner to view analytics or export CSV."
    />

    <UAlert
      v-else-if="!resolvedDateRange"
      color="warning"
      variant="soft"
      icon="i-lucide-calendar-x-2"
      title="Invalid date range"
      description="Set a valid date range to load reports."
    />

    <template v-else-if="summary">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-3xl border border-primary/20 bg-primary/10 p-4">
          <p class="text-xs uppercase tracking-[0.16em] text-primary/80">Total hours</p>
          <p class="mt-1 text-2xl font-black tracking-tight text-primary">{{ formatHours(summary.totalHours) }}</p>
        </div>
        <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-4">
          <p class="text-xs uppercase tracking-[0.16em] text-muted">Entries</p>
          <p class="mt-1 text-2xl font-black tracking-tight text-highlighted">{{ summary.totalEntries }}</p>
        </div>
        <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-4">
          <p class="text-xs uppercase tracking-[0.16em] text-muted">Projects tracked</p>
          <p class="mt-1 text-2xl font-black tracking-tight text-highlighted">{{ summary.timeDistributionByProject.length }}</p>
        </div>
        <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-4">
          <p class="text-xs uppercase tracking-[0.16em] text-muted">Active members</p>
          <p class="mt-1 text-2xl font-black tracking-tight text-highlighted">{{ summary.teamActivity.length }}</p>
        </div>
      </div>

      <section class="space-y-3 rounded-3xl border border-muted/20 bg-elevated/10 p-4">
        <h3 class="text-sm font-semibold text-highlighted">Project burn</h3>
        <article
          v-for="project in summary.burnByProject"
          :key="project.projectId"
          class="rounded-2xl border border-muted/20 bg-default/70 p-3"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p class="text-sm font-medium text-highlighted">{{ project.projectName }}</p>
              <p class="text-xs text-muted">{{ project.clientName }}</p>
            </div>
            <UBadge :color="getBurnBadgeColor(project.burnPercent)" variant="soft">
              {{ formatPercent(project.burnPercent) }}
            </UBadge>
          </div>
          <p class="mt-1 text-xs text-toned">
            {{ formatHours(project.loggedHours) }} logged / {{ formatHours(project.budgetHours) }} budget
          </p>
        </article>
      </section>

      <div class="grid gap-4 xl:grid-cols-2">
        <section class="space-y-3 rounded-3xl border border-muted/20 bg-elevated/10 p-4">
          <h3 class="text-sm font-semibold text-highlighted">By client</h3>
          <article
            v-for="entry in summary.timeDistributionByClient"
            :key="entry.clientId"
            class="flex items-center justify-between rounded-2xl border border-muted/20 bg-default/70 px-3 py-2"
          >
            <p class="text-sm text-toned">{{ entry.clientName }}</p>
            <UBadge color="neutral" variant="soft">{{ formatHours(entry.hours) }}</UBadge>
          </article>
        </section>

        <section class="space-y-3 rounded-3xl border border-muted/20 bg-elevated/10 p-4">
          <h3 class="text-sm font-semibold text-highlighted">Team activity</h3>
          <article
            v-for="member in summary.teamActivity"
            :key="member.userEmail"
            class="flex items-center justify-between rounded-2xl border border-muted/20 bg-default/70 px-3 py-2"
          >
            <div>
              <p class="text-sm text-toned">{{ member.userName }}</p>
              <p class="text-xs text-muted">{{ member.userEmail }}</p>
            </div>
            <UBadge color="neutral" variant="soft">{{ formatHours(member.hours) }}</UBadge>
          </article>
        </section>
      </div>
    </template>
  </div>
</template>
