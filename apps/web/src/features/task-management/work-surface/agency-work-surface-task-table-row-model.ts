import type { KeyboardEvent, ReactNode, RefObject } from "react";

import type {
  AgencyProjectTask,
  AgencyTaskProject,
  TaskStatus,
} from "@/features/task-management/agency-work";
import type { TaskDueDateDraft } from "@/features/task-management/agency-task-utils";

export type AgencyWorkSurfaceTaskTableVariant = "active" | "done" | "delegated";

export type AgencyWorkSurfaceTaskTableRowProps = {
  task: AgencyProjectTask;
  projects: AgencyTaskProject[];
  teamId: string;
  variant: AgencyWorkSurfaceTaskTableVariant;
  selected?: boolean;
  highlight?: boolean;
  isRowPending?: boolean;
  onSelect?: (taskId: string) => void;
  onSelectProject?: (projectId: string) => void;
  onStatusChange?: (task: AgencyProjectTask, status: TaskStatus) => void;
  onDueDateChange?: (task: AgencyProjectTask, dueDate: string | null) => void;
  onDescriptionChange?: (task: AgencyProjectTask, description: string) => void;
  onReopenToActive?: (task: AgencyProjectTask) => void;
  onDelete?: (task: AgencyProjectTask) => void;
};

export type RenderAgencyWorkSurfaceTaskTableRow = (
  props: AgencyWorkSurfaceTaskTableRowProps,
) => ReactNode;

export type AgencyWorkSurfaceTaskTableRowViewModel = AgencyWorkSurfaceTaskTableRowProps & {
  isDark: boolean;
  menuOpen: boolean;
  dueEditorOpen: boolean;
  dueDraft: TaskDueDateDraft;
  editingDescription: boolean;
  descriptionDraft: string;
  description: string;
  canEditDescription: boolean;
  descriptionInputRef: RefObject<HTMLInputElement | null>;
  onMenuOpenChange: (open: boolean) => void;
  onDueEditorOpenChange: (open: boolean) => void;
  onDueDraftDateChange: (value: string) => void;
  onDueDraftTimeChange: (value: string) => void;
  onClearDueDate: () => void;
  onBeginDescriptionEdit: () => void;
  onDescriptionDraftChange: (value: string) => void;
  onDescriptionDraftKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onDescriptionDraftBlur: () => void;
  onMarkDone: () => void;
  onReopen: () => void;
  onRequestDelete: () => void;
};
