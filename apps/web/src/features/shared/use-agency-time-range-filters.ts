import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import type { RangePreset } from "@/features/dashboard/agency-dashboard-command-bar";
import type { AgencyFilterOptionGroup } from "@/features/shared/filters/agency-multi-select-filter";
import {
  allAgencyReportFieldIds,
  areSameReportFieldSets,
  type AgencyReportFieldId,
} from "@/features/reports/agency-report-fields";
import { fetchAllReportEntries } from "@/features/reports/fetch-report-entries";
import { orpc } from "@/lib/orpc";
import { useAgencyClientsQuery } from "@/features/shared/agency-queries";
import {
  getCurrentTenurePeriodRange,
  resolveDefaultDashboardRangePreset,
} from "@/features/resourcing/tenure-utils";

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
  const startOfTodayIso = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();

  switch (preset) {
    case "tenure": {
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
    case "today":
      return { from: startOfTodayIso, to: endIso };
    case "week":
      return { from: startOfWeekUtc().toISOString(), to: endIso };
    case "month":
      return {
        from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
        to: endIso,
      };
    case "last30":
      return {
        from: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
        ).toISOString(),
        to: endIso,
      };
    case "custom":
      return {
        from: dateInputToIso(customFromDate),
        to: dateInputToIso(customToDate, true),
      };
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}

export function useAgencyTimeRangeFilters({
  teamId,
  includeClientFilter = false,
  includeFieldsFilter = false,
  fetchEntries = false,
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
  const tenurePeriodLabel = useMemo(
    () => getCurrentTenurePeriodRange(tenurePolicy, now)?.simpleLabel ?? null,
    [now, tenurePolicy],
  );

  const [appliedRangePreset, setAppliedRangePreset] = useState<RangePreset | null>(null);
  const effectiveAppliedRangePreset = appliedRangePreset ?? defaultRangePreset;
  const [appliedCustomFromDate, setAppliedCustomFromDate] = useState(
    toDateInputValue(startOfWeekUtc()),
  );
  const [appliedCustomToDate, setAppliedCustomToDate] = useState(toDateInputValue(now));
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
  const [draftClientIds, setDraftClientIds] = useState<string[]>([]);
  const [draftProjectIds, setDraftProjectIds] = useState<string[]>([]);
  const [draftMemberUserIds, setDraftMemberUserIds] = useState<string[]>([]);
  const [draftFieldIds, setDraftFieldIds] = useState<AgencyReportFieldId[]>(defaultFieldIds);

  const hasPendingFilterChanges =
    effectiveDraftRangePreset !== effectiveAppliedRangePreset ||
    !sameIdList(draftProjectIds, appliedProjectIds) ||
    !sameIdList(draftMemberUserIds, appliedMemberUserIds) ||
    (includeClientFilter && !sameIdList(draftClientIds, appliedClientIds)) ||
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
      clientIds: appliedClientIds.length > 0 ? appliedClientIds : undefined,
      projectIds: appliedProjectIds.length > 0 ? appliedProjectIds : undefined,
      memberUserIds: appliedMemberUserIds.length > 0 ? appliedMemberUserIds : undefined,
      ...(includeFieldsFilter ? { fields: appliedFieldIds } : {}),
    }),
    [
      appliedClientIds,
      appliedFieldIds,
      appliedMemberUserIds,
      appliedProjectIds,
      includeFieldsFilter,
      range,
    ],
  );

  const projectsQuery = useQuery({
    ...orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });
  const clientsQuery = useAgencyClientsQuery(includeClientFilter ? teamId : "");
  const membersQuery = useQuery({
    ...orpc.team.members.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });

  const entriesQuery = useQuery({
    queryKey: [
      "agency-reports",
      "entries",
      teamId,
      range.from,
      range.to,
      appliedClientIds,
      appliedProjectIds,
      appliedMemberUserIds,
    ],
    queryFn: () =>
      fetchAllReportEntries(teamId, range, {
        clientIds: appliedClientIds.length > 0 ? appliedClientIds : undefined,
        projectIds: appliedProjectIds.length > 0 ? appliedProjectIds : undefined,
        memberUserIds: appliedMemberUserIds.length > 0 ? appliedMemberUserIds : undefined,
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
    if (!includeClientFilter || draftClientIds.length === 0) return projects;
    const clientSet = new Set(draftClientIds);
    return projects.filter((project) => clientSet.has(project.clientId));
  }, [draftClientIds, includeClientFilter, projects]);
  const projectFilterGroups = useMemo(
    () => buildProjectFilterGroups(filteredProjects),
    [filteredProjects],
  );
  const members = (membersQuery.data?.items ?? []).map((member) => ({
    userId: member.userId,
    userName: member.userName,
    avatar: null,
  }));

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
    clientIds: string[],
    projectIds: string[],
    memberUserIds: string[],
    fieldIds: AgencyReportFieldId[],
  ): Omit<AgencyTimeRangeFilterSnapshot, "id" | "savedAt"> {
    return {
      rangePreset: preset,
      customFromDate,
      customToDate,
      // Legacy single-id snapshot fields — prefer the array fields below.
      projectId: projectIds.length === 1 ? (projectIds[0] ?? "") : "",
      memberUserId: memberUserIds.length === 1 ? (memberUserIds[0] ?? "") : "",
      clientId: clientIds.length === 1 ? (clientIds[0] ?? "") : "",
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
    setAppliedClientIds(draftClientIds);
    setAppliedProjectIds(draftProjectIds);
    setAppliedMemberUserIds(draftMemberUserIds);
    if (includeFieldsFilter) {
      setAppliedFieldIds(draftFieldIds);
    }
  }

  function handleReset() {
    setDraftRangePreset(null);
    setDraftClientIds([]);
    setDraftProjectIds([]);
    setDraftMemberUserIds([]);
    setAppliedClientIds([]);
    setAppliedProjectIds([]);
    setAppliedMemberUserIds([]);
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
      appliedClientIds,
      appliedProjectIds,
      appliedMemberUserIds,
      appliedFieldIds,
    );
  }

  function restoreSnapshot(snapshot: AgencyTimeRangeFilterSnapshot) {
    const storedPreset = snapshot.rangePreset === defaultRangePreset ? null : snapshot.rangePreset;
    const clientIds =
      snapshot.clientIds.length > 0
        ? snapshot.clientIds
        : snapshot.clientId
          ? [snapshot.clientId]
          : [];
    const projectIds =
      snapshot.projectIds.length > 0
        ? snapshot.projectIds
        : snapshot.projectId
          ? [snapshot.projectId]
          : [];
    const memberUserIds =
      snapshot.memberUserIds.length > 0
        ? snapshot.memberUserIds
        : snapshot.memberUserId
          ? [snapshot.memberUserId]
          : [];

    setDraftRangePreset(storedPreset);
    setDraftCustomFromDate(snapshot.customFromDate);
    setDraftCustomToDate(snapshot.customToDate);
    setDraftClientIds(clientIds);
    setDraftProjectIds(projectIds);
    setDraftMemberUserIds(memberUserIds);
    setDraftFieldIds(snapshot.fieldIds);
    setAppliedRangePreset(storedPreset);
    setAppliedCustomFromDate(snapshot.customFromDate);
    setAppliedCustomToDate(snapshot.customToDate);
    setAppliedClientIds(clientIds);
    setAppliedProjectIds(projectIds);
    setAppliedMemberUserIds(memberUserIds);
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
    tenurePeriodLabel,
    members,
    projectsLoading: projectsQuery.isPending,
    clientIds: draftClientIds,
    onClientIdsChange: handleClientIdsChange,
    projectIds: draftProjectIds,
    onProjectIdsChange: setDraftProjectIds,
    memberUserIds: draftMemberUserIds,
    onMemberUserIdsChange: setDraftMemberUserIds,
    projectFilterGroups,
    ...(includeClientFilter
      ? {
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
