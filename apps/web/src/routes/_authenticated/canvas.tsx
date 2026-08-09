import { createFileRoute } from "@tanstack/react-router";

import { CanvasPage } from "@/pages/canvas-page";

export const Route = createFileRoute("/_authenticated/canvas")({
  component: CanvasPage,
  head: () => ({
    meta: [{ title: "Canvas — Orch" }],
  }),
});
