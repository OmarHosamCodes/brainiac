import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

function usePortalTarget(targetId: string) {
  const [target, setTarget] = useState<HTMLElement | null>(() =>
    typeof document !== "undefined" ? document.getElementById(targetId) : null,
  );

  useEffect(() => {
    const existing = document.getElementById(targetId);
    if (existing) {
      setTarget(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const next = document.getElementById(targetId);
      if (!next) return;
      setTarget(next);
      observer.disconnect();
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => observer.disconnect();
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
