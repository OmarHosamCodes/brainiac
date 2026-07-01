import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarRange,
  CreditCard,
  DollarSign,
  FolderKanban,
  LayoutDashboard,
  Palette,
  Plug,
  Receipt,
  Repeat,
  Rocket,
  Scale,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Target,
  Users,
  type LucideIcon as LucideIconComponent,
} from "lucide-react";

const ICON_BY_SLUG: Record<string, LucideIconComponent> = {
  "bar-chart-3": BarChart3,
  briefcase: Briefcase,
  "building-2": Building2,
  "calendar-range": CalendarRange,
  "credit-card": CreditCard,
  "dollar-sign": DollarSign,
  "folder-kanban": FolderKanban,
  "layout-dashboard": LayoutDashboard,
  palette: Palette,
  plug: Plug,
  receipt: Receipt,
  repeat: Repeat,
  rocket: Rocket,
  scale: Scale,
  settings: Settings,
  "shopping-bag": ShoppingBag,
  "sliders-horizontal": SlidersHorizontal,
  target: Target,
  users: Users,
};

function toIconSlug(iconName: string) {
  return iconName.replace(/^i-lucide-/, "");
}

export function LucideIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICON_BY_SLUG[toIconSlug(name)];
  if (!Icon) {
    return null;
  }
  return <Icon className={className} aria-hidden />;
}
