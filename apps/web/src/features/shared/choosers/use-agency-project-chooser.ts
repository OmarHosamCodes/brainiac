import { useMemo } from "react";

import type { AgencyProject } from "@/features/task-management/agency-work";
import {
  groupItemsByClient,
  projectSearchableText,
  sortProjectsByClientThenName,
  useAgencyChooserOpenState,
} from "@/features/shared/choosers/agency-chooser-shell";

type Project = Pick<AgencyProject, "id" | "clientName" | "name">;

type UseAgencyProjectChooserOptions = {
  value: string;
  onValueChange: (value: string) => void;
  projects: Project[];
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentAlign?: "start" | "center" | "end";
  autoFocus?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
};

export type AgencyProjectChooserClientGroup = {
  clientName: string;
  projects: Project[];
};

export type AgencyProjectChooserViewModel = {
  value: string;
  disabled: boolean;
  loading: boolean;
  placeholder: string;
  searchPlaceholder: string;
  className?: string;
  contentAlign: "start" | "center" | "end";
  autoFocus: boolean;
  allowEmpty: boolean;
  emptyLabel: string;
  open: boolean;
  searchTerm: string;
  selectedProject: Project | null;
  groupedProjects: AgencyProjectChooserClientGroup[];
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onSelectProject: (projectId: string) => void;
  onClearSelection: () => void;
};

export function useAgencyProjectChooser({
  value,
  onValueChange,
  projects,
  disabled = false,
  loading = false,
  placeholder = "Choose project",
  searchPlaceholder = "Search projects or clients",
  className,
  open: controlledOpen,
  onOpenChange,
  contentAlign = "start",
  autoFocus = false,
  allowEmpty = false,
  emptyLabel = "All projects",
}: UseAgencyProjectChooserOptions): AgencyProjectChooserViewModel {
  const { open, searchTerm, setSearchTerm, setOpen } = useAgencyChooserOpenState({
    controlledOpen,
    onOpenChange,
  });

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === value) ?? null,
    [projects, value],
  );

  const filteredProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return projects;

    return projects.filter((project) => projectSearchableText(project).includes(query));
  }, [projects, searchTerm]);

  const groupedProjects = useMemo(
    () => groupItemsByClient(filteredProjects, sortProjectsByClientThenName),
    [filteredProjects],
  );

  function selectProject(projectId: string) {
    onValueChange(projectId);
    setOpen(false);
  }

  function clearSelection() {
    onValueChange("");
    setOpen(false);
  }

  return {
    value,
    disabled,
    loading,
    placeholder: allowEmpty && !value ? emptyLabel : placeholder,
    searchPlaceholder,
    className,
    contentAlign,
    autoFocus,
    allowEmpty,
    emptyLabel,
    open,
    searchTerm,
    selectedProject,
    groupedProjects,
    onOpenChange: setOpen,
    onSearchChange: setSearchTerm,
    onSelectProject: selectProject,
    onClearSelection: clearSelection,
  };
}
