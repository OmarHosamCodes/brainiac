import { createFileRoute } from "@tanstack/react-router";

import { NodeDetailSurface } from "@/components/workspace/node-detail-surface";
import { AppLayout } from "@/layouts/app-layout";
import { requireAuthenticatedRoute } from "@/lib/auth-guard";

export const Route = createFileRoute("/node/$id")({
  beforeLoad: requireAuthenticatedRoute,
  component: NodeRoute,
});

function NodeRoute() {
  const params = Route.useParams();

  return (
    <AppLayout>
      <NodeDetailSurface id={params.id} />
    </AppLayout>
  );
}
