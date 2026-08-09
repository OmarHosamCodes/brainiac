import { ChevronDown, Loader2 } from "lucide-react";
import { Navigate, Link } from "react-router-dom";

import Scanner from "@/components/marketing/bits/Scanner";
import { MarketingBrandLockup } from "@/components/marketing/marketing-brand-lockup";
import { Button } from "@/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { useLoginPage } from "@/features/auth/hooks/use-login-page";
import type { SignUpFormValues } from "@/features/auth/auth-schemas";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

const GOOGLE_LOGO_URL =
  "https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1755835725776";

export function LoginPage() {
  const {
    session,
    redirectTo,
    isSignUp,
    error,
    pending,
    emailAuthOpen,
    form,
    signUpForm,
    handleSignIn,
    handleSignUp,
    handleGoogleSignIn,
    switchMode,
    toggleEmailAuth,
  } = useLoginPage();
  const reducedMotion = usePrefersReducedMotion();

  if (!session.isPending && session.data) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-[var(--marketing-ink)] p-12 text-[var(--marketing-ink-foreground)] lg:flex xl:p-16">
        {!reducedMotion ? (
          <div
            className="pointer-events-none absolute inset-0 opacity-30 dark:opacity-50"
            aria-hidden="true"
          >
            <Scanner
              color1="#6b7280"
              color2="#5b5bd6"
              color3="#f2f2f5"
              speed={0.5}
              sweepSpeed={0.25}
              sweepWidth={1.6}
              sweepFalloff={6}
              scale={1.5}
              frequency={2}
              ripple={0.22}
              bandDensity={11}
              lineSharpness={5.5}
              glow={0.22}
              scanDirection="vertical"
              colorSpread={0.7}
              brightness={0.85}
              contrast={1.15}
              softness={1.4}
              vignette={0.45}
              scanline
              grain
              grainIntensity={0.05}
              opacity={0.9}
              mouseInteraction
              mouseRadius={0.5}
              mouseStrength={0.35}
            />
          </div>
        ) : null}

        <div className="relative z-10">
          <MarketingBrandLockup linkToHome />
        </div>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance xl:text-5xl">
            Map your thinking.
            <br />
            Run your agency.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-[var(--marketing-ink-muted)]">
            Think on the canvas. Track time in Agency. The agent shows every tool call.
          </p>
        </div>

        <p className="relative z-10 text-xs text-[var(--marketing-ink-muted)]">
          &copy; {new Date().getFullYear()} Orch
        </p>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-md space-y-8">
            <div className="flex flex-col gap-4 lg:items-start">
              <MarketingBrandLockup linkToHome className="lg:hidden" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {isSignUp ? "Create your account" : "Sign in"}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {isSignUp
                    ? "Start a free workspace. 10 nodes, agent included."
                    : "Open your canvas, Agency, and agent."}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={() => void handleGoogleSignIn()}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <img src={GOOGLE_LOGO_URL} alt="" className="size-4" />
              )}
              Continue with Google
            </Button>

            {error && !emailAuthOpen ? <p className="text-sm text-destructive">{error}</p> : null}

            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              onClick={toggleEmailAuth}
              aria-expanded={emailAuthOpen}
            >
              {isSignUp ? "Create account with email" : "Sign in with email"}
              <ChevronDown
                className={cn(
                  "size-4 transition-transform duration-300",
                  emailAuthOpen && "rotate-180",
                )}
              />
            </button>

            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-in-out",
                emailAuthOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <div className="space-y-4 pt-1">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">or</span>
                    </div>
                  </div>

                  <Form {...form}>
                    <form
                      className="space-y-4"
                      onSubmit={form.handleSubmit((values) =>
                        isSignUp ? handleSignUp(values as SignUpFormValues) : handleSignIn(values),
                      )}
                    >
                      {isSignUp ? (
                        <FormField
                          control={signUpForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  autoComplete="name"
                                  placeholder="Jane Doe"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      ) : null}

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" autoComplete="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                autoComplete={isSignUp ? "new-password" : "current-password"}
                                {...field}
                              />
                            </FormControl>
                            {isSignUp ? (
                              <p className="text-xs text-muted-foreground">
                                At least 8 characters.
                              </p>
                            ) : null}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {error ? <p className="text-sm text-destructive">{error}</p> : null}

                      <Button type="submit" className="w-full" disabled={pending}>
                        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                        {isSignUp ? "Create account" : "Sign in"}
                      </Button>
                    </form>
                  </Form>

                  <p className="text-center text-sm text-muted-foreground">
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                    <button
                      type="button"
                      className="font-semibold text-primary hover:underline"
                      onClick={() => switchMode(isSignUp ? "sign-in" : "sign-up")}
                    >
                      {isSignUp ? "Sign in" : "Create account"}
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="border-t border-border px-6 py-4">
          <div className="mx-auto flex max-w-md flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <Link to="/" className="transition-colors hover:text-foreground">
              Home
            </Link>
            <Link to="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
