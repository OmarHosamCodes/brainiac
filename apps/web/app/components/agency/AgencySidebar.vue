<script setup lang="ts">
type AgencySection = "overview" | "dashboard" | "management";

type TeamItem = {
  id: string;
  name: string;
};

const props = defineProps<{
  section: AgencySection;
  teamId: string;
  teams: TeamItem[];
}>();

const emit = defineEmits<{
  "update:section": [value: AgencySection];
  "update:teamId": [value: string];
}>();

const sections: Array<{
  value: AgencySection;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: "overview",
    label: "Overview",
    description: "Run timers and review your entries",
    icon: "i-lucide-timer",
  },
  {
    value: "dashboard",
    label: "Dashboard",
    description: "Team-wide hours and activity",
    icon: "i-lucide-bar-chart-3",
  },
  {
    value: "management",
    label: "Management",
    description: "Clients, projects, and tags",
    icon: "i-lucide-folder-cog",
  },
];

const teamItems = computed(() =>
  props.teams.map((team) => ({
    label: team.name,
    value: team.id,
  })),
);

function selectSection(section: AgencySection) {
  emit("update:section", section);
}

function selectTeam(value: string | number | undefined) {
  if (typeof value === "string" && value) {
    emit("update:teamId", value);
  }
}
</script>

<template>
  <aside
    class="flex w-full shrink-0 flex-col gap-4 rounded-3xl border border-zinc-200/30 bg-zinc-950/40 p-4 backdrop-blur-sm dark:border-zinc-800/50 dark:bg-zinc-950/50 md:w-64"
  >
    <div>
      <p class="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Team</p>
      <USelect
        :model-value="teamId"
        :items="teamItems"
        placeholder="Select team"
        size="sm"
        class="w-full"
        @update:model-value="selectTeam($event as string)"
      />
    </div>

    <div class="h-px bg-muted/20" />

    <nav class="flex flex-col gap-1">
      <p class="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Sections</p>
      <button
        v-for="item in sections"
        :key="item.value"
        type="button"
        class="group flex items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left transition-colors"
        :class="
          section === item.value
            ? 'border-emerald-500/30 bg-emerald-500/10 text-highlighted'
            : 'text-muted hover:border-zinc-200/20 hover:bg-zinc-900/40 hover:text-highlighted dark:hover:border-zinc-800/50'
        "
        @click="selectSection(item.value)"
      >
        <UIcon
          :name="item.icon"
          class="mt-0.5 size-4 shrink-0"
          :class="section === item.value ? 'text-emerald-500' : ''"
        />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium leading-tight">{{ item.label }}</p>
          <p class="mt-0.5 text-xs leading-snug text-muted">{{ item.description }}</p>
        </div>
      </button>
    </nav>
  </aside>
</template>
