import { useEffect, useState } from "react";

import {
  isShellAnimationReady,
  resetShellBoot,
  startShellBoot,
} from "@/lib/shell/shell-boot";

export function useShellBootGate(dataReady: boolean) {
  const [animationReady, setAnimationReady] = useState(() => isShellAnimationReady());

  useEffect(() => {
    startShellBoot();
  }, []);

  useEffect(() => {
    if (animationReady) return;

    const intervalId = window.setInterval(() => {
      if (isShellAnimationReady()) {
        setAnimationReady(true);
      }
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [animationReady]);

  useEffect(() => resetShellBoot, []);

  const isBooting = !(dataReady && animationReady);

  return { isBooting };
}
