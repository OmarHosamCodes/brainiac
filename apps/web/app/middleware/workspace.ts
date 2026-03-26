export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) {
    return;
  }

  const workspaceStore = useWorkspaceStore();

  await workspaceStore.preloadWorkspace();
});
