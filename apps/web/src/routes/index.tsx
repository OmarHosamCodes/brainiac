import { createFileRoute } from "@tanstack/react-router";

import { LandingPage } from "@/pages/landing-page";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Orch — Map your thinking. Run your agency." },
      {
        name: "description",
        content: "Canvas for ideas, Agency for execution.",
      },
    ],
  }),
});
