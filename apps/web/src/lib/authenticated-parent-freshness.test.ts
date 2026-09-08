import { describe, expect, test } from "bun:test";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

async function flushRouter() {
  await Promise.resolve();
  await Promise.resolve();
}

async function loadParentAcrossChildNav(options: {
  staleTime?: number;
  preloadStaleTime?: number;
}) {
  let parentLoads = 0;
  let childLoads = 0;
  const parentCauses: Array<{ cause: unknown; preload: boolean }> = [];

  const rootRoute = createRootRoute();
  const authenticatedRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "_authenticated",
    staleTime: options.staleTime,
    preloadStaleTime: options.preloadStaleTime,
    loader: ({ cause, preload }) => {
      parentLoads += 1;
      parentCauses.push({ cause, preload });
      return { session: "u1" };
    },
  });
  const agencyRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "/agency",
    loader: () => {
      childLoads += 1;
      return "agency";
    },
  });
  const canvasRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    path: "/canvas",
    loader: () => {
      childLoads += 1;
      return "canvas";
    },
  });

  const router = createRouter({
    routeTree: rootRoute.addChildren([authenticatedRoute.addChildren([agencyRoute, canvasRoute])]),
    history: createMemoryHistory({ initialEntries: ["/agency"] }),
    defaultPreload: "intent",
  });

  await router.load();
  await flushRouter();
  const parentLoadsAfterBoot = parentLoads;
  const childLoadsAfterBoot = childLoads;

  await router.preloadRoute({ to: "/canvas" });
  await flushRouter();
  await router.navigate({ to: "/canvas" });
  await flushRouter();
  await router.navigate({ to: "/agency" });
  await flushRouter();

  return {
    parentLoads,
    parentLoadsAfterBoot,
    childLoads,
    childLoadsAfterBoot,
    parentCauses,
  };
}

describe("authenticated parent loader freshness", () => {
  test("child navigation re-runs a settled parent even without missing preload freshness", async () => {
    const result = await loadParentAcrossChildNav({});
    expect(result.parentLoadsAfterBoot).toBe(1);
    expect(result.parentLoads).toBeGreaterThan(result.parentLoadsAfterBoot);
    expect(result.childLoads).toBeGreaterThan(result.childLoadsAfterBoot);
    expect(result.parentCauses.some((entry) => entry.cause === "stay" && !entry.preload)).toBe(
      true,
    );
  });

  test("route staleTime 30s does not stop stay child-navigation parent reloads", async () => {
    const result = await loadParentAcrossChildNav({
      staleTime: 30_000,
      preloadStaleTime: 30_000,
    });
    expect(result.parentLoads).toBeGreaterThan(result.parentLoadsAfterBoot);
    expect(result.parentCauses.filter((entry) => entry.cause === "stay").length).toBeGreaterThan(0);
  });
});
