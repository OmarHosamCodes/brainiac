import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import {
  taskDueDateDraftToIso,
  taskDueDateToDraft,
  type TaskDueDateDraft,
} from "@/features/task-management/agency-task-utils";
import type {
  AgencyWorkSurfaceTaskDelegatedBy,
  AgencyWorkSurfaceTaskDescriptionEntry,
  AgencyWorkSurfaceTaskTableRowProps,
  AgencyWorkSurfaceTaskTableRowViewModel,
} from "@/features/task-management/work-surface/agency-work-surface-task-table-row-model";
import { useTheme } from "@/stores/theme";

function taskDescriptionEntries(
  task: AgencyWorkSurfaceTaskTableRowProps["task"],
): AgencyWorkSurfaceTaskDescriptionEntry[] {
  return (task.viewerBlueprints ?? []).map((blueprint) => ({
    id: blueprint.id,
    description: blueprint.description.trim(),
  }));
}

function resolveDelegatedBy(
  task: AgencyWorkSurfaceTaskTableRowProps["task"],
  currentUserId: string | undefined,
  teamMembers: AgencyWorkSurfaceTaskTableRowProps["teamMembers"],
): AgencyWorkSurfaceTaskDelegatedBy | null {
  if (!currentUserId || !task.createdByUserId || task.createdByUserId === currentUserId) {
    return null;
  }

  const member = teamMembers?.find((entry) => entry.userId === task.createdByUserId);
  if (member) {
    return {
      userId: member.userId,
      userName: member.userName,
      userAvatar: member.userAvatar,
    };
  }

  const assignee = task.assignees.find((entry) => entry.userId === task.createdByUserId);
  if (assignee) {
    return {
      userId: assignee.userId,
      userName: assignee.userName,
      userAvatar: assignee.userAvatar,
    };
  }

  return {
    userId: task.createdByUserId,
    userName: "Teammate",
    userAvatar: null,
  };
}

export function useAgencyWorkSurfaceTaskTableRow(
  props: AgencyWorkSurfaceTaskTableRowProps,
): AgencyWorkSurfaceTaskTableRowViewModel {
  const {
    task,
    variant,
    isRowPending = false,
    currentUserId,
    teamMembers,
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
  const [editingBlueprintId, setEditingBlueprintId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [descriptionsExpanded, setDescriptionsExpanded] = useState(false);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const skipDescriptionCommitRef = useRef(false);
  const descriptionEntries = taskDescriptionEntries(task);
  const isMultiDescription = descriptionEntries.length > 1;
  const description = descriptionEntries[0]?.description ?? "";
  const delegatedBy = resolveDelegatedBy(task, currentUserId, teamMembers);
  const canEditDescription =
    Boolean(onDescriptionChange) &&
    variant !== "delegated" &&
    (variant !== "done" || Boolean(description) || isMultiDescription);

  useEffect(() => {
    if (!dueEditorOpen) return;
    setDueDraft(taskDueDateToDraft(task.dueDate));
  }, [dueEditorOpen, task.dueDate, task.id]);

  useEffect(() => {
    if (!editingDescription) return;
    descriptionInputRef.current?.focus();
  }, [editingDescription]);

  function beginDescriptionEdit(blueprintId?: string) {
    if (!canEditDescription || isRowPending) return;
    const targetId = blueprintId ?? descriptionEntries[0]?.id ?? null;
    const current =
      descriptionEntries.find((entry) => entry.id === targetId)?.description ?? description;
    skipDescriptionCommitRef.current = false;
    setEditingBlueprintId(targetId);
    setDescriptionDraft(current);
    setEditingDescription(true);
    if (isMultiDescription) setDescriptionsExpanded(true);
  }

  function cancelDescriptionEdit() {
    skipDescriptionCommitRef.current = true;
    setDescriptionDraft(description);
    setEditingBlueprintId(null);
    setEditingDescription(false);
  }

  function commitDescriptionEdit() {
    if (skipDescriptionCommitRef.current) {
      skipDescriptionCommitRef.current = false;
      return;
    }
    if (!onDescriptionChange) return;
    const next = descriptionDraft.trim();
    const previous =
      descriptionEntries.find((entry) => entry.id === editingBlueprintId)?.description ??
      description;
    setEditingDescription(false);
    const blueprintId = editingBlueprintId;
    setEditingBlueprintId(null);
    if (next === previous) return;
    onDescriptionChange(task, next, blueprintId ?? undefined);
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
    editingBlueprintId,
    descriptionDraft,
    description,
    descriptionEntries,
    isMultiDescription,
    descriptionsExpanded,
    canEditDescription,
    delegatedBy,
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
    onToggleDescriptionsExpanded: () => setDescriptionsExpanded((value) => !value),
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
