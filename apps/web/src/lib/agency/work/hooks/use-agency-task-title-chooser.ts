import { useCallback, useEffect, useId, useMemo, useState } from "react";

import type { AgencyProjectTask } from "@/lib/schemas/agency-work";
import {
  filterTasksByTitleSearch,
} from "@/lib/utils/agency-task-title-filter";

type UseAgencyTaskTitleChooserOptions = {
  value: string;
  onValueChange: (value: string) => void;
  tasks: AgencyProjectTask[];
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentAlign?: "start" | "center" | "end";
  autoFocus?: boolean;
};

export type AgencyTaskTitleChooserViewModel = {
  value: string;
  disabled: boolean;
  loading: boolean;
  placeholder: string;
  searchPlaceholder: string;
  className?: string;
  contentAlign: "start" | "center" | "end";
  autoFocus: boolean;
  open: boolean;
  searchTerm: string;
  filteredTasks: AgencyProjectTask[];
  showCreateRow: boolean;
  createRowLabel: string;
  listboxId: string;
  activeOptionId: string | undefined;
  activeIndex: number;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onSelectTask: (task: AgencyProjectTask) => void;
  onCreateFromSearch: () => void;
  onActiveIndexChange: (index: number) => void;
  onSearchKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
};

export function useAgencyTaskTitleChooser({
  value,
  onValueChange,
  tasks,
  disabled = false,
  loading = false,
  placeholder = "Create",
  searchPlaceholder = "Search tasks or type a new name",
  className,
  open: controlledOpen,
  onOpenChange,
  contentAlign = "start",
  autoFocus = false,
}: UseAgencyTaskTitleChooserOptions): AgencyTaskTitleChooserViewModel {
  const listboxId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const open = controlledOpen ?? uncontrolledOpen;

  function setOpen(nextOpen: boolean) {
    onOpenChange?.(nextOpen);
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    if (!nextOpen) {
      setSearchTerm("");
      setActiveIndex(-1);
    }
  }

  const filteredTasks = useMemo(
    () => filterTasksByTitleSearch(tasks, searchTerm),
    [searchTerm, tasks],
  );

  const trimmedSearch = searchTerm.trim();
  const showCreateRow = Boolean(trimmedSearch);
  const optionCount = filteredTasks.length + (showCreateRow ? 1 : 0);
  const createRowIndex = showCreateRow ? filteredTasks.length : -1;

  const activeOptionId =
    activeIndex >= 0 && activeIndex < filteredTasks.length
      ? `${listboxId}-option-${activeIndex}`
      : activeIndex === createRowIndex
        ? `${listboxId}-create`
        : undefined;

  const createRowLabel = trimmedSearch ? `Create "${trimmedSearch}"` : "Create";

  useEffect(() => {
    setActiveIndex(-1);
  }, [searchTerm, filteredTasks.length, showCreateRow]);

  const onSelectTask = useCallback(
    (task: AgencyProjectTask) => {
      onValueChange(task.title);
      setOpen(false);
    },
    [onValueChange],
  );

  const onCreateFromSearch = useCallback(() => {
    if (!trimmedSearch) return;
    onValueChange(trimmedSearch);
    setOpen(false);
  }, [onValueChange, trimmedSearch]);

  const onSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (optionCount === 0) {
        if (event.key === "Enter" && trimmedSearch) {
          event.preventDefault();
          onCreateFromSearch();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
        }
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => (current < optionCount - 1 ? current + 1 : 0));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => (current > 0 ? current - 1 : optionCount - 1));
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredTasks.length) {
          onSelectTask(filteredTasks[activeIndex]!);
          return;
        }
        if (activeIndex === createRowIndex) {
          onCreateFromSearch();
          return;
        }
        if (trimmedSearch) {
          onCreateFromSearch();
        }
      }
    },
    [
      activeIndex,
      createRowIndex,
      filteredTasks,
      onCreateFromSearch,
      onSelectTask,
      optionCount,
      tasks,
      trimmedSearch,
    ],
  );

  return {
    value,
    disabled,
    loading,
    placeholder,
    searchPlaceholder,
    className,
    contentAlign,
    autoFocus,
    open,
    searchTerm,
    filteredTasks,
    showCreateRow,
    createRowLabel,
    listboxId,
    activeOptionId,
    activeIndex,
    onOpenChange: setOpen,
    onSearchChange: setSearchTerm,
    onSelectTask,
    onCreateFromSearch,
    onActiveIndexChange: setActiveIndex,
    onSearchKeyDown,
  };
}
