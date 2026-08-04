import { orpc, orpcClient } from "@/lib/orpc";
import { getQueryClient } from "@/lib/query-client";

export type AgencyDepartmentOption = {
  id: string;
  name: string;
};

async function invalidateDepartments(teamId: string) {
  await getQueryClient().invalidateQueries({
    queryKey: orpc.agencyOps.departments.list.queryOptions({ input: { teamId } }).queryKey,
  });
}

export async function createAgencyDepartment(
  teamId: string,
  name: string,
): Promise<AgencyDepartmentOption> {
  const created = await orpcClient.agencyOps.departments.create({ teamId, name });
  await invalidateDepartments(teamId);
  return { id: created.id, name: created.name };
}

export async function updateAgencyDepartment(
  teamId: string,
  departmentId: string,
  name: string,
): Promise<AgencyDepartmentOption> {
  const updated = await orpcClient.agencyOps.departments.update({
    teamId,
    departmentId,
    name,
  });
  await invalidateDepartments(teamId);
  return { id: updated.id, name: updated.name };
}

export async function deleteAgencyDepartment(teamId: string, departmentId: string): Promise<void> {
  await orpcClient.agencyOps.departments.delete({ teamId, departmentId });
  await invalidateDepartments(teamId);
}
