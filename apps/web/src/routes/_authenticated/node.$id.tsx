import { createFileRoute } from "@tanstack/react-router";

import { NodePage } from "@/pages/node-page";

export const Route = createFileRoute("/_authenticated/node/$id")({
  component: NodePage,
  head: () => ({
    meta: [{ title: "Node — Orch" }],
  }),
});
