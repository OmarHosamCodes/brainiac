import * as LucideIcons from "lucide-react";
import type { ComponentType, SVGProps } from "react";

function toLucideComponentName(iconName: string) {
  return iconName
    .replace(/^i-lucide-/, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function LucideIcon({ name, className }: { name: string; className?: string }) {
  const componentName = toLucideComponentName(name);
  const Icon = (LucideIcons as unknown as Record<string, ComponentType<SVGProps<SVGSVGElement>>>)[
    componentName
  ];
  if (!Icon) {
    return null;
  }
  return <Icon className={className} aria-hidden />;
}
