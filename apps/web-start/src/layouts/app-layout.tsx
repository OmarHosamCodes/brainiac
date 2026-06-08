import { Link, useNavigate } from "@tanstack/react-router";
import { Briefcase, CreditCard, LayoutDashboard, LogOut, PanelRight, ShoppingBag } from "lucide-react";
import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export type AppShellContextValue = {
  title: string;
  actions: React.ReactNode;
  context: React.ReactNode;
  dockContent: React.ReactNode;
  isAgentDockOpen: boolean;
  setAgentDockOpen(open: boolean): void;
  setTitle(title: string): void;
  setActions(node: React.ReactNode): void;
  setContext(node: React.ReactNode): void;
  setDockContent(node: React.ReactNode): void;
  setCustomDock(enabled: boolean): void;
};

const AppShellContext = React.createContext<AppShellContextValue | null>(null);

export function AppShellProvider(props: { children: React.ReactNode }) {
  const [title, setTitle] = React.useState("Workspace");
  const [actions, setActions] = React.useState<React.ReactNode>(null);
  const [context, setContext] = React.useState<React.ReactNode>(null);
  const [dockContent, setDockContent] = React.useState<React.ReactNode>(null);
  const [customDock, setCustomDock] = React.useState(false);
  const [isAgentDockOpen, setAgentDockOpen] = React.useState(false);

  const value = React.useMemo<AppShellContextValue>(
    () => ({
      title,
      actions,
      context,
      dockContent: customDock ? dockContent : null,
      isAgentDockOpen,
      setAgentDockOpen,
      setTitle,
      setActions,
      setContext,
      setDockContent,
      setCustomDock,
    }),
    [actions, context, customDock, dockContent, isAgentDockOpen, title],
  );

  return <AppShellContext.Provider value={value}>{props.children}</AppShellContext.Provider>;
}

export function useAppShell(): AppShellContextValue {
  const value = React.useContext(AppShellContext);

  if (!value) {
    throw new Error("useAppShell must be used inside AppShellProvider");
  }

  return value;
}

export function useAppShellPageTitle(title: string): void {
  const { setTitle } = useAppShell();
  React.useEffect(() => {
    setTitle(title);
    return () => setTitle("Workspace");
  }, [setTitle, title]);
}

export function useAppShellActions(node: React.ReactNode): void {
  const { setActions } = useAppShell();
  React.useEffect(() => {
    setActions(node);
    return () => setActions(null);
  }, [setActions, node]);
}

export function useAppShellContext(node: React.ReactNode): void {
  const { setContext } = useAppShell();
  React.useEffect(() => {
    setContext(node);
    return () => setContext(null);
  }, [setContext, node]);
}

export function useAppShellDockContent(node: React.ReactNode): void {
  const { setDockContent } = useAppShell();
  React.useEffect(() => {
    setDockContent(node);
    return () => setDockContent(null);
  }, [setDockContent, node]);
}

export function useAppShellCustomDock(): void {
  const { setCustomDock } = useAppShell();
  React.useEffect(() => {
    setCustomDock(true);
    return () => setCustomDock(false);
  }, [setCustomDock]);
}

const navigationItems = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Agency", to: "/agency", icon: Briefcase },
  { label: "Marketplace", to: "/pricing", icon: ShoppingBag },
  { label: "Billing", to: "/billing/success", icon: CreditCard },
] as const;

export function AppLayout(props: { children: React.ReactNode }): React.ReactElement {
  const shell = useAppShell();
  const navigate = useNavigate();
  const session = useSession();
  const user = session.data?.user;
  const initials = getInitials(user?.name ?? user?.email ?? "B");

  async function handleSignOut() {
    await signOut();
    await navigate({ to: "/login", replace: true });
  }

  return (
    <div className="grid min-h-screen bg-background text-foreground md:grid-cols-[4.5rem_minmax(0,1fr)]">
      <aside className="hidden border-r bg-muted/60 md:flex md:flex-col md:items-center md:gap-4 md:py-4">
        <Link
          to="/dashboard"
          className="flex size-11 items-center justify-center rounded-2xl border bg-background text-foreground"
          aria-label="Open dashboard"
        >
          <span className="text-lg font-black">B</span>
        </Link>
        <nav className="flex flex-1 flex-col items-center gap-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex size-10 items-center justify-center rounded-2xl text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                activeProps={{ className: "bg-primary/10 text-primary ring-1 ring-primary/30" }}
                aria-label={item.label}
              >
                <Icon className="size-4.5" />
              </Link>
            );
          })}
        </nav>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background">
              <Avatar className="size-10 border bg-background">
                <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? user?.email ?? "Account"} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end">
            <DropdownMenuLabel>{user?.email ?? "Account"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSignOut}>
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </aside>

      <div className={cn("grid min-h-screen grid-rows-[auto_minmax(0,1fr)]", shell.isAgentDockOpen && "lg:grid-cols-[minmax(0,1fr)_22rem]")}>
        <header className="col-span-full flex min-h-16 items-center gap-3 border-b bg-background px-4 md:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Brainiac
            </p>
            <h1 className="truncate text-lg font-bold">{shell.title}</h1>
          </div>
          <div className="hidden min-w-0 flex-1 items-center justify-center md:flex">{shell.context}</div>
          <div className="flex items-center gap-2">
            {shell.actions}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={shell.isAgentDockOpen ? "Close agent dock" : "Open agent dock"}
              onClick={() => shell.setAgentDockOpen(!shell.isAgentDockOpen)}
            >
              <PanelRight className="size-4" />
            </Button>
          </div>
        </header>

        <main className="min-w-0 overflow-auto">{props.children}</main>

        {shell.isAgentDockOpen ? (
          <aside className="hidden border-l bg-muted/40 lg:block">
            {shell.dockContent ?? (
              <div className="flex h-full flex-col justify-between p-5">
                <div>
                  <h2 className="text-sm font-bold">Agent dock</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Route-specific agent context will appear here as the dashboard port is expanded.
                  </p>
                </div>
                <Separator />
              </div>
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function getInitials(value: string) {
  return value
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
