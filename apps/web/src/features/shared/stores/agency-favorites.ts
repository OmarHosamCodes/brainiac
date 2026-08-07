import { toast } from "sonner";

import { getQueryClient } from "@/lib/query-client";
import { orpc, orpcClient } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";

export type ToggleFavoritePayload = {
  teamId: string;
  kind: "project" | "task";
  projectId?: string;
  taskId?: string;
};

export async function toggleAgencyFavorite(payload: ToggleFavoritePayload): Promise<boolean> {
  if (!payload.teamId) return false;
  if (payload.kind === "project" && !payload.projectId) return false;
  if (payload.kind === "task" && !payload.taskId) return false;

  const queryClient = getQueryClient();
  const queryKey = orpc.agencyOps.favorites.list.queryOptions({
    input: { teamId: payload.teamId },
  }).queryKey;
  const previous = queryClient.getQueryData<{ projectIds: string[]; taskIds: string[] }>(queryKey);

  const nextProjectIds = new Set(previous?.projectIds ?? []);
  const nextTaskIds = new Set(previous?.taskIds ?? []);
  let favorited = false;

  if (payload.kind === "project" && payload.projectId) {
    if (nextProjectIds.has(payload.projectId)) {
      nextProjectIds.delete(payload.projectId);
    } else {
      nextProjectIds.add(payload.projectId);
      favorited = true;
    }
  }
  if (payload.kind === "task" && payload.taskId) {
    if (nextTaskIds.has(payload.taskId)) {
      nextTaskIds.delete(payload.taskId);
    } else {
      nextTaskIds.add(payload.taskId);
      favorited = true;
    }
  }

  queryClient.setQueryData(queryKey, {
    projectIds: [...nextProjectIds],
    taskIds: [...nextTaskIds],
  });

  try {
    const result = await orpcClient.agencyOps.favorites.toggle({
      teamId: payload.teamId,
      kind: payload.kind,
      projectId: payload.projectId,
      taskId: payload.taskId,
    });
    queryClient.setQueryData(queryKey, {
      projectIds: result.projectIds,
      taskIds: result.taskIds,
    });
    return result.favorited;
  } catch (error) {
    if (previous) {
      queryClient.setQueryData(queryKey, previous);
    } else {
      queryClient.removeQueries({ queryKey });
    }
    toast.error("Couldn't update favorite", {
      description: getErrorMessage(error, "Try again."),
    });
    return favorited;
  }
}
