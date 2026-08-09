import { useEffect } from "react";
import { useNavigate } from "@/lib/navigation";

import { AGENCY_SEGMENTS, agencySegmentHref } from "@/features/shared/agency-segments";

/** Global `g` then segment key chords (Work = `g w`, …). */
export function useAgencySegmentShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    let pendingPrefix = false;
    let prefixTimer: ReturnType<typeof setTimeout> | null = null;

    function clearPrefix() {
      pendingPrefix = false;
      if (prefixTimer) {
        clearTimeout(prefixTimer);
        prefixTimer = null;
      }
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        clearPrefix();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        clearPrefix();
        return;
      }

      const key = event.key.toLowerCase();

      if (!pendingPrefix) {
        if (key === "g") {
          pendingPrefix = true;
          prefixTimer = setTimeout(clearPrefix, 1_000);
          return;
        }
        return;
      }

      const match = AGENCY_SEGMENTS.find((entry) => entry.shortcutKey === key);
      if (match) {
        event.preventDefault();
        navigate(agencySegmentHref(match.id));
      }
      clearPrefix();
    }

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      clearPrefix();
    };
  }, [navigate]);
}
