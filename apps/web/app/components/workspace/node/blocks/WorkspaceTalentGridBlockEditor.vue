<script setup lang="ts">
import {
  createWorkspaceTalentGridMember,
  getTalentGridBoxKey,
  getTalentGridSummary,
  workspaceTalentGridBoxLabels,
  type WorkspaceTalentGridBlock,
  type WorkspaceTalentGridBoxKey,
} from "@brainiac/workspace";

import { useWorkspaceNodeEditorContext } from "~/components/workspace/node/context";

const props = defineProps<{
  block: WorkspaceTalentGridBlock;
  tabId: string;
}>();

const { mutateBlock } = useWorkspaceNodeEditorContext();

const summary = computed(() => getTalentGridSummary(props.block));

const gridRows: Array<{
  label: string;
  cells: WorkspaceTalentGridBoxKey[];
}> = [
  {
    label: "High Growth Potential",
    cells: ["enigma", "growth-star", "superstar"],
  },
  {
    label: "Moderate Growth Potential",
    cells: ["under-performer", "core-player", "high-performer"],
  },
  {
    label: "Specialized Potential",
    cells: ["risk", "average-joe", "specialist"],
  },
];

const performanceColumns = ["Building Foundation", "Solid Performance", "Excelling"];

const membersByBox = computed(() => {
  const grouped = new Map<WorkspaceTalentGridBoxKey, WorkspaceTalentGridBlock["members"]>();

  for (const row of gridRows) {
    for (const cell of row.cells) {
      grouped.set(cell, []);
    }
  }

  for (const member of props.block.members) {
    const key = getTalentGridBoxKey(member.performance, member.potential);
    const current = grouped.get(key);

    if (current) {
      current.push(member);
    } else {
      grouped.set(key, [member]);
    }
  }

  return grouped;
});

function addMember() {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "talent-grid") {
      return;
    }

    block.members.push(createWorkspaceTalentGridMember());
  });
}

function removeMember(memberId: string) {
  mutateBlock(props.tabId, props.block.id, (block) => {
    if (block.type !== "talent-grid") {
      return;
    }

    block.members = block.members.filter((member) => member.id !== memberId);
  });
}

function clampGridScore(value: string) {
  const numeric = Number(value || 3);
  return Math.min(5, Math.max(1, Math.round(numeric)));
}

function getCellClasses(key: WorkspaceTalentGridBoxKey) {
  switch (key) {
    case "superstar":
    case "growth-star":
      return "border-success/35 bg-success/10";
    case "high-performer":
    case "specialist":
      return "border-primary/35 bg-primary/5";
    case "core-player":
    case "average-joe":
      return "border-muted/35 bg-elevated/50";
    case "risk":
    case "under-performer":
      return "border-error/35 bg-error/10";
    default:
      return "border-warning/35 bg-warning/10";
  }
}

function getCellTone(key: WorkspaceTalentGridBoxKey): "success" | "primary" | "neutral" | "warning" | "error" {
  switch (key) {
    case "superstar":
    case "growth-star":
      return "success";
    case "high-performer":
    case "specialist":
      return "primary";
    case "core-player":
    case "average-joe":
      return "neutral";
    case "risk":
    case "under-performer":
      return "error";
    default:
      return "warning";
  }
}

function getBoxDescription(key: WorkspaceTalentGridBoxKey): string {
  const descriptions: Record<WorkspaceTalentGridBoxKey, string> = {
    "superstar": "Exceeds expectations with high growth potential",
    "growth-star": "Strong performer ready for advancement",
    "high-performer": "Consistent excellence in current role",
    "enigma": "High potential seeking clearer direction",
    "core-player": "Reliable contributor to team success",
    "average-joe": "Steady performer in established domain",
    "under-performer": "Support needed to reach full potential",
    "specialist": "Deep expertise in focused area",
    "risk": "Opportunity for role alignment discussion",
  };
  return descriptions[key] || "";
}
</script>

<template>
  <div class="space-y-6">
    <!-- Team Summary Stats -->
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Team</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-primary">
          {{ summary.memberCount }}
        </p>
      </div>

      <div class="rounded-2xl border border-success/20 bg-success/5 p-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-success/70">Growth Ready</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-success">
          {{ summary.superstarCount + summary.growthStarCount }}
        </p>
      </div>

      <div class="rounded-2xl border border-muted/20 bg-elevated/10 p-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Core Contributors</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-highlighted">
          {{ summary.corePlayerCount }}
        </p>
      </div>

      <div class="rounded-2xl border border-warning/20 bg-warning/5 p-4">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-warning/70">Development Focus</p>
        <p class="mt-2 text-xl sm:text-2xl font-black tracking-tight text-warning">
          {{ summary.riskCount + summary.underPerformerCount }}
        </p>
      </div>
    </div>

    <!-- Section Header -->
    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <div>
        <h2 class="text-sm font-black text-highlighted tracking-tight">Talent Development Grid</h2>
        <p class="text-xs text-muted">
          Assess performance (1-5) and growth potential to support team development.
        </p>
      </div>

      <UButton
        color="primary"
        variant="soft"
        icon="i-lucide-user-plus"
        size="sm"
        class="rounded-full"
        @click="addMember"
      >
        Add Member
      </UButton>
    </div>

    <!-- 9-Box Grid Visualization -->
    <div class="overflow-x-auto pb-2">
      <div
        class="grid min-w-[740px] gap-2.5"
        style="grid-template-columns: 7rem repeat(3, minmax(0, 1fr))"
      >
        <div />

        <div
          v-for="column in performanceColumns"
          :key="column"
          class="rounded-xl border border-muted/20 bg-elevated/10 px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
        >
          {{ column }}
        </div>

        <template v-for="row in gridRows" :key="row.label">
          <div
            class="flex items-center rounded-xl border border-muted/20 bg-elevated/5 px-2.5 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
          >
            {{ row.label }}
          </div>

          <div
            v-for="cell in row.cells"
            :key="cell"
            class="min-h-[140px] rounded-2xl border p-3.5"
            :class="getCellClasses(cell)"
          >
            <div class="flex items-start justify-between gap-2 mb-3">
              <div class="flex-1">
                <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
                  {{ workspaceTalentGridBoxLabels[cell] }}
                </p>
                <p class="mt-1 text-[9px] text-muted/40 leading-tight">
                  {{ membersByBox.get(cell)?.length ?? 0 }} member{{ (membersByBox.get(cell)?.length ?? 0) !== 1 ? 's' : '' }}
                </p>
              </div>
            </div>

            <div class="flex flex-wrap gap-1.5">
              <div
                v-for="member in membersByBox.get(cell)"
                :key="member.id"
                class="rounded-full border border-muted/20 bg-default/80 px-2.5 py-0.5 text-[11px] font-semibold text-highlighted"
              >
                {{ member.name || "—" }}
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Member Cards -->
    <div
      v-if="block.members.length === 0"
      class="rounded-2xl border border-dashed border-muted/20 bg-elevated/5 py-10 text-center"
    >
      <div class="flex size-12 items-center justify-center rounded-xl bg-muted/10 text-muted/30 mx-auto">
        <UIcon name="i-lucide-users" size="24" />
      </div>
      <p class="mt-3 text-xs font-bold text-muted">No team members yet</p>
      <p class="mt-1 text-[11px] text-muted/60">Add members to assess and develop your team</p>
    </div>

    <div v-else class="space-y-3">
      <article
        v-for="member in block.members"
        :key="member.id"
        class="rounded-2xl border border-muted/20 bg-default/40 p-4 transition-all hover:border-muted/30"
      >
        <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div class="min-w-0 flex-1">
            <UInput
              :model-value="member.name"
              variant="none"
              placeholder="Name"
              class="w-full"
              :ui="{ base: 'px-0 text-base font-bold text-highlighted placeholder:text-muted/40' }"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'talent-grid') return;
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
              class="mt-0.5"
              :ui="{ base: 'px-0 text-xs text-muted placeholder:text-muted/40' }"
              @update:model-value="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'talent-grid') return;
                  const target = entry.members.find((candidate) => candidate.id === member.id);
                  if (!target) return;
                  target.role = ($event ?? '').slice(0, 120);
                })
              "
            />
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <UBadge
              :color="getCellTone(getTalentGridBoxKey(member.performance, member.potential))"
              variant="soft"
              size="sm"
              class="rounded-full"
            >
              {{
                workspaceTalentGridBoxLabels[
                  getTalentGridBoxKey(member.performance, member.potential)
                ]
              }}
            </UBadge>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              size="sm"
              class="rounded-lg hover:text-error hover:bg-error/10"
              aria-label="Remove member"
              @click="removeMember(member.id)"
            />
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl border border-muted/20 bg-elevated/10 p-3">
            <div class="flex items-center justify-between mb-2">
              <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                for="performance-{{ member.id }}"
              >
                Performance
              </label>
              <span class="text-xs font-black text-primary">{{ member.performance }}/5</span>
            </div>
            <input
              :id="'performance-' + member.id"
              :value="member.performance"
              type="range"
              min="1"
              max="5"
              step="1"
              class="h-1.5 w-full appearance-none rounded-full bg-muted/20 accent-primary cursor-pointer"
              @input="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'talent-grid') return;
                  const target = entry.members.find((candidate) => candidate.id === member.id);
                  if (!target) return;
                  target.performance = clampGridScore(
                    ($event.target as HTMLInputElement | null)?.value ?? '3',
                  );
                })
              "
            />
          </div>

          <div class="rounded-xl border border-muted/20 bg-elevated/10 p-3">
            <div class="flex items-center justify-between mb-2">
              <label class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                for="potential-{{ member.id }}"
              >
                Growth Potential
              </label>
              <span class="text-xs font-black text-primary">{{ member.potential }}/5</span>
            </div>
            <input
              :id="'potential-' + member.id"
              :value="member.potential"
              type="range"
              min="1"
              max="5"
              step="1"
              class="h-1.5 w-full appearance-none rounded-full bg-muted/20 accent-primary cursor-pointer"
              @input="
                mutateBlock(tabId, block.id, (entry) => {
                  if (entry.type !== 'talent-grid') return;
                  const target = entry.members.find((candidate) => candidate.id === member.id);
                  if (!target) return;
                  target.potential = clampGridScore(
                    ($event.target as HTMLInputElement | null)?.value ?? '3',
                  );
                })
              "
            />
          </div>
        </div>

        <div v-if="getBoxDescription(getTalentGridBoxKey(member.performance, member.potential))" class="mt-3 rounded-lg bg-muted/5 px-3 py-2">
          <p class="text-[10px] text-muted/70 leading-snug">
            {{ getBoxDescription(getTalentGridBoxKey(member.performance, member.potential)) }}
          </p>
        </div>
      </article>
    </div>
  </div>
</template>
