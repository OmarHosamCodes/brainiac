import { watch } from "vue";
import { clampAgentDockWidth, useAppShell } from "~/composables/useAppShell";

const APP_SHELL_AGENT_OPEN_KEY = "brainiac.app-shell.agent-open";
const APP_SHELL_AGENT_WIDTH_KEY = "brainiac.app-shell.agent-width";

export default defineNuxtPlugin(() => {
  const { agentDockOpen, agentDockWidth } = useAppShell();

  // Hydrate from localStorage on the client once.
  const savedOpen = localStorage.getItem(APP_SHELL_AGENT_OPEN_KEY);
  const savedWidth = localStorage.getItem(APP_SHELL_AGENT_WIDTH_KEY);

  if (savedOpen === "true" || savedOpen === "false") {
    agentDockOpen.value = savedOpen === "true";
  }

  if (savedWidth) {
    const parsedWidth = Number(savedWidth);

    if (!Number.isNaN(parsedWidth)) {
      agentDockWidth.value = clampAgentDockWidth(parsedWidth);
    }
  }

  // Single persistence watcher for the lifetime of the app.
  watch(
    [agentDockOpen, agentDockWidth],
    ([nextOpen, nextWidth]) => {
      localStorage.setItem(APP_SHELL_AGENT_OPEN_KEY, String(nextOpen));
      localStorage.setItem(APP_SHELL_AGENT_WIDTH_KEY, String(clampAgentDockWidth(nextWidth)));
    },
    { flush: "post" },
  );
});
