import type { QueryKey } from "@tanstack/react-query";

import { orpc, orpcClient } from "@/lib/orpc";
import { getQueryClient } from "@/lib/query-client";

export type AgencyDepartmentOption = {
  id: string;
  name: string;
};

type AgencyDepartmentRecord = AgencyDepartmentOption & {
  teamId: string;
  createdAt: string;
  updatedAt: string;
};

type DepartmentsListData = {
  items: AgencyDepartmentRecord[];
};

type TenureSummaryListData = {
  policyEnabled: boolean;
  items: Array<{
    departmentId: string | null;
    departmentName: string | null;
    [key: string]: unknown;
  }>;
};

type OrpcQueryMeta = {
  input?: {
    teamId?: string;
  };
};

function getOrpcQueryPath(queryKey: QueryKey): string[] {
  const path = queryKey[0];
  return Array.isArray(path) ? path.map(String) : [];
}

function getOrpcQueryMeta(queryKey: QueryKey): OrpcQueryMeta | undefined {
  return queryKey[1] as OrpcQueryMeta | undefined;
}

function isDepartmentsListQueryKey(queryKey: QueryKey, teamId: string) {
  const path = getOrpcQueryPath(queryKey);
  if (
    path.length !== 3 ||
    path[0] !== "agencyOps" ||
    path[1] !== "departments" ||
    path[2] !== "list"
  ) {
    return false;
  }
  return getOrpcQueryMeta(queryKey)?.input?.teamId === teamId;
}

function isTenureSummaryListQueryKey(queryKey: QueryKey, teamId: string) {
  const path = getOrpcQueryPath(queryKey);
  if (
    path.length !== 4 ||
    path[0] !== "agencyOps" ||
    path[1] !== "tenure" ||
    path[2] !== "summary" ||
    path[3] !== "list"
  ) {
    return false;
  }
  return getOrpcQueryMeta(queryKey)?.input?.teamId === teamId;
}

function sortByName(items: AgencyDepartmentRecord[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function optimisticId() {
  return `optimistic-department-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function forEachDepartmentsQuery(
  teamId: string,
  apply: (queryKey: QueryKey, current: DepartmentsListData | undefined) => void,
) {
  const queryClient = getQueryClient();
  for (const query of queryClient.getQueryCache().findAll()) {
    if (!isDepartmentsListQueryKey(query.queryKey, teamId)) continue;
    apply(
      query.queryKey,
      queryClient.getQueryData<DepartmentsListData | undefined>(query.queryKey),
    );
  }
}

function readDepartmentsSnapshot(teamId: string): Array<{
  queryKey: QueryKey;
  data: DepartmentsListData | undefined;
}> {
  const snapshots: Array<{ queryKey: QueryKey; data: DepartmentsListData | undefined }> = [];
  forEachDepartmentsQuery(teamId, (queryKey, current) => {
    snapshots.push({
      queryKey,
      data: current ? { items: current.items.map((item) => ({ ...item })) } : undefined,
    });
  });
  return snapshots;
}

function restoreDepartmentsSnapshot(
  snapshots: Array<{ queryKey: QueryKey; data: DepartmentsListData | undefined }>,
) {
  const queryClient = getQueryClient();
  for (const snapshot of snapshots) {
    queryClient.setQueryData(snapshot.queryKey, snapshot.data);
  }
}

function patchDepartments(
  teamId: string,
  updater: (items: AgencyDepartmentRecord[]) => AgencyDepartmentRecord[],
) {
  const queryClient = getQueryClient();
  let patched = false;
  forEachDepartmentsQuery(teamId, (queryKey, current) => {
    patched = true;
    queryClient.setQueryData<DepartmentsListData>(queryKey, {
      items: sortByName(updater(current?.items ?? [])),
    });
  });

  // Seed the canonical key when the observer cache entry wasn't found yet.
  if (!patched) {
    const queryKey = orpc.agencyOps.departments.list.queryOptions({
      input: { teamId },
    }).queryKey;
    const current = queryClient.getQueryData<DepartmentsListData>(queryKey);
    queryClient.setQueryData<DepartmentsListData>(queryKey, {
      items: sortByName(updater(current?.items ?? [])),
    });
  }
}

function patchTenureSummaryDepartmentName(
  teamId: string,
  departmentId: string,
  departmentName: string,
) {
  const queryClient = getQueryClient();
  for (const query of queryClient.getQueryCache().findAll()) {
    if (!isTenureSummaryListQueryKey(query.queryKey, teamId)) continue;
    const current = queryClient.getQueryData<TenureSummaryListData>(query.queryKey);
    if (!current) continue;
    queryClient.setQueryData<TenureSummaryListData>(query.queryKey, {
      ...current,
      items: current.items.map((item) =>
        item.departmentId === departmentId ? { ...item, departmentName } : item,
      ),
    });
  }
}

function readTenureSummarySnapshots(teamId: string) {
  const queryClient = getQueryClient();
  const snapshots: Array<{ queryKey: QueryKey; data: TenureSummaryListData | undefined }> = [];
  for (const query of queryClient.getQueryCache().findAll()) {
    if (!isTenureSummaryListQueryKey(query.queryKey, teamId)) continue;
    const data = queryClient.getQueryData<TenureSummaryListData>(query.queryKey);
    snapshots.push({
      queryKey: query.queryKey,
      data: data ? { ...data, items: data.items.map((item) => ({ ...item })) } : undefined,
    });
  }
  return snapshots;
}

function restoreTenureSummarySnapshots(
  snapshots: Array<{ queryKey: QueryKey; data: TenureSummaryListData | undefined }>,
) {
  const queryClient = getQueryClient();
  for (const snapshot of snapshots) {
    queryClient.setQueryData(snapshot.queryKey, snapshot.data);
  }
}

export async function createAgencyDepartment(
  teamId: string,
  name: string,
): Promise<AgencyDepartmentOption> {
  const trimmed = name.trim();
  const previous = readDepartmentsSnapshot(teamId);
  const nowIso = new Date().toISOString();
  const optimistic: AgencyDepartmentRecord = {
    id: optimisticId(),
    teamId,
    name: trimmed,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  patchDepartments(teamId, (items) => [...items, optimistic]);

  try {
    const created = await orpcClient.agencyOps.departments.create({
      teamId,
      name: trimmed,
    });
    patchDepartments(teamId, (items) =>
      items.map((item) =>
        item.id === optimistic.id
          ? {
              id: created.id,
              teamId: created.teamId,
              name: created.name,
              createdAt: created.createdAt,
              updatedAt: created.updatedAt,
            }
          : item,
      ),
    );
    return { id: created.id, name: created.name };
  } catch (error) {
    restoreDepartmentsSnapshot(previous);
    throw error;
  }
}

export async function updateAgencyDepartment(
  teamId: string,
  departmentId: string,
  name: string,
): Promise<AgencyDepartmentOption> {
  const trimmed = name.trim();
  const previous = readDepartmentsSnapshot(teamId);
  const previousSummary = readTenureSummarySnapshots(teamId);
  const nowIso = new Date().toISOString();

  patchDepartments(teamId, (items) =>
    items.map((item) =>
      item.id === departmentId ? { ...item, name: trimmed, updatedAt: nowIso } : item,
    ),
  );
  patchTenureSummaryDepartmentName(teamId, departmentId, trimmed);

  try {
    const updated = await orpcClient.agencyOps.departments.update({
      teamId,
      departmentId,
      name: trimmed,
    });
    patchDepartments(teamId, (items) =>
      items.map((item) =>
        item.id === departmentId
          ? {
              id: updated.id,
              teamId: updated.teamId,
              name: updated.name,
              createdAt: updated.createdAt,
              updatedAt: updated.updatedAt,
            }
          : item,
      ),
    );
    patchTenureSummaryDepartmentName(teamId, departmentId, updated.name);
    return { id: updated.id, name: updated.name };
  } catch (error) {
    restoreDepartmentsSnapshot(previous);
    restoreTenureSummarySnapshots(previousSummary);
    throw error;
  }
}

export async function deleteAgencyDepartment(teamId: string, departmentId: string): Promise<void> {
  const previous = readDepartmentsSnapshot(teamId);

  patchDepartments(teamId, (items) => items.filter((item) => item.id !== departmentId));

  try {
    await orpcClient.agencyOps.departments.delete({ teamId, departmentId });
  } catch (error) {
    restoreDepartmentsSnapshot(previous);
    throw error;
  }
}
