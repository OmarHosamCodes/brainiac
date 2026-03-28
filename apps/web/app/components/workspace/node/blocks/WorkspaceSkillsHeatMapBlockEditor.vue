<script setup lang="ts">
import {
  WORKSPACE_PEOPLE_SKILL_DIMENSIONS,
  createWorkspaceSkillsHeatMapMember,
  getSkillsHeatMapMemberAverage,
  getSkillsHeatMapSummary,
  workspacePeopleSkillDimensionLabels,
  type WorkspacePeopleSkillDimension,
  type WorkspaceSkillsHeatMapBlock,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceSkillsHeatMapBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getSkillsHeatMapSummary(props.block));

function addMember() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "skills-heat-map") {
      return;
    }

    block.members.push(createWorkspaceSkillsHeatMapMember());
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

function cycleScore(memberId: string, dimension: WorkspacePeopleSkillDimension) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "skills-heat-map") {
      return;
    }

    const member = block.members.find((entry) => entry.id === memberId);

    if (!member) {
      return;
    }

    const current = member.scores[dimension];
    member.scores[dimension] = current >= 10 ? 1 : current + 1;
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
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div class="rounded-[28px] bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/70">Team</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-primary">{{ summary.memberCount }}</p>
      </div>

      <div class="rounded-[28px] bg-success/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-success/70">Avg Score</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-success">{{ summary.overallAverage }}/10</p>
      </div>

      <div class="rounded-[28px] bg-error/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-error/70">Critical Gaps</p>
        <p class="mt-2 text-4xl font-black tracking-tight text-error">{{ summary.criticalGapCount }}</p>
      </div>

      <div class="rounded-[28px] bg-elevated/70 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">Strongest</p>
        <p class="mt-2 text-lg font-black tracking-tight text-highlighted">
          {{
            summary.strongestDimension
              ? workspacePeopleSkillDimensionLabels[summary.strongestDimension]
              : "Unclear"
          }}
        </p>
        <p class="mt-1 text-sm text-muted">
          {{
            summary.strongestDimension
              ? `${summary.averageByDimension[summary.strongestDimension]}/10 team average`
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

    <div class="flex flex-wrap gap-2">
      <div class="rounded-full border border-error/30 bg-error/10 px-3 py-1 text-xs font-semibold text-error">
        1-3 Critical gap
      </div>
      <div class="rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
        4-5 Needs support
      </div>
      <div class="rounded-full border border-warning/20 bg-warning/5 px-3 py-1 text-xs font-semibold text-highlighted">
        6-7 Reliable
      </div>
      <div class="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
        8-10 Strength
      </div>
    </div>

    <div class="overflow-x-auto pb-2">
      <table class="min-w-[880px] w-full border-separate border-spacing-y-3">
        <thead>
          <tr>
            <th class="px-3 pb-1 text-left text-[10px] font-bold uppercase tracking-[0.24em] text-muted">
              Team Member
            </th>
            <th
              v-for="dimension in WORKSPACE_PEOPLE_SKILL_DIMENSIONS"
              :key="dimension"
              class="px-3 pb-1 text-center text-[10px] font-bold uppercase tracking-[0.24em] text-muted"
            >
              {{ workspacePeopleSkillDimensionLabels[dimension] }}
            </th>
            <th class="px-3 pb-1 text-center text-[10px] font-bold uppercase tracking-[0.24em] text-muted">
              Average
            </th>
            <th class="px-3 pb-1 text-right text-[10px] font-bold uppercase tracking-[0.24em] text-muted">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="member in block.members"
            :key="member.id"
            class="rounded-[28px] border border-muted/30 bg-default/70"
          >
            <td class="rounded-l-[28px] border-y border-l border-muted/30 bg-default/70 px-4 py-4 align-top">
              <UInput
                :model-value="member.name"
                variant="none"
                placeholder="Name"
                :ui="{ base: 'px-0 text-sm font-semibold text-highlighted placeholder:text-muted/60' }"
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
                :ui="{ base: 'px-0 text-xs text-muted placeholder:text-muted/60' }"
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
              v-for="dimension in WORKSPACE_PEOPLE_SKILL_DIMENSIONS"
              :key="`${member.id}-${dimension}`"
              class="border-y border-muted/30 bg-default/70 px-3 py-4 text-center"
            >
              <button
                type="button"
                class="w-full rounded-2xl border px-3 py-4 text-lg font-black tracking-tight transition hover:scale-[1.02]"
                :class="getScoreClasses(member.scores[dimension])"
                @click="cycleScore(member.id, dimension)"
              >
                {{ member.scores[dimension] }}
              </button>
            </td>

            <td class="border-y border-muted/30 bg-default/70 px-3 py-4 text-center">
              <div
                class="rounded-2xl border px-3 py-4 text-lg font-black tracking-tight"
                :class="getScoreClasses(getSkillsHeatMapMemberAverage(member.scores))"
              >
                {{ getSkillsHeatMapMemberAverage(member.scores) }}
              </div>
            </td>

            <td class="rounded-r-[28px] border-y border-r border-muted/30 bg-default/70 px-3 py-4 text-right">
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
            <td class="px-3 pt-2 text-left text-xs font-semibold text-muted">Team Average</td>
            <td
              v-for="dimension in WORKSPACE_PEOPLE_SKILL_DIMENSIONS"
              :key="`avg-${dimension}`"
              class="px-3 pt-2 text-center"
            >
              <div
                class="rounded-2xl border px-3 py-3 text-sm font-bold"
                :class="getScoreClasses(summary.averageByDimension[dimension])"
              >
                {{ summary.averageByDimension[dimension] }}
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
