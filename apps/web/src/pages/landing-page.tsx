import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Blocks,
  BrainCircuit,
  Briefcase,
  Frame,
  Layers,
  LayoutGrid,
  Store,
  UserPlus,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { MarketingPageShell } from "@/components/marketing-page-shell";
import { Button } from "@/components/ui/button";
import { useBilling } from "@/hooks/use-billing";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";

const features = [
  { icon: LayoutGrid, label: "Workspace Nodes", free: "10", pro: "200" },
  { icon: Blocks, label: "Blocks per Tab", free: "6", pro: "24" },
  { icon: Layers, label: "Tabs per Node", free: "3", pro: "12" },
  { icon: Users, label: "Teams", free: "1", pro: "5" },
  { icon: UserPlus, label: "Team Members", free: "3", pro: "20" },
  { icon: BrainCircuit, label: "AI Conversations", free: "5", pro: "Unlimited" },
  { icon: Briefcase, label: "Agency Ops", free: false, pro: true },
  { icon: Store, label: "Marketplace Publishing", free: false, pro: true },
] as const;

const landingFeatures = [
  {
    eyebrow: "01 / Canvas",
    title: "An infinite plane for thinking",
    body: "Pan, zoom, and place nodes anywhere. Each node holds tabs, each tab holds blocks: task lists, notes, kanban boards, decision matrices. Your work has a place, and the place has a shape.",
    icon: Frame,
  },
  {
    eyebrow: "02 / Agent",
    title: "An agent that mutates the workspace",
    body: "Talk to the agent. It reads your nodes, fetches references, writes new blocks, restructures what's there. Every tool call is visible as plain text. No magic, no mystery, no surprises.",
    icon: BrainCircuit,
  },
  {
    eyebrow: "03 / Blocks",
    title: "Composable units, not templates",
    body: "Tasks, notes, kanban, OKRs, decision matrices, prompts. Blocks compose inside tabs and tabs compose inside nodes. Build the shape your work actually has.",
    icon: Blocks,
  },
] as const;

export function LandingPage() {
  useQuery({
    ...orpc.healthCheck.queryOptions(),
  } as unknown as Parameters<typeof useQuery>[0]);

  const session = authClient.useSession();
  const isAuthenticated = Boolean(session.data?.user);
  const navigate = useNavigate();
  const { checkout, isPro } = useBilling(isAuthenticated);

  async function handleCheckout() {
    if (!isAuthenticated) {
      await navigate("/login");
      return;
    }
    if (isPro) {
      await navigate("/billing");
      return;
    }
    await checkout("pro");
  }

  return (
    <MarketingPageShell>
      <section className="relative w-full">
        <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 md:px-10 md:pt-28 md:pb-32 lg:px-16">
          <div className="mb-16 flex items-center gap-2.5 text-sm font-bold tracking-tight text-neutral-900 md:mb-20 dark:text-neutral-100">
            <span className="flex size-7 items-center justify-center rounded-md bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">
              <BrainCircuit className="size-4" />
            </span>
            Brainiac
          </div>

          <h1 className="max-w-4xl text-[2.5rem] leading-[1.02] font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-[5.5rem]">
            A spatial workspace{" "}
            <span className="text-neutral-400 dark:text-neutral-500">
              for the way you actually think.
            </span>
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-neutral-600 md:mt-10 md:text-xl dark:text-neutral-400">
            Brainiac gives every piece of your work a place on an infinite canvas, then puts an AI
            agent next to you that can read and reshape it in real time.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3 md:mt-12">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link to={isAuthenticated ? "/dashboard" : "/login"}>
                {isAuthenticated ? "Open workspace" : "Get started"}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg" className="h-12 px-6 text-base">
              <a href="#pricing">See pricing</a>
            </Button>
          </div>
        </div>

        <div className="border-t border-neutral-200 dark:border-neutral-800/80" />
      </section>

      <section className="w-full">
        <div className="mx-auto max-w-6xl px-6 md:px-10 lg:px-16">
          {landingFeatures.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.eyebrow}
                className="grid grid-cols-1 gap-y-8 border-b border-neutral-200 py-20 last:border-b-0 md:grid-cols-12 md:gap-x-10 md:py-28 dark:border-neutral-800/80"
              >
                <div
                  className={cn(
                    "text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 md:col-span-3 md:col-start-1 dark:text-neutral-500",
                    idx % 2 === 1 && "md:order-2 md:col-start-10",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-primary" />
                    <span>{feature.eyebrow}</span>
                  </div>
                </div>

                <div
                  className={cn(
                    "md:col-span-8",
                    idx % 2 === 1 ? "md:order-1 md:col-start-1" : "md:col-start-5",
                  )}
                >
                  <h2 className="max-w-2xl text-3xl leading-[1.1] font-bold tracking-tight md:text-5xl">
                    {feature.title}
                  </h2>
                  <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-600 md:mt-6 md:text-lg dark:text-neutral-400">
                    {feature.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section
        id="pricing"
        className="w-full scroll-mt-8 border-t border-neutral-200 dark:border-neutral-800/80"
      >
        <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28 lg:px-16">
          <div className="grid grid-cols-1 gap-y-8 md:grid-cols-12 md:gap-x-10">
            <div className="md:col-span-4">
              <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
                Pricing
              </div>
              <h2 className="text-3xl leading-[1.1] font-bold tracking-tight md:text-5xl">
                Free to try.{" "}
                <span className="text-neutral-400 dark:text-neutral-500">
                  Pro when you need the room.
                </span>
              </h2>
              <p className="mt-5 max-w-sm text-base leading-relaxed text-neutral-600 md:text-lg dark:text-neutral-400">
                Start with 10 nodes, 6 blocks per tab, and the AI agent. Upgrade for 200 nodes,
                agency ops, and marketplace publishing.
              </p>

              <div className="mt-8 flex flex-col gap-4">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">$0</span>
                    <span className="text-neutral-400">/month</span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-500">10 nodes, single user</p>
                </div>
                <Button asChild variant="outline" size="lg">
                  <Link to={isAuthenticated ? "/dashboard" : "/login"}>Get started</Link>
                </Button>
              </div>

              <div className="mt-10 border-t border-neutral-200 pt-8 dark:border-neutral-800/80">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">$19</span>
                  <span className="text-neutral-400">/month</span>
                </div>
                <p className="mt-1 text-sm text-neutral-500">200 nodes, teams, agency ops</p>
                <Button
                  size="lg"
                  variant={isAuthenticated && isPro ? "outline" : "default"}
                  className="mt-4"
                  onClick={() => void handleCheckout()}
                >
                  {isAuthenticated && isPro ? "Current plan" : "Upgrade to Pro"}
                </Button>
              </div>
            </div>

            <div className="md:col-span-7 md:col-start-6">
              <div className="border-t border-neutral-200 dark:border-neutral-800/80">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={feature.label}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 border-b border-neutral-200 py-4 dark:border-neutral-800/80"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="size-4 shrink-0 text-neutral-400 dark:text-neutral-500" />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                          {feature.label}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "text-right text-sm tabular-nums",
                          feature.free === false
                            ? "text-neutral-300 dark:text-neutral-700"
                            : "text-neutral-600 dark:text-neutral-400",
                        )}
                      >
                        {feature.free === false ? "" : feature.free}
                      </span>
                      <span
                        className={cn(
                          "text-right text-sm font-semibold tabular-nums",
                          feature.pro === true
                            ? "text-primary"
                            : "text-neutral-900 dark:text-neutral-100",
                        )}
                      >
                        {feature.pro === true ? "Included" : feature.pro}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingPageShell>
  );
}
