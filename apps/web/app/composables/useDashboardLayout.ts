import { ref } from "vue";

export function useDashboardLayout(options?: { chatVisibleByDefault?: boolean }) {
  const isChatVisible = ref(options?.chatVisibleByDefault ?? true);
  const isTeamAsideCompact = ref(true);

  return {
    isChatVisible,
    isTeamAsideCompact,
  };
}
