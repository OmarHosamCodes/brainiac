import { useEffect, useState } from "react";

export type MoneyDetailSheetSide = "bottom" | "right";

export function useMoneyDetailSheetSide(): MoneyDetailSheetSide {
  const [side, setSide] = useState<MoneyDetailSheetSide>("bottom");

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 640px)");
    const updateSide = () => setSide(desktop.matches ? "right" : "bottom");

    updateSide();
    desktop.addEventListener("change", updateSide);
    return () => desktop.removeEventListener("change", updateSide);
  }, []);

  return side;
}
