import { CheckCircle } from "lucide-react";
import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAppShellPageTitle } from "@/hooks/use-app-shell";
import { useBilling } from "@/hooks/use-billing";

export function BillingSuccessPage() {
  useAppShellPageTitle("Billing");

  const [searchParams] = useSearchParams();
  const { refreshBillingState } = useBilling();

  const checkoutId = searchParams.get("checkout_id") ?? undefined;

  useEffect(() => {
    refreshBillingState();
  }, [refreshBillingState]);

  return (
    <div className="flex h-full items-start justify-center overflow-y-auto bg-default px-4 pt-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md px-6 text-center">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="size-8 text-primary" />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-highlighted">Pro is active</h1>
        <p className="mb-8 text-muted">Your subscription is active and billing has been updated.</p>

        {checkoutId ? (
          <p className="mb-6 text-xs text-muted">
            Checkout ID: <span className="font-mono">{checkoutId}</span>
          </p>
        ) : null}

        <div className="flex flex-col gap-3">
          <Button asChild size="lg">
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/billing">View Billing Details</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
