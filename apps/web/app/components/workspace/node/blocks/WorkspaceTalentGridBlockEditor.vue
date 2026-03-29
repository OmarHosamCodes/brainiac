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
    label: "High Potential",
    cells: ["enigma", "growth-star", "superstar"],
  },
  {
    label: "Med Potential",
    cells: ["under-performer", "core-player", "high-performer"],
  },
  {
    label: "Low Potential",
    cells: ["risk", "average-joe", "specialist"],
  },
];

const performanceColumns = ["Low Performance", "Med Performance", "High Performance"];

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
</script>

<template>
  <div class="space-y-6">
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-3xl border border-primary/20 bg-primary/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">Team</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-primary">
          {{ summary.memberCount }}
        </p>
      </div>

      <div class="rounded-3xl border border-success/20 bg-success/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-success/70">Stars</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-success">
          {{ summary.superstarCount + summary.growthStarCount }}
        </p>
      </div>

      <div class="rounded-3xl border border-muted/20 bg-elevated/10 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">Core Players</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-highlighted">
          {{ summary.corePlayerCount }}
        </p>
      </div>

      <div class="rounded-3xl border border-error/20 bg-error/5 p-5">
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-error/70">Risk</p>
        <p class="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-error">
          {{ summary.riskCount }}
        </p>
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3 px-1">
      <div>
        <p class="text-sm font-semibold text-highlighted">9-box grid</p>
        <p class="text-xs text-muted">
          Move performance and potential from 1 to 5 and the member repositions instantly.
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

    <div class="overflow-x-auto pb-2">
      <div
        class="grid min-w-[860px] gap-3"
        style="grid-template-columns: 8rem repeat(3, minmax(0, 1fr))"
      >
        <div />

        <div
          v-for="column in performanceColumns"
          :key="column"
          class="rounded-2xl border border-muted/20 bg-elevated/10 px-4 py-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
        >
          {{ column }}
        </div>

        <template v-for="row in gridRows" :key="row.label">
          <div
            class="flex items-center rounded-2xl border border-muted/20 bg-elevated/5 px-3 py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
          >
            {{ row.label }}
          </div>

          <div
            v-for="cell in row.cells"
            :key="cell"
            class="min-h-[180px] rounded-3xl border p-4"
            :class="getCellClasses(cell)"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
                  {{ workspaceTalentGridBoxLabels[cell] }}
                </p>
                <p class="mt-1 text-[10px] font-bold text-muted/40 uppercase tracking-widest">
                  {{ membersByBox.get(cell)?.length ?? 0 }} people
                </p>
              </div>
            </div>

            <div class="mt-4 flex flex-wrap gap-2">
              <div
                v-for="member in membersByBox.get(cell)"
                :key="member.id"
                class="rounded-full border border-muted/20 bg-default/80 px-3 py-1 text-xs font-semibold text-highlighted"
              >
                {{ member.name || "Unnamed" }}
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div
      v-if="block.members.length === 0"
      class="rounded-3xl border border-dashed border-muted/20 bg-elevated/5 py-12 text-center"
    >
      <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60">
        No talent profiles yet.
      </p>
    </div>

    <div v-else class="space-y-4">
      <article
        v-for="member in block.members"
        :key="member.id"
        class="rounded-3xl border border-muted/20 bg-default/40 p-5"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <UInput
              :model-value="member.name"
              variant="none"
              placeholder="Name"
              class="w-full"
              :ui="{ base: 'px-0 text-lg font-bold text-highlighted placeholder:text-muted/60' }"
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
              class="mt-1"
              :ui="{ base: 'px-0 text-sm text-muted placeholder:text-muted/60' }"
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

          <div class="flex items-center gap-2">
            <UBadge variant="soft" size="sm" class="rounded-full">
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
              class="rounded-xl hover:text-error"
              @click="removeMember(member.id)"
            />
          </div>
        </div>

        <div class="mt-5 grid gap-4 md:grid-cols-2">
          <div class="rounded-2xl border border-muted/20 bg-elevated/10 p-4">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                >Performance</span
              >
              <span class="text-xs font-black text-primary">{{ member.performance }}/5</span>
            </div>
            <input
              :value="member.performance"
              type="range"
              min="1"
              max="5"
              step="1"
              class="mt-4 h-1.5 w-full appearance-none rounded-full bg-muted/20 accent-primary"
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

          <div class="rounded-2xl border border-muted/20 bg-elevated/10 p-4">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-muted/60"
                >Potential</span
              >
              <span class="text-xs font-black text-primary">{{ member.potential }}/5</span>
            </div>
            <input
              :value="member.potential"
              type="range"
              min="1"
              max="5"
              step="1"
              class="mt-4 h-1.5 w-full appearance-none rounded-full bg-muted/20 accent-primary"
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
      </article>
    </div>
  </div>
</template>
