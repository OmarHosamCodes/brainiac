import { useEffect, useMemo, useState } from "react";

import { formatDuration } from "@/lib/utils/format-duration";

type UseAgencyElapsedTimerOptions = {
  startedAt: string | null | undefined;
  enabled?: boolean;
  format?: "default" | "clock";
};

export function useAgencyElapsedTimer({
  startedAt,
  enabled = true,
  format = "default",
}: UseAgencyElapsedTimerOptions): string | null {
  const [now, setNow] = useState(Date.now());

  const tickerActive = enabled && Boolean(startedAt);

  useEffect(() => {
    if (!tickerActive) return;
    const tickerHandle = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(tickerHandle);
  }, [tickerActive, startedAt]);

  return useMemo(() => {
    if (!startedAt) return null;
    const startMs = new Date(startedAt).getTime();
    if (Number.isNaN(startMs)) return null;
    const elapsedSeconds = Math.max(0, Math.floor((now - startMs) / 1_000));
    return formatDuration(elapsedSeconds, format === "clock" ? "clock" : undefined);
  }, [format, now, startedAt]);
}
