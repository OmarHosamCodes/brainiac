export function useAuthClient() {
  return useNuxtApp().$authClient;
}

export function useAuthSession() {
  return useAuthClient().useSession();
}
