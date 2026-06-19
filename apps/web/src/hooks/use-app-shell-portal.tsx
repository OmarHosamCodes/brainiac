import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

function usePortalTarget(targetId: string) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById(targetId));
  }, [targetId]);

  return target;
}

export function AppShellPortal({ targetId, children }: { targetId: string; children: ReactNode }) {
  const target = usePortalTarget(targetId);
  if (!target) {
    return null;
  }

  return createPortal(children, target);
}
