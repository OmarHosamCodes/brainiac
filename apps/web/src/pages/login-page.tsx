import { zodResolver } from "@hookform/resolvers/zod";
import { BrainCircuit, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, Link, useLocation } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { signInFormSchema, signUpFormSchema, type SignInFormValues, type SignUpFormValues } from "@/lib/schemas/auth";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type AuthMode = "sign-in" | "sign-up";

export function LoginPage() {
  const session = authClient.useSession();
  const location = useLocation();

  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/dashboard";
  const isSignUp = mode === "sign-up";

  const signInForm = useForm<SignInFormValues>({
    resolver: zodResolver(signInFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: { email: "", password: "", name: "" },
  });

  const form = isSignUp ? signUpForm : signInForm;

  if (!session.isPending && session.data) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSignIn(values: SignInFormValues) {
    setPending(true);
    setError(null);

    try {
      const result = await authClient.signIn.email({
        email: values.email.trim(),
        password: values.password,
      });

      if (result.error) {
        setError(result.error.message ?? "Sign in failed.");
        return;
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Sign in failed."));
    } finally {
      setPending(false);
    }
  }

  async function handleSignUp(values: SignUpFormValues) {
    setPending(true);
    setError(null);

    try {
      const result = await authClient.signUp.email({
        name: values.name?.trim() || values.email.trim().split("@")[0] || "User",
        email: values.email.trim(),
        password: values.password,
      });

      if (result.error) {
        setError(result.error.message ?? "Sign up failed.");
        return;
      }

      toast.success("Welcome to Brainiac", { description: "Your workspace is ready." });
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Sign up failed."));
    } finally {
      setPending(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    signInForm.reset();
    signUpForm.reset();
  }

  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden flex-1 flex-col justify-between overflow-hidden border-r border-border bg-muted/40 p-12 lg:flex xl:p-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, var(--border) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <Link to="/" className="relative z-10 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-foreground text-background">
            <BrainCircuit className="size-7" />
          </div>
          <div>
            <p className="text-xl font-bold tracking-tight">Brainiac</p>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              The infinite workspace
            </p>
          </div>
        </Link>

        <div className="relative z-10 max-w-lg">
          <h2 className="text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Reimagine the way you <span className="text-primary italic">think</span>.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Your mind isn&apos;t a grid. It&apos;s a canvas. Brainiac organizes chaos into clarity
            with an infinite spatial interface powered by an embedded agent.
          </p>
        </div>

        <div className="relative z-10 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          &copy; 2026 Brainiac
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-foreground text-background lg:hidden">
              <BrainCircuit className="size-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isSignUp ? "Create your account" : "Welcome back"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isSignUp
                  ? "Start building your infinite workspace."
                  : "Sign in to access your infinite workspace."}
              </p>
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
                        <Input type="text" autoComplete="name" placeholder="Jane Doe" {...field} />
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
                      <p className="text-xs text-muted-foreground">At least 8 characters.</p>
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
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
