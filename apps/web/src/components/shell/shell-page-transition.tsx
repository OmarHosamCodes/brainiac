import { useMemo, useRef, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { resolveShellMode } from "@/lib/utils/app-navigation";
import { shellContentInClass, shellPageEnterClass } from "@/lib/utils/app-shell-ui";
import { cn } from "@/lib/utils";

function isSpatialFastPath(previousPath: string, nextPath: string) {
  return resolveShellMode(previousPath) === "spatial" && resolveShellMode(nextPath) === "spatial";
}

export function ShellPageTransition() {
  const location = useLocation();
  const previousPathRef = useRef(location.pathname);

  const enterClass = useMemo(() => {
    const previousPath = previousPathRef.current;
    const nextPath = location.pathname;

    if (isSpatialFastPath(previousPath, nextPath)) {
      return shellContentInClass;
    }

    return shellPageEnterClass;
  }, [location.pathname]);

  useEffect(() => {
    previousPathRef.current = location.pathname;
  }, [location.pathname]);

  return (
    <div key={location.pathname} className={cn(enterClass, "h-full min-h-0")}>
      <Outlet />
    </div>
  );
}
