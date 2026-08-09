import { Link } from "@/lib/navigation";

import { LogoLoader } from "@/features/app-shell/components/logo-loader";
import { agencyEmptyPanelClass, agencyErrorPanelClass } from "@/features/shared/agency-ui";

export function RoutePending({ label = "Loading" }: { label?: string }) {
  return <LogoLoader placement="slot" label={label} />;
}

export function RouteError({ message = "Something went wrong." }: { message?: string }) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center p-6">
      <div className={agencyErrorPanelClass} role="alert">
        {message}
      </div>
    </div>
  );
}

export function RouteNotFound() {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 p-6">
      <div className={agencyEmptyPanelClass}>This page doesn’t exist.</div>
      <Link to="/canvas" className="text-sm text-primary underline-offset-4 hover:underline">
        Back to Canvas
      </Link>
    </div>
  );
}
