import { createFileRoute, redirect } from "@tanstack/react-router";
import * as React from "react";

import { SignInForm } from "@/components/auth/sign-in-form";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { DefaultLayout } from "@/layouts/default-layout";
import { getAuthSessionForRoute } from "@/lib/auth-guard";
import { useSession } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const session = await getAuthSessionForRoute();

    if (session) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginRoute,
});

function LoginRoute() {
  const [showSignIn, setShowSignIn] = React.useState(true);
  const session = useSession();

  return (
    <DefaultLayout>
      <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(24rem,34rem)]">
        <aside className="relative hidden overflow-hidden border-r bg-muted/40 lg:block">
          <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(circle_at_1px_1px,oklch(0.55_0.005_285/0.25)_1px,transparent_0)] [background-size:24px_24px]" />
          <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-3xl bg-foreground text-background">
                <span className="text-lg font-black">B</span>
              </div>
              <div>
                <p className="text-xl font-black uppercase">Brainiac</p>
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  Infinite workspace
                </p>
              </div>
            </div>
            <div className="max-w-xl">
              <h2 className="text-5xl font-bold tracking-normal xl:text-6xl">
                Structure your thinking on a canvas.
              </h2>
              <p className="mt-6 max-w-prose text-lg leading-8 text-muted-foreground">
                Nodes, blocks, teams, and an agent that works directly with the workspace.
              </p>
            </div>
          </div>
        </aside>
        <main className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md">
            {session.isPending ? (
              <div className="rounded-[2rem] border bg-card p-8 text-sm font-bold text-muted-foreground">
                Syncing identity
              </div>
            ) : showSignIn ? (
              <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
            ) : (
              <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
            )}
          </div>
        </main>
      </div>
    </DefaultLayout>
  );
}
