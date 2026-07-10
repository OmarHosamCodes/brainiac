import { createPortal } from "react-dom";

type LogoLoaderProps = {
  label?: string;
};

export function LogoLoader({ label = "Loading" }: LogoLoaderProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-default"
      aria-busy="true"
      aria-label={label}
    >
      <img src="/logo-animation.svg" alt="" className="size-20 select-none" draggable={false} />
    </div>,
    document.body,
  );
}
