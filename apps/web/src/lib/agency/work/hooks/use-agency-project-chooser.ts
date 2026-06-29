import { useMemo, useState } from "react";

import type { AgencyProject } from "@/lib/schemas/agency-work";

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
  open: boolean;
  searchTerm: string;
  selectedProject: Project | null;
  groupedProjects: AgencyProjectChooserClientGroup[];
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onSelectProject: (projectId: string) => void;
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
}: UseAgencyProjectChooserOptions): AgencyProjectChooserViewModel {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const open = controlledOpen ?? uncontrolledOpen;

  function setOpen(nextOpen: boolean) {
    onOpenChange?.(nextOpen);
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    if (!nextOpen) {
      setSearchTerm("");
    }
  }

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === value) ?? null,
    [projects, value],
  );

  const filteredProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return projects;

    return projects.filter((project) => {
      const searchableText = [project.name, project.clientName, `${project.clientName} · ${project.name}`]
        .join(" ")
        .toLowerCase();
      return searchableText.includes(query);
    });
  }, [projects, searchTerm]);

  const groupedProjects = useMemo(() => {
    const sortedProjects = [...filteredProjects].sort((left, right) => {
      const clientSort = left.clientName.localeCompare(right.clientName);
      return clientSort || left.name.localeCompare(right.name);
    });

    const clientGroups: AgencyProjectChooserClientGroup[] = [];
    let currentGroup: AgencyProjectChooserClientGroup | null = null;

    for (const project of sortedProjects) {
      if (!currentGroup || currentGroup.clientName !== project.clientName) {
        currentGroup = { clientName: project.clientName, projects: [] };
        clientGroups.push(currentGroup);
      }
      currentGroup.projects.push(project);
    }

    return clientGroups;
  }, [filteredProjects]);

  function selectProject(projectId: string) {
    onValueChange(projectId);
    setOpen(false);
  }

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
    selectedProject,
    groupedProjects,
    onOpenChange: setOpen,
    onSearchChange: setSearchTerm,
    onSelectProject: selectProject,
  };
}
