<script setup lang="ts">
import {
    WORKSPACE_SKILLS_HEAT_MAP_DIMENSIONS_LIMIT,
    createWorkspaceId,
    createWorkspaceSkillsHeatMapDimension,
    createWorkspaceSkillsHeatMapMember,
    getSkillsHeatMapMemberAverage,
    getSkillsHeatMapSummary,
    type WorkspaceSkillsHeatMapBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
    block: WorkspaceSkillsHeatMapBlock;
    tabId: string;
}>();

const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getSkillsHeatMapSummary(props.block));

const dimensionIds = computed(() =>
    props.block.dimensions.map((dimension) => dimension.id),
);

const canAddDimension = computed(
    () =>
        props.block.dimensions.length <
        WORKSPACE_SKILLS_HEAT_MAP_DIMENSIONS_LIMIT,
);

const strongestDimensionLabel = computed(() => {
    if (!summary.value.strongestDimension) {
        return "Unclear";
    }

    return getDimensionLabel(summary.value.strongestDimension);
});

const strongestDimensionAverage = computed(() => {
    if (!summary.value.strongestDimension) {
        return null;
    }

    return (
        summary.value.averageByDimension[summary.value.strongestDimension] ?? 0
    );
});

function mutateHeatMap(mutator: (block: WorkspaceSkillsHeatMapBlock) => void) {
    mutateTypedBlock(props.tabId, props.block.id, "skills-heat-map", mutator);
}

function clampScore(value: string | number | undefined) {
    const numeric = Number(value ?? 5);

    if (!Number.isFinite(numeric)) {
        return 5;
    }

    return Math.min(10, Math.max(1, Math.round(numeric)));
}

function initializeDimensions() {
    mutateHeatMap((block) => {
        block.dimensions = [
            { id: "writing", label: "Writing" },
            { id: "strategy", label: "Strategy" },
            { id: "design", label: "Design" },
            { id: "analytics", label: "Analytics" },
            { id: "leadership", label: "Leadership" },
        ];

        for (const member of block.members) {
            const nextScores: Record<string, number> = {};

            for (const dimension of block.dimensions) {
                nextScores[dimension.id] = member.scores[dimension.id] ?? 5;
            }

            member.scores = nextScores;
        }
    });
}

function addDimension() {
    mutateHeatMap((block) => {
        const dimension = createWorkspaceSkillsHeatMapDimension({
            id: createWorkspaceId("dimension"),
            label: "New Skill",
        });

        block.dimensions.push(dimension);
    });
}

function removeDimension(dimensionId: string) {
    mutateHeatMap((block) => {
        if (block.dimensions.length <= 1) {
            return;
        }

        block.dimensions = block.dimensions.filter(
            (dimension) => dimension.id !== dimensionId,
        );

        for (const member of block.members) {
            delete member.scores[dimensionId];
        }
    });
}

function updateDimensionLabel(
    dimensionId: string,
    value: string | number | undefined,
) {
    mutateHeatMap((block) => {
        const target = block.dimensions.find(
            (dimension) => dimension.id === dimensionId,
        );

        if (!target) {
            return;
        }

        target.label = String(value ?? "").slice(0, 80);
    });
}

function cycleScore(memberId: string, dimensionId: string) {
    mutateHeatMap((block) => {
        const member = block.members.find((entry) => entry.id === memberId);

        if (!member) {
            return;
        }

        const current = member.scores[dimensionId] ?? 5;
        member.scores[dimensionId] = current >= 10 ? 1 : current + 1;
    });
}

function addMember() {
    mutateHeatMap((block) => {
        block.members.push(
            createWorkspaceSkillsHeatMapMember(block.dimensions),
        );
    });
}

function removeMember(memberId: string) {
    mutateHeatMap((block) => {
        block.members = block.members.filter(
            (member) => member.id !== memberId,
        );
    });
}

function updateMemberName(
    memberId: string,
    value: string | number | undefined,
) {
    mutateHeatMap((block) => {
        const target = block.members.find((member) => member.id === memberId);

        if (!target) {
            return;
        }

        target.name = String(value ?? "").slice(0, 120);
    });
}

function updateMemberRole(
    memberId: string,
    value: string | number | undefined,
) {
    mutateHeatMap((block) => {
        const target = block.members.find((member) => member.id === memberId);

        if (!target) {
            return;
        }

        target.role = String(value ?? "").slice(0, 120);
    });
}

function updateMemberScore(
    memberId: string,
    dimensionId: string,
    value: string | number | undefined,
) {
    mutateHeatMap((block) => {
        const member = block.members.find((entry) => entry.id === memberId);

        if (!member) {
            return;
        }

        member.scores[dimensionId] = clampScore(value);
    });
}

function getScoreClasses(score: number) {
    if (score <= 3) {
        return "border-error/35 bg-error/10 text-error";
    }

    if (score <= 5) {
        return "border-warning/35 bg-warning/10 text-warning";
    }

    if (score <= 7) {
        return "border-warning/20 bg-warning/5 text-highlighted";
    }

    return "border-success/35 bg-success/10 text-success";
}

function getDimensionLabel(dimensionId: string) {
    return (
        props.block.dimensions.find((dimension) => dimension.id === dimensionId)
            ?.label ?? "Skill"
    );
}

function getMemberAverage(
    member: WorkspaceSkillsHeatMapBlock["members"][number],
) {
    return getSkillsHeatMapMemberAverage(member.scores, dimensionIds.value);
}

function getMemberLabel(
    member: WorkspaceSkillsHeatMapBlock["members"][number],
) {
    return member.name.trim() || "Team member";
}

function getDimensionInputLabel(dimensionId: string) {
    const label = getDimensionLabel(dimensionId);

    return `Skill name for ${label || "new skill"}`;
}

function getScoreInputLabel(
    member: WorkspaceSkillsHeatMapBlock["members"][number],
    dimensionId: string,
) {
    return `${getDimensionLabel(dimensionId)} score for ${getMemberLabel(member)}`;
}

function getRemoveDimensionLabel(dimensionId: string) {
    return `Remove ${getDimensionLabel(dimensionId)} skill`;
}

function getRemoveMemberLabel(
    member: WorkspaceSkillsHeatMapBlock["members"][number],
) {
    return `Remove ${getMemberLabel(member)}`;
}
</script>

<template>
    <div class="space-y-6">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-3xl border border-primary/10 bg-primary/5 p-5">
                <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                >
                    Team
                </p>
                <p
                    class="mt-2 text-2xl font-black tracking-tight text-primary sm:text-3xl"
                >
                    {{ summary.memberCount }}
                </p>
            </div>

            <div class="rounded-3xl border border-success/10 bg-success/5 p-5">
                <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                >
                    Avg Score
                </p>
                <p
                    class="mt-2 text-2xl font-black tracking-tight text-success sm:text-3xl"
                >
                    {{ summary.overallAverage }}/10
                </p>
            </div>

            <div class="rounded-3xl border border-error/10 bg-error/5 p-5">
                <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                >
                    Critical Gaps
                </p>
                <p
                    class="mt-2 text-2xl font-black tracking-tight text-error sm:text-3xl"
                >
                    {{ summary.criticalGapCount }}
                </p>
            </div>

            <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
                <p
                    class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                >
                    Strongest
                </p>
                <p
                    class="mt-2 text-lg font-black tracking-tight text-highlighted"
                >
                    {{ strongestDimensionLabel }}
                </p>
                <p
                    class="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted/60"
                >
                    {{
                        strongestDimensionAverage === null
                            ? "Add scores to rank the team."
                            : `${strongestDimensionAverage}/10 team average`
                    }}
                </p>
            </div>
        </div>

        <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p class="text-sm font-semibold text-highlighted">
                        Skills matrix
                    </p>
                    <p class="mt-1 text-sm text-muted">
                        Score each team member from 1 to 10 for every skill.
                        Higher scores indicate stronger capability.
                    </p>
                </div>

                <div class="flex flex-wrap gap-2">
                    <UButton
                        v-if="canAddDimension"
                        color="neutral"
                        variant="soft"
                        icon="i-lucide-plus"
                        class="rounded-full px-4"
                        aria-label="Add skill dimension"
                        @click="addDimension"
                    >
                        Add Skill
                    </UButton>

                    <UButton
                        color="primary"
                        variant="soft"
                        icon="i-lucide-user-plus"
                        class="rounded-full px-4"
                        aria-label="Add team member"
                        @click="addMember"
                    >
                        Add Team Member
                    </UButton>
                </div>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
                <div
                    class="rounded-full border border-error/30 bg-error/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-error"
                >
                    1-3 Critical gap
                </div>
                <div
                    class="rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-warning"
                >
                    4-5 Needs support
                </div>
                <div
                    class="rounded-full border border-warning/20 bg-warning/5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-highlighted"
                >
                    6-7 Reliable
                </div>
                <div
                    class="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-success"
                >
                    8-10 Strength
                </div>
            </div>
        </div>

        <div
            v-if="block.dimensions.length === 0"
            class="rounded-3xl border border-dashed border-muted/20 bg-elevated/5 py-12 text-center"
        >
            <p class="text-sm font-semibold text-muted">
                No skill dimensions added yet.
            </p>
            <p class="mt-2 text-sm text-muted/80">
                Start with a default set or add custom skills for your team.
            </p>
            <UButton
                color="neutral"
                variant="soft"
                icon="i-lucide-plus"
                class="mt-4 rounded-full px-4"
                aria-label="Initialize default skill dimensions"
                @click="initializeDimensions"
            >
                Initialize Default Dimensions
            </UButton>
        </div>

        <div
            v-else-if="block.members.length === 0"
            class="rounded-3xl border border-dashed border-muted/20 bg-elevated/5 py-12 text-center"
        >
            <p class="text-sm font-semibold text-muted">
                No team members added yet.
            </p>
            <p class="mt-2 text-sm text-muted/80">
                Add a team member to start scoring strengths and gaps.
            </p>
            <UButton
                color="primary"
                variant="soft"
                icon="i-lucide-user-plus"
                class="mt-4 rounded-full px-4"
                aria-label="Add first team member"
                @click="addMember"
            >
                Add Team Member
            </UButton>
        </div>

        <div v-else class="overflow-x-auto pb-2">
            <table
                class="min-w-[880px] w-full border-separate border-spacing-y-3"
            >
                <thead>
                    <tr>
                        <th
                            class="px-3 pb-1 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                        >
                            Team Member
                        </th>
                        <th
                            v-for="dimension in block.dimensions"
                            :key="dimension.id"
                            class="px-3 pb-1 text-center"
                        >
                            <div class="flex flex-col items-center gap-1 group">
                                <UInput
                                    :model-value="dimension.label"
                                    variant="none"
                                    placeholder="Skill"
                                    class="w-24"
                                    :ui="{
                                        base: 'px-0 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60 placeholder:text-muted/40',
                                    }"
                                    @update:model-value="
                                        updateDimensionLabel(
                                            dimension.id,
                                            $event,
                                        )
                                    "
                                />
                                <UButton
                                    v-if="block.dimensions.length > 1"
                                    color="neutral"
                                    variant="ghost"
                                    icon="i-lucide-x"
                                    size="xs"
                                    class="rounded-full opacity-0 group-hover:opacity-100 transition-opacity -mt-1 h-4 w-4 p-0 flex items-center justify-center hover:text-error"
                                    @click="removeDimension(dimension.id)"
                                />
                            </div>
                        </th>
                        <th
                            class="px-3 pb-1 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                        >
                            Average
                        </th>
                        <th
                            class="px-3 pb-1 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                        >
                            Actions
                        </th>
                    </tr>
                </thead>

                <tbody>
                    <tr
                        v-for="member in block.members"
                        :key="member.id"
                        class="rounded-2xl border border-muted/20 bg-default/40"
                    >
                        <td
                            class="rounded-l-2xl border-y border-l border-muted/20 bg-default/40 px-4 py-4 align-top"
                        >
                            <UInput
                                :model-value="member.name"
                                variant="none"
                                placeholder="Name"
                                :ui="{
                                    base: 'px-0 text-sm font-semibold text-highlighted placeholder:text-muted/60',
                                }"
                                @update:model-value="
                                    updateMemberName(member.id, $event)
                                "
                            />
                            <UInput
                                :model-value="member.role"
                                variant="none"
                                placeholder="Role"
                                class="mt-1"
                                :ui="{
                                    base: 'px-0 text-xs text-muted/70 font-medium placeholder:text-muted/60',
                                }"
                                @update:model-value="
                                    updateMemberRole(member.id, $event)
                                "
                            />
                        </td>

                        <td
                            v-for="dimension in block.dimensions"
                            :key="`${member.id}-${dimension.id}`"
                            class="border-y border-muted/20 bg-default/40 px-3 py-4 text-center"
                        >
                            <button
                                type="button"
                                class="w-full rounded-2xl border px-3 py-4 text-lg font-black tracking-tight transition hover:scale-[1.02]"
                                :class="
                                    getScoreClasses(
                                        member.scores[dimension.id] ?? 5,
                                    )
                                "
                                @click="cycleScore(member.id, dimension.id)"
                            >
                                {{ member.scores[dimension.id] ?? 5 }}
                            </button>
                        </td>

                        <td
                            class="border-y border-muted/20 bg-default/40 px-3 py-4 text-center"
                        >
                            <div
                                class="rounded-2xl border px-3 py-4 text-lg font-black tracking-tight"
                                :class="
                                    getScoreClasses(getMemberAverage(member))
                                "
                            >
                                {{ getMemberAverage(member) }}
                            </div>
                        </td>

                        <td
                            class="rounded-r-2xl border-y border-r border-muted/20 bg-default/40 px-3 py-4 text-right"
                        >
                            <UButton
                                color="neutral"
                                variant="ghost"
                                icon="i-lucide-trash-2"
                                class="rounded-xl hover:text-error"
                                @click="removeMember(member.id)"
                            />
                        </td>
                    </tr>
                </tbody>

                <tfoot>
                    <tr>
                        <td
                            class="px-3 pt-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                        >
                            Team Average
                        </td>
                        <td
                            v-for="dimension in block.dimensions"
                            :key="`avg-${dimension.id}`"
                            class="px-3 pt-2 text-center"
                        >
                            <div
                                class="rounded-2xl border px-3 py-3 text-sm font-bold"
                                :class="
                                    getScoreClasses(
                                        summary.averageByDimension[
                                            dimension.id
                                        ] ?? 0,
                                    )
                                "
                            >
                                {{
                                    summary.averageByDimension[dimension.id] ??
                                    0
                                }}
                            </div>
                        </td>
                        <td class="px-3 pt-2 text-center">
                            <div
                                class="rounded-2xl border px-3 py-3 text-sm font-bold"
                                :class="getScoreClasses(summary.overallAverage)"
                            >
                                {{ summary.overallAverage }}
                            </div>
                        </td>
                        <td />
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
</template>
