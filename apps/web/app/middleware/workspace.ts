export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) {
    return;
  }

  // Fire-and-forget: the page renders immediately and the workspace store
  // streams data in via skeleton states. Awaiting here used to compound with
  // the auth middleware to delay every navigation by two round-trips.
  const workspaceStore = useWorkspaceStore();
  void workspaceStore.preloadWorkspace();
});
