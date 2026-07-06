import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import type { RangePreset } from "@/components/agency/agency-dashboard-command-bar";
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
};

type UseAgencyTimeRangeFiltersOptions = {
  teamId: string;
  includeClientFilter?: boolean;
  fetchEntries?: boolean;
};

export function useAgencyTimeRangeFilters({
  teamId,
  includeClientFilter = false,
  fetchEntries = false,
}: UseAgencyTimeRangeFiltersOptions) {
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

  const [draftRangePreset, setDraftRangePreset] = useState<RangePreset | null>(null);
  const effectiveDraftRangePreset = draftRangePreset ?? defaultRangePreset;
  const [draftCustomFromDate, setDraftCustomFromDate] = useState(
    toDateInputValue(startOfWeekUtc()),
  );
  const [draftCustomToDate, setDraftCustomToDate] = useState(toDateInputValue(now));
  const [draftProjectId, setDraftProjectId] = useState("");
  const [draftMemberUserId, setDraftMemberUserId] = useState("");
  const [draftClientId, setDraftClientId] = useState("");

  const hasPendingFilterChanges =
    effectiveDraftRangePreset !== effectiveAppliedRangePreset ||
    draftProjectId !== appliedProjectId ||
    draftMemberUserId !== appliedMemberUserId ||
    (includeClientFilter && draftClientId !== appliedClientId) ||
    (effectiveDraftRangePreset === "custom" &&
      (draftCustomFromDate !== appliedCustomFromDate ||
        draftCustomToDate !== appliedCustomToDate));

  const range = useMemo(() => {
    const endIso = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
    ).toISOString();

    if (effectiveAppliedRangePreset === "tenure") {
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
    if (effectiveAppliedRangePreset === "month") {
      return {
        from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
        to: endIso,
      };
    }
    if (effectiveAppliedRangePreset === "last30") {
      return {
        from: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
        ).toISOString(),
        to: endIso,
      };
    }
    if (effectiveAppliedRangePreset === "custom") {
      return {
        from: dateInputToIso(appliedCustomFromDate),
        to: dateInputToIso(appliedCustomToDate, true),
      };
    }
    return { from: startOfWeekUtc().toISOString(), to: endIso };
  }, [appliedCustomFromDate, appliedCustomToDate, effectiveAppliedRangePreset, now, tenurePolicy]);

  const applied: AgencyTimeRangeFilters = useMemo(
    () => ({
      range,
      projectId: appliedProjectId || undefined,
      memberUserId: appliedMemberUserId || undefined,
      ...(includeClientFilter ? { clientId: appliedClientId || undefined } : {}),
    }),
    [
      appliedClientId,
      appliedMemberUserId,
      appliedProjectId,
      includeClientFilter,
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
      appliedClientId,
      appliedProjectId,
      appliedMemberUserId,
    ],
    queryFn: () =>
      fetchAllReportEntries(teamId, range, {
        clientId: appliedClientId || undefined,
        projectId: appliedProjectId || undefined,
        memberUserId: appliedMemberUserId || undefined,
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
    if (!includeClientFilter || !draftClientId) return projects;
    return projects.filter((project) => project.clientId === draftClientId);
  }, [draftClientId, includeClientFilter, projects]);
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

  function handleApply() {
    setAppliedRangePreset(draftRangePreset);
    setAppliedCustomFromDate(draftCustomFromDate);
    setAppliedCustomToDate(draftCustomToDate);
    setAppliedProjectId(draftProjectId);
    setAppliedMemberUserId(draftMemberUserId);
    if (includeClientFilter) {
      setAppliedClientId(draftClientId);
    }
  }

  function handleReset() {
    setDraftRangePreset(null);
    setDraftProjectId("");
    setDraftMemberUserId("");
    if (includeClientFilter) {
      setDraftClientId("");
    }
    setAppliedRangePreset(null);
    setAppliedProjectId("");
    setAppliedMemberUserId("");
    if (includeClientFilter) {
      setAppliedClientId("");
    }
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
    projectId: draftProjectId,
    onProjectChange: setDraftProjectId,
    memberUserId: draftMemberUserId,
    onMemberChange: setDraftMemberUserId,
    onApply: handleApply,
    hasPendingChanges: hasPendingFilterChanges,
    onReset: handleReset,
    defaultRangePreset,
    tenureAvailable: Boolean(tenurePolicy?.enabled),
    projects: filteredProjects,
    members,
    projectsLoading: projectsQuery.isPending,
    ...(includeClientFilter
      ? {
          clientId: draftClientId,
          onClientChange: handleClientChange,
          clients,
          clientsLoading: clientsQuery.isPending,
        }
      : {}),
  };

  return {
    applied,
    barProps,
    isLoading,
    projects,
    members,
    entriesCount: entriesQuery.data?.length ?? 0,
    entriesFetching: entriesQuery.isFetching,
  };
}
