/** Shared Tailwind class strings for the dashboard agent chat dock. */

import {
  shellEmptyPanelClass,
  shellErrorPanelClass,
  shellFocusRingClass,
  shellLabelClass,
} from "@/lib/utils/app-shell-ui";

export const agentChatLabelClass = shellLabelClass;

export const agentChatFocusRingClass = shellFocusRingClass;

export const agentChatEmptyPanelClass = shellEmptyPanelClass;

export const agentChatErrorPanelClass = shellErrorPanelClass;

export const agentChatRailClass =
  "flex h-full w-[200px] shrink-0 flex-col border-r border-default bg-elevated";

export const agentChatRailSlideoverClass =
  "absolute inset-y-0 left-0 z-30 flex w-[min(240px,85vw)] flex-col border-r border-default bg-elevated shadow-[0_4px_16px_oklch(0.18_0.005_285_/_0.08)] motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out";

export const agentChatRailItemBaseClass =
  "flex w-full flex-col gap-0.5 rounded-xl border px-2.5 py-2 text-left transition-colors";

export const agentChatRailItemActiveClass = "border-primary/30 bg-primary/10 text-primary";

export const agentChatRailItemIdleClass =
  "border-transparent text-highlighted hover:border-default hover:bg-muted/40";

export const agentChatMessageUserClass =
  "ml-8 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-highlighted";

export const agentChatMessageAssistantClass =
  "mr-4 rounded-xl border border-default bg-muted/20 px-3 py-2 text-sm text-highlighted";

export const agentChatToolTraceClass =
  "mt-2 rounded-lg border border-default bg-default px-2.5 py-2 font-mono text-xs";

export const agentChatComposerClass = "border-t border-default bg-default p-3";

export const agentChatPresetSegmentClass =
  "inline-flex rounded-xl border border-default bg-muted/30 p-0.5";

export const agentChatPresetButtonClass =
  "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors";

export const agentChatPresetButtonActiveClass = "bg-default text-highlighted shadow-sm";

export const agentChatPresetButtonIdleClass = "text-muted hover:text-highlighted";
