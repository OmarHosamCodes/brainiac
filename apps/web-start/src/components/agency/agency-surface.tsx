import { Link, useNavigate } from "@tanstack/react-router";
import { Pause, Play, TimerReset } from "lucide-react";
import * as React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgencySection } from "@/components/agency/use-agency-section";
import type { AgencySection } from "@/hooks/use-agency-search";
import { useAppShellContext, useAppShellPageTitle } from "@/hooks/use-app-shell";
import { useBilling } from "@/hooks/use-billing";
import { usePersistentTimer } from "@/hooks/use-persistent-timer";
import { useTeamSelection } from "@/hooks/use-team-selection";

const sections = [
  "time",
  "projects",
  "clients",
  "reports",
  "resourcing",
  "billing",
  "settings",
] as const;

export function AgencySurface() {
  const navigate = useNavigate();
  const { section, project } = useAgencySection();
  const currentSection = section ?? "time";
  const billing = useBilling();
  const teamSelection = useTeamSelection();
  const timer = usePersistentTimer();
  const [description, setDescription] = React.useState(timer.description);

  useAppShellPageTitle("Agency");
  const shellContext = React.useMemo(
    () => (
    <div className="flex items-center gap-2">
      <Badge variant={timer.isRunning ? "default" : "muted"}>
        {timer.isRunning ? "Timer running" : "Timer idle"}
      </Badge>
      <span className="truncate text-sm text-muted-foreground">
        {teamSelection.selectedTeam?.name ?? "No team selected"}
      </span>
    </div>
    ),
    [teamSelection.selectedTeam?.name, timer.isRunning],
  );
  useAppShellContext(shellContext);

  function setSection(nextSection: string) {
    const parsedSection = nextSection as AgencySection;

    void navigate({
      to: "/agency",
      search: { section: parsedSection, project: parsedSection === "projects" ? project : undefined },
      replace: false,
    });
  }

  if (!billing.limits.agencyOps) {
    return (
      <section className="p-4 md:p-6">
        <Alert className="max-w-2xl">
          <AlertTitle>Agency requires Pro</AlertTitle>
          <AlertDescription>
            Your current plan can load the Agency route, but agency operations are gated until Pro is active.
          </AlertDescription>
        </Alert>
        <Button className="mt-5" onClick={() => void billing.checkout("pro")}>
          Upgrade to Pro
        </Button>
      </section>
    );
  }

  return (
    <section className="min-h-full">
      <div className="border-b px-4 py-4 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Agency ops</p>
            <h2 className="text-xl font-bold capitalize">{currentSection}</h2>
          </div>
          <Tabs value={currentSection} onValueChange={setSection}>
            <TabsList className="flex-wrap justify-start">
              {sections.map((item) => (
                <TabsTrigger key={item} value={item} className="capitalize">
                  {item}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid gap-6 p-4 md:p-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="rounded-[2rem] border bg-card p-5">
          <h3 className="text-base font-bold">Time tracker</h3>
          <div className="mt-4 grid gap-2">
            <Label htmlFor="timer-description">Description</Label>
            <Input
              id="timer-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What are you working on?"
            />
          </div>
          <div className="mt-4 flex gap-2">
            {timer.isRunning ? (
              <Button type="button" variant="outline" onClick={timer.stop}>
                <Pause className="size-4" />
                Stop
              </Button>
            ) : (
              <Button type="button" onClick={() => timer.start(description)}>
                <Play className="size-4" />
                Start
              </Button>
            )}
            <Button type="button" variant="ghost" size="icon" onClick={timer.stop} aria-label="Reset timer">
              <TimerReset className="size-4" />
            </Button>
          </div>
        </aside>

        <main className="rounded-[2rem] border bg-card p-5">
          <AgencySectionContent section={currentSection} project={project} />
        </main>
      </div>
    </section>
  );
}

function AgencySectionContent(props: { section: AgencySection; project: string | undefined }) {
  if (props.section === "projects" && props.project) {
    return (
      <>
        <Button asChild variant="outline" size="sm">
          <Link to="/agency" search={{ section: "projects" }}>Back to projects</Link>
        </Button>
        <h3 className="mt-4 text-lg font-bold">Project {props.project}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Project drill-down routing is preserved through the `project` search parameter.
        </p>
      </>
    );
  }

  return (
    <>
      <h3 className="text-lg font-bold capitalize">{props.section}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        This React surface is wired for section search params, billing state, team context, and persistent timer state. The detailed oRPC mutations and tables from the Nuxt agency components are the next parity pass.
      </p>
    </>
  );
}
