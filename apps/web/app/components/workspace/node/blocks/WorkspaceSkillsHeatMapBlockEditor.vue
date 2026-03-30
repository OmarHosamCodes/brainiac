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

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getSkillsHeatMapSummary(props.block));

const canAddDimension = computed(
  () => props.block.dimensions.length < WORKSPACE_SKILLS_HEAT_MAP_DIMENSIONS_LIMIT,
);

function initializeDimensions() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "skills-heat-map") {
      return;
    }

    block.dimensions = [
      { id: "writing", label: "Writing" },
      { id: "strategy", label: "Strategy" },
      { id: "design", label: "Design" },
      { id: "analytics", label: "Analytics" },
      { id: "leadership", label: "Leadership" },
    ];
  });
}

function addDimension() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "skills-heat-map") {
      return;
    }

    block.dimensions.push(
      createWorkspaceSkillsHeatMapDimension({
        id: createWorkspaceId("dimension"),
        label: "New Skill",
      }),
    );
  });
}

function removeDimension(dimensionId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "skills-heat-map") {
      return;
    }

    block.dimensions = block.dimensions.filter((d) => d.id !== dimensionId);
    for (const member of block.members) {
      delete member.scores[dimensionId];
    }
  });
}

function addMember() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "skills-heat-map") {
      return;
    }

    block.members.push(createWorkspaceSkillsHeatMapMember(block.dimensions));
  });
}

function removeMember(memberId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "skills-heat-map") {
      return;
    }

    block.members = block.members.filter((member) => member.id !== memberId);
  });
}

function cycleScore(memberId: string, dimensionId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "skills-heat-map") {
      return;
    }

    const member = block.members.find((entry) => entry.id === memberId);

    if (!member) {
      return;
    }

    const current = member.scores[dimensionId] ?? 5;
    member.scores[dimensionId] = current >= 10 ? 1 : current + 1;
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
    return "border-warning/30 bg-warning/5 text-highlighted";
  }

  return "border-success/35 bg-success/10 text-success";
}

function getDimensionLabel(dimensionId: string) {
  return props.block.dimensions.find((d) => d.id === dimensionId)?.label ?? "Skill";
}
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-3xl bg-primary/5 p-5 border border-primary/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Team</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-primary">
          {{ summary.memberCount }}
        </p>
      </div>

      <div class="rounded-3xl bg-success/5 p-5 border border-success/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Avg Score</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-success">
          {{ summary.overallAverage }}/10
        </p>
      </div>

      <div class="rounded-3xl bg-error/5 p-5 border border-error/10">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Critical Gaps</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-error">
          {{ summary.criticalGapCount }}
        </p>
      </div>

      <div class="rounded-3xl bg-elevated/10 p-5 border border-muted/20">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Strongest</p>
        <p class="mt-2 text-lg font-black tracking-tight text-highlighted">
          {{
            summary.strongestDimension
              ? getDimensionLabel(summary.strongestDimension)
              : "Unclear"
          }}
        </p>
        <p class="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted/60">
          {{
            summary.strongestDimension
              ? `${summary.averageByDimension[summary.strongestDimension] ?? 0}/10 team average`
              : "Add scores to rank the team."
          }}
        </p>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <div>
        <p class="text-sm font-semibold text-highlighted">Skills matrix</p>
        <p class="text-sm text-muted">
          Click any score to cycle it from 1 to 10. The average column updates automatically.
        </p>
      </div>

      <div class="flex gap-2">
        <UButton
          v-if="canAddDimension"
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          class="rounded-full px-4"
          @click="addDimension"
        >
          Add Skill
        </UButton>

        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-user-plus"
          class="rounded-full px-4"
          @click="addMember"
        >
          Add Team Member
        </UButton>
      </div>
    </div>

    <div
      v-if="block.dimensions.length === 0"
      class="border-dashed border-muted/20 rounded-3xl py-12 text-center bg-elevated/5"
    >
      <p class="text-sm font-semibold text-muted">No skill dimensions added yet.</p>
      <UButton
        color="neutral"
        variant="soft"
        icon="i-lucide-plus"
        class="mt-4 rounded-full px-4"
        @click="initializeDimensions"
      >
        Initialize Default Dimensions
      </UButton>
    </div>

    <div
      v-else-if="block.members.length === 0"
      class="border-dashed border-muted/20 rounded-3xl py-12 text-center bg-elevated/5"
    >
      <p class="text-sm font-semibold text-muted">No team members added yet.</p>
    </div>

    <template v-else>
      <div class="flex flex-wrap gap-2">
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

      <div class="overflow-x-auto pb-2">
        <table class="min-w-[880px] w-full border-separate border-spacing-y-3">
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
                      mutateBlock(tabId, block.id, (entry) => {
                        if (entry.type !== 'skills-heat-map') return;
                        const target = entry.dimensions.find((d) => d.id === dimension.id);
                        if (!target) return;
                        target.label = ($event ?? '').slice(0, 80);
                      })
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
                    mutateBlock(tabId, block.id, (entry) => {
                      if (entry.type !== 'skills-heat-map') return;
                      const target = entry.members.find((candidate) => candidate.id === member.id);
                      if (!target) return;
                      target.name = ($event ?? '').slice(0, 120);
                    })
                  "
                />
                <UInput
                  :model-value="member.role"
                  variant="none"
                  placeholder="Role"
                  class="mt-1"
                  :ui="{ base: 'px-0 text-xs text-muted/70 font-medium placeholder:text-muted/60' }"
                  @update:model-value="
                    mutateBlock(tabId, block.id, (entry) => {
                      if (entry.type !== 'skills-heat-map') return;
                      const target = entry.members.find((candidate) => candidate.id === member.id);
                      if (!target) return;
                      target.role = ($event ?? '').slice(0, 120);
                    })
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
                  :class="getScoreClasses(member.scores[dimension.id] ?? 5)"
                  @click="cycleScore(member.id, dimension.id)"
                >
                  {{ member.scores[dimension.id] ?? 5 }}
                </button>
              </td>

              <td class="border-y border-muted/20 bg-default/40 px-3 py-4 text-center">
                <div
                  class="rounded-2xl border px-3 py-4 text-lg font-black tracking-tight"
                  :class="getScoreClasses(getSkillsHeatMapMemberAverage(member.scores, block.dimensions.map(d => d.id)))"
                >
                  {{ getSkillsHeatMapMemberAverage(member.scores, block.dimensions.map(d => d.id)) }}
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
              <td class="px-3 pt-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Team Average</td>
              <td
                v-for="dimension in block.dimensions"
                :key="`avg-${dimension.id}`"
                class="px-3 pt-2 text-center"
              >
                <div
                  class="rounded-2xl border px-3 py-3 text-sm font-bold"
                  :class="getScoreClasses(summary.averageByDimension[dimension.id] ?? 0)"
                >
                  {{ summary.averageByDimension[dimension.id] ?? 0 }}
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
    </template>
  </div>
</template>
