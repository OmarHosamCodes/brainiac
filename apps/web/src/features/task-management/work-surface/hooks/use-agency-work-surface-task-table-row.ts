import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import {
  taskDueDateDraftToIso,
  taskDueDateToDraft,
  type TaskDueDateDraft,
} from "@/features/task-management/agency-task-utils";
import type {
  AgencyWorkSurfaceTaskTableRowProps,
  AgencyWorkSurfaceTaskTableRowViewModel,
} from "@/features/task-management/work-surface/agency-work-surface-task-table-row-model";
import { useTheme } from "@/stores/theme";

function taskDescription(task: AgencyWorkSurfaceTaskTableRowProps["task"]): string {
  return task.viewerBlueprints?.[0]?.description?.trim() ?? "";
}

export function useAgencyWorkSurfaceTaskTableRow(
  props: AgencyWorkSurfaceTaskTableRowProps,
): AgencyWorkSurfaceTaskTableRowViewModel {
  const {
    task,
    variant,
    isRowPending = false,
    onStatusChange,
    onDueDateChange,
    onDescriptionChange,
    onReopenToActive,
    onDelete,
  } = props;
  const { isDark } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dueEditorOpen, setDueEditorOpen] = useState(false);
  const [dueDraft, setDueDraft] = useState<TaskDueDateDraft>({ date: "", time: "" });
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const skipDescriptionCommitRef = useRef(false);
  const description = taskDescription(task);
  const canEditDescription =
    Boolean(onDescriptionChange) &&
    variant !== "delegated" &&
    (variant !== "done" || Boolean(description));

  useEffect(() => {
    if (!dueEditorOpen) return;
    setDueDraft(taskDueDateToDraft(task.dueDate));
  }, [dueEditorOpen, task.dueDate, task.id]);

  useEffect(() => {
    if (!editingDescription) return;
    descriptionInputRef.current?.focus();
  }, [editingDescription]);

  function beginDescriptionEdit() {
    if (!canEditDescription || isRowPending) return;
    skipDescriptionCommitRef.current = false;
    setDescriptionDraft(description);
    setEditingDescription(true);
  }

  function cancelDescriptionEdit() {
    skipDescriptionCommitRef.current = true;
    setDescriptionDraft(description);
    setEditingDescription(false);
  }

  function commitDescriptionEdit() {
    if (skipDescriptionCommitRef.current) {
      skipDescriptionCommitRef.current = false;
      return;
    }
    if (!onDescriptionChange) return;
    const next = descriptionDraft.trim();
    setEditingDescription(false);
    if (next === description) return;
    onDescriptionChange(task, next);
  }

  function handleDescriptionKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      commitDescriptionEdit();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelDescriptionEdit();
    }
  }

  function commitDueDate() {
    if (!onDueDateChange) return;

    if (!dueDraft.date) {
      if (task.dueDate) onDueDateChange(task, null);
      return;
    }

    const nextDueDate = taskDueDateDraftToIso({
      date: dueDraft.date,
      time: dueDraft.time || "12:00",
    });
    if (nextDueDate !== task.dueDate) {
      onDueDateChange(task, nextDueDate);
    }
  }

  return {
    ...props,
    isDark,
    menuOpen,
    dueEditorOpen,
    dueDraft,
    editingDescription,
    descriptionDraft,
    description,
    canEditDescription,
    descriptionInputRef,
    onMenuOpenChange: setMenuOpen,
    onDueEditorOpenChange: (open) => {
      setDueEditorOpen(open);
      if (!open) commitDueDate();
    },
    onDueDraftDateChange: (value) => setDueDraft((current) => ({ ...current, date: value })),
    onDueDraftTimeChange: (value) => setDueDraft((current) => ({ ...current, time: value })),
    onClearDueDate: () => {
      onDueDateChange?.(task, null);
      setDueEditorOpen(false);
    },
    onBeginDescriptionEdit: beginDescriptionEdit,
    onDescriptionDraftChange: setDescriptionDraft,
    onDescriptionDraftKeyDown: handleDescriptionKeyDown,
    onDescriptionDraftBlur: commitDescriptionEdit,
    onMarkDone: () => {
      setMenuOpen(false);
      onStatusChange?.(task, "done");
    },
    onReopen: () => {
      setMenuOpen(false);
      onReopenToActive?.(task);
    },
    onRequestDelete: () => {
      setMenuOpen(false);
      onDelete?.(task);
    },
  };
}
