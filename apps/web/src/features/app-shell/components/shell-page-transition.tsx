import { useMemo, useRef, useEffect } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router-dom";

import { resolveShellMode } from "@/features/app-shell/app-navigation";
import { shellContentInClass, shellPageEnterClass } from "@/features/app-shell/app-shell-ui";
import { cn } from "@/lib/utils";

function isSpatialFastPath(previousPath: string, nextPath: string) {
  return resolveShellMode(previousPath) === "spatial" && resolveShellMode(nextPath) === "spatial";
}

export function ShellPageTransition() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousPathRef = useRef(location.pathname);

  const enterClass = useMemo(() => {
    if (navigationType === "POP") {
      return undefined;
    }

    const previousPath = previousPathRef.current;
    const nextPath = location.pathname;

    if (isSpatialFastPath(previousPath, nextPath)) {
      return shellContentInClass;
    }

    return shellPageEnterClass;
  }, [location.pathname, navigationType]);

  useEffect(() => {
    previousPathRef.current = location.pathname;
  }, [location.pathname]);

  return (
    <div className={cn(enterClass, "h-full min-h-0")}>
      <Outlet />
    </div>
  );
}
