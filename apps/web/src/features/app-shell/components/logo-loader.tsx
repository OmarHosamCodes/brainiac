import { createPortal } from "react-dom";

import { getLogoAnimationHref } from "@/lib/favicon";
import { useTheme } from "@/stores/theme";

type LogoLoaderProps = {
  label?: string;
};

export function LogoLoader({ label = "Loading" }: LogoLoaderProps) {
  const { theme } = useTheme();

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-default"
      aria-busy="true"
      aria-label={label}
    >
      <img
        src={getLogoAnimationHref(theme)}
        alt=""
        className="size-20 select-none"
        draggable={false}
      />
    </div>,
    document.body,
  );
}
