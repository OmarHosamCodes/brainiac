import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { AppLayout } from "@/layouts/app-layout";
import { requireAuthenticatedRoute } from "@/lib/auth-guard";

export const Route = createFileRoute("/billing/success")({
  beforeLoad: requireAuthenticatedRoute,
  component: BillingSuccessRoute,
});

function BillingSuccessRoute() {
  return (
    <AppLayout>
      <section className="p-4 md:p-6">
        <div className="max-w-2xl rounded-[2rem] border bg-card p-8">
          <h2 className="text-2xl font-bold">Billing updated</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Checkout completed. Your billing state will refresh automatically on the next app load.
          </p>
          <Button asChild className="mt-5">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </section>
    </AppLayout>
  );
}
