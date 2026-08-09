import { useEffect, useState } from "react";

import {
  isShellAnimationHoldActive,
  isShellAnimationReady,
  resetShellBoot,
} from "@/features/app-shell/shell/shell-boot";

export function useShellAnimationHold() {
  const [animationReady, setAnimationReady] = useState(() => !isShellAnimationHoldActive());

  useEffect(() => {
    if (animationReady) return;

    const intervalId = window.setInterval(() => {
      if (!isShellAnimationHoldActive() || isShellAnimationReady()) {
        setAnimationReady(true);
      }
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [animationReady]);

  useEffect(() => resetShellBoot, []);

  return animationReady;
}

export function useShellBootGate(dataReady: boolean) {
  const animationReady = useShellAnimationHold();
  return { isBooting: !(dataReady && animationReady) };
}
