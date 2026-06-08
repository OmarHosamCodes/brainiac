import { useNavigate } from "@tanstack/react-router";
import { Loader2, Lock, Mail } from "lucide-react";
import * as React from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { signIn } from "@/lib/auth-client";
import { getErrorMessage } from "@/utils/get-error-message";

const schema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export function SignInForm(props: { onSwitchToSignUp(): void }) {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrors({});

    const formData = new FormData(event.currentTarget);
    const parsed = schema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join("."), issue.message])));
      setLoading(false);
      return;
    }

    try {
      await signIn.email(parsed.data, {
        onSuccess: () => {
          toast({ title: "Success", description: "Welcome back to your workspace." });
          void navigate({ to: "/dashboard", replace: true });
        },
        onError: (error) => {
          toast({
            title: "Sign in failed",
            description: error.error.message,
            variant: "destructive",
          });
        },
      });
    } catch (error) {
      toast({
        title: "An unexpected error occurred",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <header>
        <h1 className="text-3xl font-bold tracking-normal">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Enter your credentials to access your workspace.
        </p>
      </header>

      <div className="grid gap-2">
        <Label htmlFor="email">Email address</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="email" name="email" type="email" autoComplete="email" className="pl-11" placeholder="name@company.com" />
        </div>
        {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="password" name="password" type="password" autoComplete="current-password" className="pl-11" placeholder="Password" />
        </div>
        {errors.password ? <p className="text-sm text-destructive">{errors.password}</p> : null}
      </div>

      <Button type="submit" size="lg" disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        Sign in
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Do not have an account?{" "}
        <button type="button" className="font-bold text-primary hover:underline" onClick={props.onSwitchToSignUp}>
          Sign up for free
        </button>
      </p>
    </form>
  );
}
