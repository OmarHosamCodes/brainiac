import type { DehydratedState, VueQueryPluginOptions } from "@tanstack/vue-query";
import { dehydrate, hydrate, QueryCache, QueryClient, VueQueryPlugin } from "@tanstack/vue-query";

export default defineNuxtPlugin((nuxt) => {
  const vueQueryState = useState<DehydratedState | null>("vue-query");

  const toast = useToast();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Treat data as fresh for 30s by default. Individual queries can
        // override when they truly need realtime semantics.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        // Default 3 retries with exp backoff was the main contributor to the
        // "URL changed but nothing rendered" symptom: a flaky request would
        // hang the UI for 10-20s before surfacing.
        retry: 1,
        retryDelay: (attempt) => Math.min(250 * 2 ** attempt, 1_500),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        console.log(error);
        toast.add({
          title: "Error",
          description: error?.message || "An unexpected error occurred.",
        });
      },
    }),
  });
  const options: VueQueryPluginOptions = { queryClient };

  nuxt.vueApp.use(VueQueryPlugin, options);

  if (import.meta.server) {
    nuxt.hooks.hook("app:rendered", () => {
      vueQueryState.value = dehydrate(queryClient);
    });
  }

  if (import.meta.client) {
    nuxt.hooks.hook("app:created", () => {
      hydrate(queryClient, vueQueryState.value);
    });
  }
});
