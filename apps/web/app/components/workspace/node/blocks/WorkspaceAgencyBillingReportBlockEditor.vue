<script setup lang="ts">
import type { WorkspaceAgencyBillingReportBlock } from "@brainiac/workspace";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";
import { getErrorMessage } from "~/utils/get-error-message";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgencyTag = { id: string; name: string };

type AgencyTimeEntry = {
    id: string;
    userId: string;
    userName: string;
    projectId: string;
    projectName: string;
    clientId: string;
    clientName: string;
    tags: AgencyTag[];
    source: string;
    description: string;
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
};

type FlagReason = "zero-duration" | "missing-description" | "long-entry" | "ai-flag";

// ─── Props ────────────────────────────────────────────────────────────────────

const props = defineProps<{
    block: WorkspaceAgencyBillingReportBlock;
    tabId: string;
}>();

// ─── Context + composables ────────────────────────────────────────────────────

const { mutateTypedBlock } = useWorkspaceNodeEditorContext();
const orpc = useOrpc();
const toast = useToast();
const queryClient = useQueryClient();
const authSession = useAuthSession();
const authEnabled = computed(() => Boolean(authSession.value?.data?.user));

// ─── Block state (reactive mirrors of block props) ────────────────────────────

const periodOffset = ref(props.block.periodOffset ?? 0);
const billingStartDay = ref(props.block.billingPeriodStartDay ?? 1);
const billingEndDay = ref(props.block.billingPeriodEndDay ?? 28);
const reviewedEntryIds = ref<string[]>(props.block.reviewedEntryIds ?? []);
const selectedClientId = ref(props.block.selectedClientId ?? "");
const selectedProjectId = ref(props.block.selectedProjectId ?? "");
const selectedMemberUserId = ref(props.block.selectedMemberUserId ?? "");
const page = ref(1);
const pageSize = ref(props.block.pageSize ?? 25);

// ─── UI state ─────────────────────────────────────────────────────────────────

const editingEntryId = ref<string | null>(null);
const editDraft = ref<Partial<AgencyTimeEntry & { startAt: string; endAt: string }>>({});
const aiFlags = ref<Map<string, FlagReason>>(new Map());
const isAiScanning = ref(false);
const showSettings = ref(false);

// ─── Billing period computation ───────────────────────────────────────────────

/**
 * Given a period offset (0 = current, -1 = previous, etc.), returns the
 * UTC-based start and end Date objects for that billing period.
 *
 * Logic: Find the most recent occurrence of billingStartDay in the past
 * (or today), then offset by N months.
 */
const billingPeriod = computed(() => {
    const now = new Date();
    const startDay = billingStartDay.value;
    const endDay = billingEndDay.value;
    const offset = periodOffset.value;

    // Determine the "anchor month" — the month for periodOffset=0
    let year = now.getUTCFullYear();
    let month = now.getUTCMonth(); // 0-indexed

    // If today's date is before billingStartDay, the current period started
    // in the previous month
    if (now.getUTCDate() < startDay) {
        month -= 1;
        if (month < 0) {
            month = 11;
            year -= 1;
        }
    }

    // Apply the offset
    month += offset;
    while (month < 0) {
        month += 12;
        year -= 1;
    }
    while (month > 11) {
        month -= 12;
        year += 1;
    }

    const from = new Date(Date.UTC(year, month, startDay, 0, 0, 0, 0));

    // End date: endDay of the same or next month
    let endMonth = month;
    let endYear = year;
    if (endDay < startDay) {
        // Period wraps into next month
        endMonth += 1;
        if (endMonth > 11) {
            endMonth = 0;
            endYear += 1;
        }
    }
    const to = new Date(Date.UTC(endYear, endMonth, endDay, 23, 59, 59, 999));

    return { from, to };
});

const periodLabel = computed(() => {
    const { from, to } = billingPeriod.value;
    const fmt = (d: Date) =>
        d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
        });
    return `${fmt(from)} – ${fmt(to)}`;
});

// ─── Data queries ─────────────────────────────────────────────────────────────

const teamsQuery = useQuery(
    computed(() => ({
        ...orpc.team.list.queryOptions(),
        enabled: authEnabled.value,
    })),
);

const teams = computed(() => teamsQuery.data.value?.items ?? []);
const effectiveTeamId = computed(() => props.block.teamId || teams.value[0]?.id || "");

const clientsQuery = useQuery(
    computed(() => ({
        ...orpc.agencyOps.clients.list.queryOptions({ input: { teamId: effectiveTeamId.value } }),
        enabled: Boolean(effectiveTeamId.value),
    })),
);
const clients = computed(() => clientsQuery.data.value?.items ?? []);

const projectsQuery = useQuery(
    computed(() => ({
        ...orpc.agencyOps.projects.list.queryOptions({
            input: {
                teamId: effectiveTeamId.value,
                clientId: selectedClientId.value || undefined,
            },
        }),
        enabled: Boolean(effectiveTeamId.value),
    })),
);
const projects = computed(() => projectsQuery.data.value?.items ?? []);

const tagsQuery = useQuery(
    computed(() => ({
        ...orpc.agencyOps.tags.list.queryOptions({ input: { teamId: effectiveTeamId.value } }),
        enabled: Boolean(effectiveTeamId.value),
    })),
);
const tags = computed(() => tagsQuery.data.value?.items ?? []);

const entriesQuery = useQuery(
    computed(() => ({
        ...orpc.agencyOps.reports.listEntries.queryOptions({
            input: {
                teamId: effectiveTeamId.value,
                from: billingPeriod.value.from.toISOString(),
                to: billingPeriod.value.to.toISOString(),
                page: page.value,
                pageSize: pageSize.value,
                clientId: selectedClientId.value || undefined,
                projectId: selectedProjectId.value || undefined,
                memberUserId: selectedMemberUserId.value || undefined,
            },
        }),
        enabled: Boolean(effectiveTeamId.value),
    })),
);

const summaryQuery = useQuery(
    computed(() => ({
        ...orpc.agencyOps.reports.summary.queryOptions({
            input: {
                teamId: effectiveTeamId.value,
                from: billingPeriod.value.from.toISOString(),
                to: billingPeriod.value.to.toISOString(),
                clientId: selectedClientId.value || undefined,
                projectId: selectedProjectId.value || undefined,
                memberUserId: selectedMemberUserId.value || undefined,
            },
        }),
        enabled: Boolean(effectiveTeamId.value),
    })),
);

const entries = computed<AgencyTimeEntry[]>(() => entriesQuery.data.value?.items ?? []);
const totalEntries = computed(() => entriesQuery.data.value?.total ?? 0);
const totalPages = computed(() => Math.max(1, Math.ceil(totalEntries.value / pageSize.value)));

// ─── Rules-based flagging (always-on) ─────────────────────────────────────────

const LONG_ENTRY_HOURS = 10;

const rulesFlags = computed(() => {
    const map = new Map<string, FlagReason>();
    for (const entry of entries.value) {
        if (entry.durationSeconds < 60) {
            map.set(entry.id, "zero-duration");
        } else if (!entry.description.trim()) {
            map.set(entry.id, "missing-description");
        } else if (entry.durationSeconds > LONG_ENTRY_HOURS * 3600) {
            map.set(entry.id, "long-entry");
        }
    }
    return map;
});

const allFlags = computed(() => {
    const merged = new Map<string, FlagReason>(rulesFlags.value);
    for (const [id, reason] of aiFlags.value) {
        merged.set(id, reason);
    }
    return merged;
});

const flaggedCount = computed(() => allFlags.value.size);
const reviewedCount = computed(() => reviewedEntryIds.value.length);

// ─── Stats ribbon data ────────────────────────────────────────────────────────

const totalHours = computed(() => {
    const s = summaryQuery.data.value?.summary;
    return s ? s.totalHours.toFixed(1) : "—";
});

const totalEntriesCount = computed(() => {
    const s = summaryQuery.data.value?.summary;
    return s ? s.totalEntries : "—";
});

// ─── Update entry mutation ────────────────────────────────────────────────────

const updateEntryMutation = useMutation({
    mutationFn: async (payload: {
        entryId: string;
        startAt?: string;
        endAt?: string;
        description?: string;
        projectId?: string;
        tagIds?: string[];
    }) => {
        return orpc.agencyOps.reports.updateEntry.call({
            teamId: effectiveTeamId.value,
            ...payload,
        });
    },
    onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ["agencyOps"] });
        editingEntryId.value = null;
        editDraft.value = {};
    },
    onError: (err) => {
        toast.add({ title: "Failed to update entry", description: getErrorMessage(err), color: "error" });
    },
});

// ─── Inline edit helpers ──────────────────────────────────────────────────────

function startEdit(entry: AgencyTimeEntry) {
    editingEntryId.value = entry.id;
    editDraft.value = {
        id: entry.id,
        description: entry.description,
        startAt: entry.startedAt,
        endAt: entry.endedAt,
        projectId: entry.projectId,
        tags: [...entry.tags],
    };
}

function cancelEdit() {
    editingEntryId.value = null;
    editDraft.value = {};
}

function commitEdit() {
    if (!editingEntryId.value) return;
    updateEntryMutation.mutate({
        entryId: editingEntryId.value,
        startAt: editDraft.value.startAt,
        endAt: editDraft.value.endAt,
        description: editDraft.value.description,
        projectId: editDraft.value.projectId,
        tagIds: editDraft.value.tags?.map((t) => t.id),
    });
}

function toggleTag(tag: AgencyTag) {
    const current = editDraft.value.tags ?? [];
    const exists = current.find((t) => t.id === tag.id);
    editDraft.value.tags = exists
        ? current.filter((t) => t.id !== tag.id)
        : [...current, tag];
}

// ─── Review toggle ────────────────────────────────────────────────────────────

function toggleReview(entryId: string) {
    const next = reviewedEntryIds.value.includes(entryId)
        ? reviewedEntryIds.value.filter((id) => id !== entryId)
        : [...reviewedEntryIds.value, entryId];

    reviewedEntryIds.value = next;
    mutateTypedBlock(props.tabId, props.block.id, "agency-billing-report", (b) => {
        b.reviewedEntryIds = next;
    });
}

// ─── Period navigation ────────────────────────────────────────────────────────

function navigate(delta: number) {
    periodOffset.value += delta;
    page.value = 1;
    mutateTypedBlock(props.tabId, props.block.id, "agency-billing-report", (b) => {
        b.periodOffset = periodOffset.value;
    });
}

// ─── Team / filter persistence ────────────────────────────────────────────────

function updateTeam(teamId: string | undefined) {
    mutateTypedBlock(props.tabId, props.block.id, "agency-billing-report", (b) => {
        b.teamId = teamId || null;
    });
}

watch(selectedClientId, (v) => {
    mutateTypedBlock(props.tabId, props.block.id, "agency-billing-report", (b) => {
        b.selectedClientId = v || null;
    });
});

watch(selectedProjectId, (v) => {
    mutateTypedBlock(props.tabId, props.block.id, "agency-billing-report", (b) => {
        b.selectedProjectId = v || null;
    });
});

watch(selectedMemberUserId, (v) => {
    mutateTypedBlock(props.tabId, props.block.id, "agency-billing-report", (b) => {
        b.selectedMemberUserId = v || null;
    });
});

// ─── Settings persistence ─────────────────────────────────────────────────────

function saveSettings() {
    mutateTypedBlock(props.tabId, props.block.id, "agency-billing-report", (b) => {
        b.billingPeriodStartDay = billingStartDay.value;
        b.billingPeriodEndDay = billingEndDay.value;
    });
    showSettings.value = false;
    page.value = 1;
}

// ─── AI scan ─────────────────────────────────────────────────────────────────

async function runAiScan() {
    if (!entries.value.length) return;
    isAiScanning.value = true;
    aiFlags.value = new Map();

    try {
        // Heuristic AI-style scan (no LLM call wired yet — placeholder patterns)
        await new Promise((r) => setTimeout(r, 800));

        const newFlags = new Map<string, FlagReason>();
        for (const entry of entries.value) {
            // Flag entries with very generic or suspicious descriptions
            const desc = entry.description.toLowerCase().trim();
            if (
                desc === "work" ||
                desc === "misc" ||
                desc === "other" ||
                desc === "task" ||
                /^(call|meeting|chat)$/.test(desc)
            ) {
                newFlags.set(entry.id, "ai-flag");
            }
        }
        aiFlags.value = newFlags;
        toast.add({
            title: "AI scan complete",
            description: `${newFlags.size} additional entr${newFlags.size === 1 ? "y" : "ies"} flagged.`,
            color: "warning",
        });
    } catch (err) {
        toast.add({ title: "AI scan failed", description: getErrorMessage(err), color: "error" });
    } finally {
        isAiScanning.value = false;
    }
}

// ─── Export CSV ───────────────────────────────────────────────────────────────

const exportMutation = useMutation({
    mutationFn: () =>
        orpc.agencyOps.reports.exportCsv.call({
            teamId: effectiveTeamId.value,
            from: billingPeriod.value.from.toISOString(),
            to: billingPeriod.value.to.toISOString(),
            clientId: selectedClientId.value || undefined,
            projectId: selectedProjectId.value || undefined,
            memberUserId: selectedMemberUserId.value || undefined,
        }),
    onSuccess: (data) => {
        const blob = new Blob([data.csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.fileName;
        a.click();
        URL.revokeObjectURL(url);
    },
    onError: (err) => {
        toast.add({ title: "Export failed", description: getErrorMessage(err), color: "error" });
    },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
}

function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function flagLabel(reason: FlagReason): string {
    switch (reason) {
        case "zero-duration": return "Zero/near-zero duration";
        case "missing-description": return "Missing description";
        case "long-entry": return `Over ${LONG_ENTRY_HOURS}h`;
        case "ai-flag": return "Flagged by AI scan";
    }
}

function isoToDatetimeLocal(iso: string): string {
    // Convert ISO string to "YYYY-MM-DDTHH:mm" for datetime-local input
    return iso.slice(0, 16);
}

function datetimeLocalToIso(local: string): string {
    return new Date(local).toISOString();
}
</script>

<template>
    <div class="space-y-5">
        <!-- ── Period navigation header ── -->
        <div class="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800/50 bg-zinc-950/50 px-4 py-3 backdrop-blur-sm">
            <div class="flex items-center gap-2">
                <UButton
                    icon="i-lucide-chevron-left"
                    color="gray"
                    variant="ghost"
                    size="sm"
                    :ui="{ rounded: 'rounded-full' }"
                    @click="navigate(-1)"
                />
                <div class="text-center">
                    <p class="font-mono text-sm font-semibold text-zinc-100">
                        {{ periodLabel }}
                    </p>
                    <p v-if="periodOffset === 0" class="text-xs text-emerald-500">
                        Current period
                    </p>
                    <p v-else class="text-xs text-zinc-500">
                        {{ Math.abs(periodOffset) }} period{{ Math.abs(periodOffset) > 1 ? 's' : '' }} ago
                    </p>
                </div>
                <UButton
                    icon="i-lucide-chevron-right"
                    color="gray"
                    variant="ghost"
                    size="sm"
                    :ui="{ rounded: 'rounded-full' }"
                    :disabled="periodOffset >= 0"
                    @click="navigate(1)"
                />
            </div>

            <div class="flex items-center gap-2">
                <!-- AI scan -->
                <UButton
                    :loading="isAiScanning"
                    :label="isAiScanning ? 'Scanning…' : 'AI Scan'"
                    icon="i-lucide-sparkles"
                    color="amber"
                    variant="ghost"
                    size="xs"
                    :ui="{ rounded: 'rounded-full' }"
                    @click="runAiScan"
                />
                <!-- Export CSV -->
                <UButton
                    icon="i-lucide-download"
                    color="gray"
                    variant="ghost"
                    size="xs"
                    :loading="exportMutation.isPending.value"
                    :ui="{ rounded: 'rounded-full' }"
                    @click="exportMutation.mutate()"
                />
                <!-- Settings -->
                <UButton
                    icon="i-lucide-settings-2"
                    color="gray"
                    variant="ghost"
                    size="xs"
                    :ui="{ rounded: 'rounded-full' }"
                    @click="showSettings = !showSettings"
                />
            </div>
        </div>

        <!-- ── Settings panel ── -->
        <div
            v-if="showSettings"
            class="space-y-4 rounded-2xl border border-zinc-800/50 bg-zinc-900/60 p-4 backdrop-blur-sm"
        >
            <p class="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Billing period configuration
            </p>
            <div class="grid gap-3 sm:grid-cols-3">
                <UFormField label="Team" size="sm">
                    <USelect
                        :model-value="effectiveTeamId"
                        :items="teams.map((t) => ({ label: t.name, value: t.id }))"
                        placeholder="Select team"
                        size="sm"
                        @update:model-value="updateTeam($event as string)"
                    />
                </UFormField>
                <UFormField label="Period start day" size="sm">
                    <UInput
                        v-model.number="billingStartDay"
                        type="number"
                        :min="1"
                        :max="28"
                        size="sm"
                    />
                </UFormField>
                <UFormField label="Period end day" size="sm">
                    <UInput
                        v-model.number="billingEndDay"
                        type="number"
                        :min="1"
                        :max="28"
                        size="sm"
                    />
                </UFormField>
            </div>
            <div class="flex justify-end gap-2">
                <UButton label="Cancel" color="gray" variant="ghost" size="xs" @click="showSettings = false" />
                <UButton label="Save" color="emerald" variant="soft" size="xs" @click="saveSettings" />
            </div>
        </div>

        <!-- ── Stats ribbon ── -->
        <div class="grid gap-3 sm:grid-cols-4">
            <div class="rounded-2xl border border-zinc-800/50 bg-zinc-950/50 p-4 backdrop-blur-sm">
                <p class="text-xs font-semibold uppercase tracking-widest text-zinc-500">Total hours</p>
                <p class="mt-1.5 font-mono text-2xl font-bold text-zinc-100">{{ totalHours }}</p>
            </div>
            <div class="rounded-2xl border border-zinc-800/50 bg-zinc-950/50 p-4 backdrop-blur-sm">
                <p class="text-xs font-semibold uppercase tracking-widest text-zinc-500">Entries</p>
                <p class="mt-1.5 font-mono text-2xl font-bold text-zinc-100">{{ totalEntriesCount }}</p>
            </div>
            <div class="rounded-2xl border border-amber-800/40 bg-amber-950/20 p-4 backdrop-blur-sm">
                <p class="text-xs font-semibold uppercase tracking-widest text-amber-600">Flagged</p>
                <p class="mt-1.5 font-mono text-2xl font-bold text-amber-400">{{ flaggedCount }}</p>
            </div>
            <div class="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-4 backdrop-blur-sm">
                <p class="text-xs font-semibold uppercase tracking-widest text-emerald-600">Reviewed</p>
                <p class="mt-1.5 font-mono text-2xl font-bold text-emerald-400">{{ reviewedCount }}</p>
            </div>
        </div>

        <!-- ── Filters ── -->
        <div class="grid gap-3 sm:grid-cols-3 rounded-2xl border border-zinc-800/50 bg-zinc-950/40 p-4 backdrop-blur-sm">
            <UFormField label="Client" size="sm">
                <USelect
                    v-model="selectedClientId"
                    :items="clients.map((c) => ({ label: c.name, value: c.id }))"
                    clearable
                    placeholder="All clients"
                    size="sm"
                />
            </UFormField>
            <UFormField label="Project" size="sm">
                <USelect
                    v-model="selectedProjectId"
                    :items="projects.map((p) => ({ label: p.name, value: p.id }))"
                    clearable
                    placeholder="All projects"
                    size="sm"
                />
            </UFormField>
            <UFormField label="Member" size="sm">
                <USelect
                    v-model="selectedMemberUserId"
                    :items="
                        (summaryQuery.data.value?.summary?.teamActivity ?? []).map((m) => ({
                            label: m.userName,
                            value: m.userId,
                        }))
                    "
                    clearable
                    placeholder="All members"
                    size="sm"
                />
            </UFormField>
        </div>

        <!-- ── Loading state ── -->
        <div v-if="entriesQuery.isPending.value" class="flex items-center justify-center py-12">
            <UIcon name="i-lucide-loader-2" class="animate-spin text-emerald-500 size-6" />
        </div>

        <!-- ── Empty state ── -->
        <div
            v-else-if="!effectiveTeamId"
            class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-800/50 bg-zinc-950/40 py-14 text-center"
        >
            <UIcon name="i-lucide-building-2" class="size-8 text-zinc-600" />
            <p class="text-sm font-semibold text-zinc-400">No team selected</p>
            <p class="text-xs text-zinc-600">Open settings to select a team.</p>
            <UButton
                label="Open settings"
                icon="i-lucide-settings-2"
                color="gray"
                variant="soft"
                size="xs"
                :ui="{ rounded: 'rounded-full' }"
                @click="showSettings = true"
            />
        </div>

        <div
            v-else-if="entries.length === 0 && !entriesQuery.isPending.value"
            class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-800/50 bg-zinc-950/40 py-14 text-center"
        >
            <UIcon name="i-lucide-file-clock" class="size-8 text-zinc-600" />
            <p class="text-sm font-semibold text-zinc-400">No entries this period</p>
            <p class="text-xs text-zinc-600">Navigate to a different period or adjust your filters.</p>
        </div>

        <!-- ── Entry table ── -->
        <div v-else class="overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-950/40 backdrop-blur-sm">
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b border-zinc-800/70">
                        <th class="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500">Member</th>
                        <th class="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500">Project</th>
                        <th class="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500">Description</th>
                        <th class="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500">Start</th>
                        <th class="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500">End</th>
                        <th class="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500">Duration</th>
                        <th class="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500">Tags</th>
                        <th class="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-widest text-zinc-500">Status</th>
                        <th class="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-widest text-zinc-500">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for="entry in entries" :key="entry.id">
                        <!-- ── View row ── -->
                        <tr
                            v-if="editingEntryId !== entry.id"
                            :class="[
                                'border-b border-zinc-800/40 transition-colors',
                                allFlags.has(entry.id) && !reviewedEntryIds.includes(entry.id)
                                    ? 'bg-amber-950/30 hover:bg-amber-950/40'
                                    : reviewedEntryIds.includes(entry.id)
                                    ? 'bg-emerald-950/10 hover:bg-emerald-950/20'
                                    : 'hover:bg-zinc-900/60',
                            ]"
                        >
                            <td class="px-3 py-2.5">
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-medium text-zinc-300">{{ entry.userName }}</span>
                                </div>
                            </td>
                            <td class="px-3 py-2.5">
                                <div>
                                    <p class="text-xs font-medium text-zinc-200">{{ entry.projectName }}</p>
                                    <p class="text-xs text-zinc-500">{{ entry.clientName }}</p>
                                </div>
                            </td>
                            <td class="px-3 py-2.5 max-w-[200px]">
                                <div class="flex items-center gap-1.5">
                                    <p class="truncate text-xs text-zinc-300">
                                        {{ entry.description || '—' }}
                                    </p>
                                    <UTooltip
                                        v-if="allFlags.has(entry.id)"
                                        :text="flagLabel(allFlags.get(entry.id)!)"
                                    >
                                        <UIcon name="i-lucide-triangle-alert" class="size-3 shrink-0 text-amber-400" />
                                    </UTooltip>
                                </div>
                            </td>
                            <td class="px-3 py-2.5">
                                <span class="font-mono text-xs text-zinc-400">{{ formatTime(entry.startedAt) }}</span>
                            </td>
                            <td class="px-3 py-2.5">
                                <span class="font-mono text-xs text-zinc-400">{{ formatTime(entry.endedAt) }}</span>
                            </td>
                            <td class="px-3 py-2.5">
                                <span class="font-mono text-xs font-semibold text-zinc-200">{{ formatDuration(entry.durationSeconds) }}</span>
                            </td>
                            <td class="px-3 py-2.5">
                                <div class="flex flex-wrap gap-1">
                                    <span
                                        v-for="tag in entry.tags"
                                        :key="tag.id"
                                        class="rounded-full bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400"
                                    >
                                        {{ tag.name }}
                                    </span>
                                </div>
                            </td>
                            <td class="px-3 py-2.5 text-center">
                                <UButton
                                    :icon="reviewedEntryIds.includes(entry.id) ? 'i-lucide-check-circle' : 'i-lucide-circle'"
                                    :color="reviewedEntryIds.includes(entry.id) ? 'emerald' : 'gray'"
                                    variant="ghost"
                                    size="xs"
                                    :ui="{ rounded: 'rounded-full' }"
                                    @click="toggleReview(entry.id)"
                                />
                            </td>
                            <td class="px-3 py-2.5 text-right">
                                <UButton
                                    icon="i-lucide-pencil"
                                    color="gray"
                                    variant="ghost"
                                    size="xs"
                                    :ui="{ rounded: 'rounded-full' }"
                                    @click="startEdit(entry)"
                                />
                            </td>
                        </tr>

                        <!-- ── Edit row ── -->
                        <tr
                            v-else
                            class="border-b border-emerald-900/40 bg-zinc-900/80"
                        >
                            <td class="px-3 py-2.5">
                                <span class="text-xs text-zinc-400">{{ entry.userName }}</span>
                            </td>
                            <td class="px-3 py-2.5">
                                <USelect
                                    v-model="editDraft.projectId"
                                    :items="projects.map((p) => ({ label: p.name, value: p.id }))"
                                    size="xs"
                                    class="w-36"
                                />
                            </td>
                            <td class="px-3 py-2.5">
                                <UInput
                                    v-model="editDraft.description"
                                    placeholder="Description…"
                                    size="xs"
                                    class="w-48"
                                />
                            </td>
                            <td class="px-3 py-2.5">
                                <input
                                    :value="isoToDatetimeLocal(editDraft.startAt ?? entry.startedAt)"
                                    type="datetime-local"
                                    class="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    @change="editDraft.startAt = datetimeLocalToIso(($event.target as HTMLInputElement).value)"
                                />
                            </td>
                            <td class="px-3 py-2.5">
                                <input
                                    :value="isoToDatetimeLocal(editDraft.endAt ?? entry.endedAt)"
                                    type="datetime-local"
                                    class="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    @change="editDraft.endAt = datetimeLocalToIso(($event.target as HTMLInputElement).value)"
                                />
                            </td>
                            <td class="px-3 py-2.5">
                                <span class="font-mono text-xs text-zinc-500">auto</span>
                            </td>
                            <td class="px-3 py-2.5">
                                <div class="flex flex-wrap gap-1">
                                    <UButton
                                        v-for="tag in tags"
                                        :key="tag.id"
                                        :label="tag.name"
                                        size="xs"
                                        :variant="editDraft.tags?.find((t) => t.id === tag.id) ? 'soft' : 'ghost'"
                                        :color="editDraft.tags?.find((t) => t.id === tag.id) ? 'emerald' : 'gray'"
                                        :ui="{ rounded: 'rounded-full' }"
                                        @click="toggleTag(tag)"
                                    />
                                </div>
                            </td>
                            <td class="px-3 py-2.5" />
                            <td class="px-3 py-2.5 text-right">
                                <div class="flex items-center justify-end gap-1">
                                    <UButton
                                        icon="i-lucide-check"
                                        color="emerald"
                                        variant="soft"
                                        size="xs"
                                        :loading="updateEntryMutation.isPending.value"
                                        :ui="{ rounded: 'rounded-full' }"
                                        @click="commitEdit"
                                    />
                                    <UButton
                                        icon="i-lucide-x"
                                        color="gray"
                                        variant="ghost"
                                        size="xs"
                                        :ui="{ rounded: 'rounded-full' }"
                                        @click="cancelEdit"
                                    />
                                </div>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>

            <!-- ── Pagination ── -->
            <div
                v-if="totalPages > 1"
                class="flex items-center justify-between border-t border-zinc-800/50 px-4 py-3"
            >
                <p class="text-xs text-zinc-500">
                    Page {{ page }} of {{ totalPages }} · {{ totalEntries }} entries
                </p>
                <div class="flex gap-1">
                    <UButton
                        icon="i-lucide-chevron-left"
                        color="gray"
                        variant="ghost"
                        size="xs"
                        :disabled="page <= 1"
                        :ui="{ rounded: 'rounded-full' }"
                        @click="page = Math.max(1, page - 1)"
                    />
                    <UButton
                        icon="i-lucide-chevron-right"
                        color="gray"
                        variant="ghost"
                        size="xs"
                        :disabled="page >= totalPages"
                        :ui="{ rounded: 'rounded-full' }"
                        @click="page = Math.min(totalPages, page + 1)"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
