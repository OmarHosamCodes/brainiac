export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) {
    return;
  }

  const authClient = useAuthClient();
  const session = useAuthSession();

  if (session.value.isPending) {
    await authClient.getSession();
  }

  if (!session.value.data) {
    return navigateTo("/login");
  }
});
