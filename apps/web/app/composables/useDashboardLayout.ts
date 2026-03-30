import { ref } from "vue";

export function useDashboardLayout() {
  const isChatVisible = ref(true);
  const isTeamAsideCompact = ref(true);

  return {
    isChatVisible,
    isTeamAsideCompact,
  };
}
