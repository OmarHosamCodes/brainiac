import { useEffect, useId, useState, type FormEvent } from "react";

import type { AgencyMemberOption } from "@/features/shared/agency-member-option";
import { useAgencyOpsStore } from "@/features/shared/stores/agency-ops";
import {
  canSaveMyTasksEdit,
  myTasksEditDraftFromTask,
  type MyTasksEditDraft,
} from "@/features/task-management/agency-my-tasks-edit-draft";
import type { AgencyProjectTask } from "@/features/task-management/agency-work";
import { getErrorMessage } from "@/lib/utils/get-error-message";

export type UseAgencyMyTasksEditDialogOptions = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: string;
  task: AgencyProjectTask;
  projectLabel: string;
  members: AgencyMemberOption[];
};

export type AgencyMyTasksEditDialogViewModel = {
  formId: string;
  projectLabel: string;
  members: AgencyMemberOption[];
  title: string;
  setTitle: (value: string) => void;
  assignedToTeam: boolean;
  setAssignedToTeam: (value: boolean) => void;
  assigneeUserIds: string[];
  setAssigneeUserIds: (value: string[]) => void;
  estimateMinutes: number | null;
  setEstimateMinutes: (value: number | null) => void;
  canSubmit: boolean;
  pending: boolean;
  editError: string | null;
  handleSubmit: (event: FormEvent) => Promise<void>;
  onCancel: () => void;
};

function emptyDraft(): MyTasksEditDraft {
  return {
    title: "",
    assignedToTeam: false,
    assigneeUserIds: [],
    estimateMinutes: null,
  };
}

export function useAgencyMyTasksEditDialog({
  open,
  onOpenChange,
  teamId,
  task,
  projectLabel,
  members,
}: UseAgencyMyTasksEditDialogOptions): AgencyMyTasksEditDialogViewModel {
  const formId = useId();
  const [baseline, setBaseline] = useState<MyTasksEditDraft>(emptyDraft);
  const [draft, setDraft] = useState<MyTasksEditDraft>(emptyDraft);
  const [editError, setEditError] = useState<string | null>(null);

  const updateProjectTask = useAgencyOpsStore((state) => state.updateProjectTask);
  const pendingTaskIds = useAgencyOpsStore((state) => state.pendingTaskIds);
  const pending = pendingTaskIds.includes(task.id);

  useEffect(() => {
    if (!open) {
      setEditError(null);
      return;
    }
    const next = myTasksEditDraftFromTask(task);
    setBaseline(next);
    setDraft(next);
    setEditError(null);
  }, [open, task.id]);

  const canSubmit = canSaveMyTasksEdit({ draft, baseline, pending });

  function setTitle(value: string) {
    setDraft((prev) => ({ ...prev, title: value }));
  }

  function setAssignedToTeam(value: boolean) {
    setDraft((prev) => ({
      ...prev,
      assignedToTeam: value,
      assigneeUserIds: value ? [] : prev.assigneeUserIds,
    }));
  }

  function setAssigneeUserIds(value: string[]) {
    setDraft((prev) => ({
      ...prev,
      assignedToTeam: false,
      assigneeUserIds: value,
    }));
  }

  function setEstimateMinutes(value: number | null) {
    setDraft((prev) => ({ ...prev, estimateMinutes: value }));
  }

  function onCancel() {
    onOpenChange(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setEditError(null);
    try {
      await updateProjectTask({
        teamId,
        taskId: task.id,
        title: draft.title.trim(),
        assignedToTeam: draft.assignedToTeam,
        assigneeUserIds: draft.assignedToTeam ? [] : draft.assigneeUserIds,
        estimateMinutes: draft.estimateMinutes,
      });
      onOpenChange(false);
    } catch (error) {
      setEditError(getErrorMessage(error, "Couldn't update task."));
    }
  }

  return {
    formId,
    projectLabel,
    members,
    title: draft.title,
    setTitle,
    assignedToTeam: draft.assignedToTeam,
    setAssignedToTeam,
    assigneeUserIds: draft.assigneeUserIds,
    setAssigneeUserIds,
    estimateMinutes: draft.estimateMinutes,
    setEstimateMinutes,
    canSubmit,
    pending,
    editError,
    handleSubmit,
    onCancel,
  };
}
