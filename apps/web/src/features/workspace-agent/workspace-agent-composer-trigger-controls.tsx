import { unstable_useComposerInput } from "@assistant-ui/react";
import { useEffect, useRef } from "react";

import type { WorkspaceAgentComposerTriggerSuggestion } from "@/features/workspace-agent/hooks/use-workspace-agent";

export function ComposerDraftBridge({
  draft,
  onDraftChange,
}: {
  draft: string;
  onDraftChange: (value: string) => void;
}) {
  const { value, setText } = unstable_useComposerInput();
  const syncingFromStore = useRef(false);

  useEffect(() => {
    if (syncingFromStore.current) {
      syncingFromStore.current = false;
      return;
    }
    if (value !== draft) {
      onDraftChange(value);
    }
  }, [draft, onDraftChange, value]);

  useEffect(() => {
    if (value === draft) return;
    syncingFromStore.current = true;
    setText(draft);
  }, [draft, setText, value]);

  return null;
}

export function ComposerTriggerKeyboard({
  composerTriggerOpen,
  composerTriggerSuggestions,
  onPickComposerTrigger,
  onDismissComposerTrigger,
}: {
  composerTriggerOpen: boolean;
  composerTriggerSuggestions: readonly WorkspaceAgentComposerTriggerSuggestion[];
  onPickComposerTrigger: (suggestion: WorkspaceAgentComposerTriggerSuggestion) => void;
  onDismissComposerTrigger: () => void;
}) {
  useEffect(() => {
    if (!composerTriggerOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onDismissComposerTrigger();
        return;
      }
      if (event.key === "Enter" && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
        const first = composerTriggerSuggestions[0];
        if (!first) return;
        event.preventDefault();
        event.stopPropagation();
        onPickComposerTrigger(first);
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [
    composerTriggerOpen,
    composerTriggerSuggestions,
    onDismissComposerTrigger,
    onPickComposerTrigger,
  ]);

  return null;
}

export function suggestionRowLabel(suggestion: WorkspaceAgentComposerTriggerSuggestion) {
  switch (suggestion.kind) {
    case "at":
      return suggestion.label;
    case "project":
      return `project · ${suggestion.label}`;
    case "task":
      return `task · ${suggestion.label}`;
    default: {
      const _exhaustive: never = suggestion.kind;
      return _exhaustive;
    }
  }
}
