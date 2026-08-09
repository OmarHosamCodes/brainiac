import { useEffect } from "react";
import { useLocation, useNavigate } from "@/lib/navigation";

import {
  agencyManagementHref,
  agencyManagementPaneFromPathname,
} from "@/features/shared/agency-management-sections";
import { AGENCY_SEGMENTS, agencySegmentHref } from "@/features/shared/agency-segments";

/** Global `g` then segment key chords (Work = `g w`, …). */
export function useAgencySegmentShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();

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
        const href =
          match.id === "management"
            ? agencyManagementHref(
                agencyManagementPaneFromPathname(location.pathname) ?? "resourcing",
              )
            : agencySegmentHref(match.id);
        navigate(href);
      }
      clearPrefix();
    }

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      clearPrefix();
    };
  }, [location.pathname, navigate]);
}
