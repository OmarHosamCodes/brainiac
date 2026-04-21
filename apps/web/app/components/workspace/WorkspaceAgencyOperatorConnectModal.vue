<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

import { getErrorMessage } from "~/utils/get-error-message";

const props = defineProps<{
    open: boolean;
    /** IDs of teams already bound to another agency-operator node */
    boundTeamIds: Set<string>;
}>();

const emit = defineEmits<{
    "update:open": [value: boolean];
    submit: [payload: { teamId: string; teamName: string }];
}>();

const orpc = useOrpc();
const toast = useToast();
const queryClient = useQueryClient();
const authSession = useAuthSession();
const authEnabled = computed(() => Boolean(authSession.value?.data?.user));

// ── Team list ────────────────────────────────────────────────────────────────

const teamListQuery = useQuery(
    computed(() => ({
        ...orpc.team.list.queryOptions(),
        enabled: authEnabled.value,
    })),
);

const teams = computed(() => teamListQuery.data.value?.items ?? []);

// ── Panel toggle ─────────────────────────────────────────────────────────────

type Panel = "select" | "create";
const activePanel = ref<Panel>("select");

// ── Select existing team ─────────────────────────────────────────────────────

const selectedTeamId = ref("");

const availableTeams = computed(() =>
    teams.value.filter((team) => !props.boundTeamIds.has(team.id)),
);

const boundTeams = computed(() =>
    teams.value.filter((team) => props.boundTeamIds.has(team.id)),
);

const canSubmitSelect = computed(
    () => Boolean(selectedTeamId.value) && !props.boundTeamIds.has(selectedTeamId.value),
);

function handleSelectSubmit() {
    const team = teams.value.find((t) => t.id === selectedTeamId.value);
    if (!team) return;
    emit("submit", { teamId: team.id, teamName: team.name });
    emit("update:open", false);
}

// ── Create new team ──────────────────────────────────────────────────────────

const newTeamName = ref("");
const canSubmitCreate = computed(() => newTeamName.value.trim().length > 0);

const createTeamMutation = useMutation({
    ...orpc.team.create.mutationOptions(),
    onSuccess: async (createdTeam) => {
        await queryClient.invalidateQueries(orpc.team.list.queryOptions());
        emit("submit", { teamId: createdTeam.id, teamName: createdTeam.name });
        emit("update:open", false);
    },
    onError: (err) => {
        toast.add({
            title: "Could not create team",
            description: getErrorMessage(err),
            color: "error",
        });
    },
});

async function handleCreateSubmit() {
    const name = newTeamName.value.trim();
    if (!name) return;
    await createTeamMutation.mutateAsync({ name });
}

// ── Reset on open ────────────────────────────────────────────────────────────

watch(() => props.open, (isOpen) => {
    if (isOpen) {
        activePanel.value = "select";
        selectedTeamId.value = availableTeams.value[0]?.id ?? "";
        newTeamName.value = "";
    }
});
</script>

<template>
    <UModal
        :open="open"
        :ui="{ content: 'max-w-lg' }"
        @update:open="emit('update:open', $event)"
    >
        <template #content>
            <div class="p-6">
                <!-- Header -->
                <div class="mb-6 flex items-center gap-3.5">
                    <div class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600 dark:bg-emerald-400/12 dark:text-emerald-400">
                        <UIcon name="i-lucide-building-2" class="size-5" />
                    </div>
                    <div>
                        <h2 class="text-base font-bold text-highlighted">Connect Agency Operator</h2>
                        <p class="text-xs text-muted">Bind this node to a team — one operator per team.</p>
                    </div>
                    <UButton
                        icon="i-lucide-x"
                        variant="ghost"
                        color="neutral"
                        size="sm"
                        square
                        class="ml-auto"
                        aria-label="Close"
                        @click="emit('update:open', false)"
                    />
                </div>

                <!-- Panel switcher -->
                <div class="mb-5 flex gap-1 rounded-xl bg-neutral-100/80 p-1 dark:bg-neutral-800/60">
                    <button
                        v-for="item in [
                            { id: 'select', label: 'Existing team' },
                            { id: 'create', label: 'New team' },
                        ]"
                        :key="item.id"
                        type="button"
                        class="flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                        :class="
                            activePanel === item.id
                                ? 'bg-white text-highlighted shadow-sm ring-1 ring-neutral-200/80 dark:bg-neutral-700 dark:ring-neutral-700'
                                : 'text-muted hover:text-highlighted'
                        "
                        @click="activePanel = (item.id as Panel)"
                    >
                        {{ item.label }}
                    </button>
                </div>

                <!-- Panel: select existing team -->
                <div v-if="activePanel === 'select'" class="space-y-4">
                    <div v-if="teamListQuery.isLoading.value" class="py-6 text-center text-sm text-muted">
                        <UIcon name="i-lucide-loader-2" class="mr-1.5 inline size-4 animate-spin" />
                        Loading teams…
                    </div>

                    <template v-else-if="availableTeams.length === 0 && boundTeams.length === 0">
                        <p class="py-4 text-center text-sm text-muted">
                            No teams yet. Switch to <strong>New team</strong> to create one.
                        </p>
                    </template>

                    <template v-else>
                        <!-- Available teams -->
                        <div v-if="availableTeams.length > 0" class="space-y-1.5">
                            <p class="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted/70">
                                Available
                            </p>
                            <button
                                v-for="team in availableTeams"
                                :key="team.id"
                                type="button"
                                class="flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all"
                                :class="
                                    selectedTeamId === team.id
                                        ? 'border-emerald-500/40 bg-emerald-500/8 dark:border-emerald-400/40 dark:bg-emerald-400/8'
                                        : 'border-neutral-200/80 bg-white/60 hover:border-emerald-500/30 hover:bg-emerald-500/4 dark:border-neutral-800/80 dark:bg-neutral-900/60'
                                "
                                @click="selectedTeamId = team.id"
                            >
                                <div
                                    class="flex size-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold uppercase"
                                    :class="
                                        selectedTeamId === team.id
                                            ? 'bg-emerald-500/20 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300'
                                            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                                    "
                                >
                                    {{ team.name.slice(0, 2).toUpperCase() }}
                                </div>
                                <div class="min-w-0 flex-1">
                                    <p class="truncate text-sm font-semibold text-highlighted">{{ team.name }}</p>
                                    <p class="text-[11px] capitalize text-muted">{{ team.role }}</p>
                                </div>
                                <UIcon
                                    v-if="selectedTeamId === team.id"
                                    name="i-lucide-circle-check"
                                    class="size-4.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                                />
                            </button>
                        </div>

                        <!-- Already-bound teams -->
                        <div v-if="boundTeams.length > 0" class="space-y-1.5">
                            <p class="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted/70">
                                Already bound
                            </p>
                            <div
                                v-for="team in boundTeams"
                                :key="team.id"
                                class="flex cursor-not-allowed items-center gap-3 rounded-2xl border border-neutral-200/60 bg-neutral-50/60 px-4 py-3 opacity-50 dark:border-neutral-800/60 dark:bg-neutral-900/40"
                            >
                                <div class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-[11px] font-bold uppercase text-neutral-500 dark:bg-neutral-800">
                                    {{ team.name.slice(0, 2).toUpperCase() }}
                                </div>
                                <div class="min-w-0 flex-1">
                                    <p class="truncate text-sm font-semibold text-highlighted">{{ team.name }}</p>
                                    <p class="text-[11px] text-muted">Already has an operator node</p>
                                </div>
                                <UIcon name="i-lucide-lock" class="size-4 shrink-0 text-muted" />
                            </div>
                        </div>
                    </template>

                    <UButton
                        label="Connect team"
                        color="primary"
                        variant="solid"
                        block
                        size="md"
                        icon="i-lucide-plug"
                        :disabled="!canSubmitSelect"
                        class="mt-2"
                        @click="handleSelectSubmit"
                    />
                </div>

                <!-- Panel: create new team -->
                <div v-else class="space-y-4">
                    <div class="space-y-1.5">
                        <label class="block text-[11px] font-bold uppercase tracking-[0.18em] text-muted/80">
                            Team name
                        </label>
                        <UInput
                            v-model="newTeamName"
                            type="text"
                            placeholder="e.g. Design Studio"
                            size="md"
                            class="w-full"
                            autofocus
                            @keydown.enter.prevent="handleCreateSubmit"
                        />
                    </div>

                    <p class="text-xs text-muted/70">
                        A new team will be created and this node will be automatically bound to it.
                    </p>

                    <UButton
                        label="Create & connect"
                        color="primary"
                        variant="solid"
                        block
                        size="md"
                        icon="i-lucide-plus"
                        :disabled="!canSubmitCreate"
                        :loading="createTeamMutation.isPending.value"
                        @click="handleCreateSubmit"
                    />
                </div>
            </div>
        </template>
    </UModal>
</template>
