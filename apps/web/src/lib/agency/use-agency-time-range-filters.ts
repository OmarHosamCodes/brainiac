import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import type { RangePreset } from "@/components/agency/agency-dashboard-command-bar";
import type { AgencyFilterOptionGroup } from "@/components/agency/agency-multi-select-filter";
import {
  allAgencyReportFieldIds,
  areSameReportFieldSets,
  type AgencyReportFieldId,
} from "@/lib/agency/reports/agency-report-fields";
import { fetchAllReportEntries } from "@/lib/agency/reports/fetch-report-entries";
import { orpc } from "@/lib/orpc";
import { useAgencyClientsQuery } from "@/lib/queries/agency";
import {
  getCurrentTenurePeriodRange,
  resolveDefaultDashboardRangePreset,
} from "@/lib/tenure-utils";

export function startOfWeekUtc(): Date {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
}

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dateInputToIso(value: string, endOfDay = false): string {
  if (!value) return new Date().toISOString();
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  if (endOfDay) date.setUTCHours(23, 59, 59, 999);
  return date.toISOString();
}

export type AgencyTimeRangeFilters = {
  range: { from: string; to: string };
  projectId?: string;
  memberUserId?: string;
  clientId?: string;
  clientIds?: string[];
  projectIds?: string[];
  memberUserIds?: string[];
  fields?: AgencyReportFieldId[];
};

export type AgencyTimeRangeFilterSnapshot = {
  id: string;
  savedAt: string;
  rangePreset: RangePreset;
  customFromDate: string;
  customToDate: string;
  clientId: string;
  projectId: string;
  memberUserId: string;
  clientIds: string[];
  projectIds: string[];
  memberUserIds: string[];
  fieldIds: AgencyReportFieldId[];
  range: { from: string; to: string };
};

type UseAgencyTimeRangeFiltersOptions = {
  teamId: string;
  includeClientFilter?: boolean;
  includeFieldsFilter?: boolean;
  fetchEntries?: boolean;
  multiSelectEntityFilters?: boolean;
  onFiltersApplied?: (snapshot: Omit<AgencyTimeRangeFilterSnapshot, "id" | "savedAt">) => void;
};

function sameIdList(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  return right.every((value) => leftSet.has(value));
}

function buildProjectFilterGroups(
  projects: Array<{ id: string; name: string; clientName: string }>,
): AgencyFilterOptionGroup[] {
  const sortedProjects = [...projects].sort(
    (left, right) =>
      left.clientName.localeCompare(right.clientName) || left.name.localeCompare(right.name),
  );
  const groups: AgencyFilterOptionGroup[] = [];
  let currentGroup: AgencyFilterOptionGroup | null = null;

  for (const project of sortedProjects) {
    if (!currentGroup || currentGroup.groupLabel !== project.clientName) {
      currentGroup = { groupLabel: project.clientName, options: [] };
      groups.push(currentGroup);
    }
    currentGroup.options!.push({ value: project.id, label: project.name });
  }

  return groups;
}

function resolveRangeFromPreset(
  preset: RangePreset,
  customFromDate: string,
  customToDate: string,
  tenurePolicy: Parameters<typeof getCurrentTenurePeriodRange>[0],
  now: Date,
): { from: string; to: string } {
  const endIso = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  ).toISOString();

  if (preset === "tenure") {
    const tenureRange = getCurrentTenurePeriodRange(tenurePolicy, now);
    if (tenureRange) {
      return { from: tenureRange.from, to: tenureRange.to };
    }
    return {
      from: new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
      ).toISOString(),
      to: endIso,
    };
  }
  if (preset === "month") {
    return {
      from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
      to: endIso,
    };
  }
  if (preset === "last30") {
    return {
      from: new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
      ).toISOString(),
      to: endIso,
    };
  }
  if (preset === "custom") {
    return {
      from: dateInputToIso(customFromDate),
      to: dateInputToIso(customToDate, true),
    };
  }
  return { from: startOfWeekUtc().toISOString(), to: endIso };
}

export function useAgencyTimeRangeFilters({
  teamId,
  includeClientFilter = false,
  includeFieldsFilter = false,
  fetchEntries = false,
  multiSelectEntityFilters = false,
  onFiltersApplied,
}: UseAgencyTimeRangeFiltersOptions) {
  const defaultFieldIds = allAgencyReportFieldIds();
  const now = useMemo(() => new Date(), []);

  const tenurePolicyQuery = useQuery({
    ...orpc.agencyOps.tenure.policy.get.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });
  const tenurePolicy = tenurePolicyQuery.data?.policy ?? null;
  const defaultRangePreset = useMemo(
    () => resolveDefaultDashboardRangePreset(tenurePolicy),
    [tenurePolicy],
  );

  const [appliedRangePreset, setAppliedRangePreset] = useState<RangePreset | null>(null);
  const effectiveAppliedRangePreset = appliedRangePreset ?? defaultRangePreset;
  const [appliedCustomFromDate, setAppliedCustomFromDate] = useState(
    toDateInputValue(startOfWeekUtc()),
  );
  const [appliedCustomToDate, setAppliedCustomToDate] = useState(toDateInputValue(now));
  const [appliedProjectId, setAppliedProjectId] = useState("");
  const [appliedMemberUserId, setAppliedMemberUserId] = useState("");
  const [appliedClientId, setAppliedClientId] = useState("");
  const [appliedClientIds, setAppliedClientIds] = useState<string[]>([]);
  const [appliedProjectIds, setAppliedProjectIds] = useState<string[]>([]);
  const [appliedMemberUserIds, setAppliedMemberUserIds] = useState<string[]>([]);
  const [appliedFieldIds, setAppliedFieldIds] = useState<AgencyReportFieldId[]>(defaultFieldIds);

  const [draftRangePreset, setDraftRangePreset] = useState<RangePreset | null>(null);
  const effectiveDraftRangePreset = draftRangePreset ?? defaultRangePreset;
  const [draftCustomFromDate, setDraftCustomFromDate] = useState(
    toDateInputValue(startOfWeekUtc()),
  );
  const [draftCustomToDate, setDraftCustomToDate] = useState(toDateInputValue(now));
  const [draftProjectId, setDraftProjectId] = useState("");
  const [draftMemberUserId, setDraftMemberUserId] = useState("");
  const [draftClientId, setDraftClientId] = useState("");
  const [draftClientIds, setDraftClientIds] = useState<string[]>([]);
  const [draftProjectIds, setDraftProjectIds] = useState<string[]>([]);
  const [draftMemberUserIds, setDraftMemberUserIds] = useState<string[]>([]);
  const [draftFieldIds, setDraftFieldIds] = useState<AgencyReportFieldId[]>(defaultFieldIds);

  const hasPendingFilterChanges =
    effectiveDraftRangePreset !== effectiveAppliedRangePreset ||
    (multiSelectEntityFilters
      ? !sameIdList(draftProjectIds, appliedProjectIds) ||
        !sameIdList(draftMemberUserIds, appliedMemberUserIds) ||
        (includeClientFilter && !sameIdList(draftClientIds, appliedClientIds))
      : draftProjectId !== appliedProjectId ||
        draftMemberUserId !== appliedMemberUserId ||
        (includeClientFilter && draftClientId !== appliedClientId)) ||
    (includeFieldsFilter && !areSameReportFieldSets(draftFieldIds, appliedFieldIds)) ||
    (effectiveDraftRangePreset === "custom" &&
      (draftCustomFromDate !== appliedCustomFromDate || draftCustomToDate !== appliedCustomToDate));

  const range = useMemo(
    () =>
      resolveRangeFromPreset(
        effectiveAppliedRangePreset,
        appliedCustomFromDate,
        appliedCustomToDate,
        tenurePolicy,
        now,
      ),
    [appliedCustomFromDate, appliedCustomToDate, effectiveAppliedRangePreset, now, tenurePolicy],
  );

  const applied: AgencyTimeRangeFilters = useMemo(
    () => ({
      range,
      ...(multiSelectEntityFilters
        ? {
            clientIds: appliedClientIds.length > 0 ? appliedClientIds : undefined,
            projectIds: appliedProjectIds.length > 0 ? appliedProjectIds : undefined,
            memberUserIds: appliedMemberUserIds.length > 0 ? appliedMemberUserIds : undefined,
          }
        : {
            projectId: appliedProjectId || undefined,
            memberUserId: appliedMemberUserId || undefined,
            ...(includeClientFilter ? { clientId: appliedClientId || undefined } : {}),
          }),
      ...(includeFieldsFilter ? { fields: appliedFieldIds } : {}),
    }),
    [
      appliedClientId,
      appliedClientIds,
      appliedFieldIds,
      appliedMemberUserId,
      appliedMemberUserIds,
      appliedProjectId,
      appliedProjectIds,
      includeClientFilter,
      includeFieldsFilter,
      multiSelectEntityFilters,
      range,
    ],
  );

  const projectsQuery = useQuery({
    ...orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });
  const clientsQuery = useAgencyClientsQuery(includeClientFilter ? teamId : "");
  const membersQuery = useQuery({
    ...orpc.agencyOps.taskThreads.members.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });

  const entriesQuery = useQuery({
    queryKey: [
      "agency-reports",
      "entries",
      teamId,
      range.from,
      range.to,
      multiSelectEntityFilters ? appliedClientIds : appliedClientId,
      multiSelectEntityFilters ? appliedProjectIds : appliedProjectId,
      multiSelectEntityFilters ? appliedMemberUserIds : appliedMemberUserId,
    ],
    queryFn: () =>
      fetchAllReportEntries(teamId, range, {
        ...(multiSelectEntityFilters
          ? {
              clientIds: appliedClientIds.length > 0 ? appliedClientIds : undefined,
              projectIds: appliedProjectIds.length > 0 ? appliedProjectIds : undefined,
              memberUserIds: appliedMemberUserIds.length > 0 ? appliedMemberUserIds : undefined,
            }
          : {
              clientId: appliedClientId || undefined,
              projectId: appliedProjectId || undefined,
              memberUserId: appliedMemberUserId || undefined,
            }),
      }),
    enabled: Boolean(teamId) && fetchEntries,
    placeholderData: keepPreviousData,
  });

  const projects = projectsQuery.data?.items ?? [];
  const clients = (clientsQuery.data?.items ?? []).map((client) => ({
    id: client.id,
    name: client.name,
  }));
  const filteredProjects = useMemo(() => {
    if (!includeClientFilter) return projects;
    if (multiSelectEntityFilters) {
      if (draftClientIds.length === 0) return projects;
      const clientSet = new Set(draftClientIds);
      return projects.filter((project) => clientSet.has(project.clientId));
    }
    if (!draftClientId) return projects;
    return projects.filter((project) => project.clientId === draftClientId);
  }, [draftClientId, draftClientIds, includeClientFilter, multiSelectEntityFilters, projects]);
  const projectFilterGroups = useMemo(
    () => buildProjectFilterGroups(filteredProjects),
    [filteredProjects],
  );
  const members = (membersQuery.data?.items ?? []).map((member) => ({
    userId: member.userId,
    userName: member.userName,
    avatar: member.userAvatar,
  }));

  function handleClientChange(clientId: string) {
    setDraftClientId(clientId);
    if (!clientId || !draftProjectId) return;
    const project = projects.find((entry) => entry.id === draftProjectId);
    if (project && project.clientId !== clientId) {
      setDraftProjectId("");
    }
  }

  function handleClientIdsChange(clientIds: string[]) {
    setDraftClientIds(clientIds);
    if (clientIds.length === 0 || draftProjectIds.length === 0) return;
    const clientSet = new Set(clientIds);
    const nextProjectIds = draftProjectIds.filter((projectId) => {
      const project = projects.find((entry) => entry.id === projectId);
      return project ? clientSet.has(project.clientId) : false;
    });
    if (!sameIdList(nextProjectIds, draftProjectIds)) {
      setDraftProjectIds(nextProjectIds);
    }
  }

  function buildSnapshot(
    preset: RangePreset,
    customFromDate: string,
    customToDate: string,
    projectId: string,
    memberUserId: string,
    clientId: string,
    clientIds: string[],
    projectIds: string[],
    memberUserIds: string[],
    fieldIds: AgencyReportFieldId[],
  ): Omit<AgencyTimeRangeFilterSnapshot, "id" | "savedAt"> {
    return {
      rangePreset: preset,
      customFromDate,
      customToDate,
      projectId,
      memberUserId,
      clientId,
      clientIds,
      projectIds,
      memberUserIds,
      fieldIds,
      range: resolveRangeFromPreset(preset, customFromDate, customToDate, tenurePolicy, now),
    };
  }

  function handleApply() {
    if (onFiltersApplied) {
      onFiltersApplied(
        buildSnapshot(
          effectiveDraftRangePreset,
          draftCustomFromDate,
          draftCustomToDate,
          draftProjectId,
          draftMemberUserId,
          draftClientId,
          draftClientIds,
          draftProjectIds,
          draftMemberUserIds,
          draftFieldIds,
        ),
      );
    }
    setAppliedRangePreset(draftRangePreset);
    setAppliedCustomFromDate(draftCustomFromDate);
    setAppliedCustomToDate(draftCustomToDate);
    if (multiSelectEntityFilters) {
      setAppliedClientIds(draftClientIds);
      setAppliedProjectIds(draftProjectIds);
      setAppliedMemberUserIds(draftMemberUserIds);
    } else {
      setAppliedProjectId(draftProjectId);
      setAppliedMemberUserId(draftMemberUserId);
      if (includeClientFilter) {
        setAppliedClientId(draftClientId);
      }
    }
    if (includeFieldsFilter) {
      setAppliedFieldIds(draftFieldIds);
    }
  }

  function handleReset() {
    setDraftRangePreset(null);
    if (multiSelectEntityFilters) {
      setDraftClientIds([]);
      setDraftProjectIds([]);
      setDraftMemberUserIds([]);
      setAppliedClientIds([]);
      setAppliedProjectIds([]);
      setAppliedMemberUserIds([]);
    } else {
      setDraftProjectId("");
      setDraftMemberUserId("");
      setAppliedProjectId("");
      setAppliedMemberUserId("");
      if (includeClientFilter) {
        setDraftClientId("");
        setAppliedClientId("");
      }
    }
    if (includeFieldsFilter) {
      setDraftFieldIds(defaultFieldIds);
      setAppliedFieldIds(defaultFieldIds);
    }
    setAppliedRangePreset(null);
  }

  function captureAppliedSnapshot(): Omit<AgencyTimeRangeFilterSnapshot, "id" | "savedAt"> {
    return buildSnapshot(
      effectiveAppliedRangePreset,
      appliedCustomFromDate,
      appliedCustomToDate,
      appliedProjectId,
      appliedMemberUserId,
      appliedClientId,
      appliedClientIds,
      appliedProjectIds,
      appliedMemberUserIds,
      appliedFieldIds,
    );
  }

  function restoreSnapshot(snapshot: AgencyTimeRangeFilterSnapshot) {
    const storedPreset = snapshot.rangePreset === defaultRangePreset ? null : snapshot.rangePreset;
    setDraftRangePreset(storedPreset);
    setDraftCustomFromDate(snapshot.customFromDate);
    setDraftCustomToDate(snapshot.customToDate);
    setDraftProjectId(snapshot.projectId);
    setDraftMemberUserId(snapshot.memberUserId);
    setDraftClientId(snapshot.clientId);
    setDraftClientIds(snapshot.clientIds);
    setDraftProjectIds(snapshot.projectIds);
    setDraftMemberUserIds(snapshot.memberUserIds);
    setDraftFieldIds(snapshot.fieldIds);
    setAppliedRangePreset(storedPreset);
    setAppliedCustomFromDate(snapshot.customFromDate);
    setAppliedCustomToDate(snapshot.customToDate);
    setAppliedProjectId(snapshot.projectId);
    setAppliedMemberUserId(snapshot.memberUserId);
    setAppliedClientId(snapshot.clientId);
    setAppliedClientIds(snapshot.clientIds);
    setAppliedProjectIds(snapshot.projectIds);
    setAppliedMemberUserIds(snapshot.memberUserIds);
    setAppliedFieldIds(snapshot.fieldIds);
  }

  const isLoading =
    tenurePolicyQuery.isPending ||
    projectsQuery.isPending ||
    (includeClientFilter && clientsQuery.isPending);

  const barProps = {
    rangePreset: effectiveDraftRangePreset,
    onRangePresetChange: setDraftRangePreset,
    customFromDate: draftCustomFromDate,
    onCustomFromChange: setDraftCustomFromDate,
    customToDate: draftCustomToDate,
    onCustomToChange: setDraftCustomToDate,
    onApply: handleApply,
    hasPendingChanges: hasPendingFilterChanges,
    onReset: handleReset,
    defaultRangePreset,
    tenureAvailable: Boolean(tenurePolicy?.enabled),
    projects: filteredProjects,
    members,
    projectsLoading: projectsQuery.isPending,
    ...(multiSelectEntityFilters
      ? {
          multiSelectEntityFilters: true as const,
          clientIds: draftClientIds,
          onClientIdsChange: handleClientIdsChange,
          projectIds: draftProjectIds,
          onProjectIdsChange: setDraftProjectIds,
          memberUserIds: draftMemberUserIds,
          onMemberUserIdsChange: setDraftMemberUserIds,
          projectFilterGroups,
        }
      : {
          projectId: draftProjectId,
          onProjectChange: setDraftProjectId,
          memberUserId: draftMemberUserId,
          onMemberChange: setDraftMemberUserId,
        }),
    ...(includeClientFilter
      ? multiSelectEntityFilters
        ? {
            clients,
            clientsLoading: clientsQuery.isPending,
          }
        : {
            clientId: draftClientId,
            onClientChange: handleClientChange,
            clients,
            clientsLoading: clientsQuery.isPending,
          }
      : {}),
    ...(includeFieldsFilter
      ? {
          fieldIds: draftFieldIds,
          onFieldIdsChange: setDraftFieldIds,
          defaultFieldIds,
        }
      : {}),
  };

  return {
    applied,
    barProps,
    isLoading,
    projects,
    members,
    clients,
    entriesCount: entriesQuery.data?.length ?? 0,
    entriesFetching: entriesQuery.isFetching,
    captureAppliedSnapshot,
    restoreSnapshot,
  };
}
