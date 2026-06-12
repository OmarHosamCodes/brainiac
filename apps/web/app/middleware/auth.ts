export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) {
    return;
  }

  // Single-flight: resolves once on the first navigation after the session
  // has been determined by the client's first getSession. Subsequent
  // navigations are a no-op.
  await whenAuthSessionReady();

  const session = useAuthSession();

  if (!session.value.data) {
    return navigateTo("/login");
  }
});
