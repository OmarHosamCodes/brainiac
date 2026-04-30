import { ref } from "vue";

export function useDashboardLayout() {
  const isTeamAsideCompact = ref(true);

  return {
    isTeamAsideCompact,
  };
}
