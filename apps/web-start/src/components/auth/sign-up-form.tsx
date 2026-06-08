import { useNavigate } from "@tanstack/react-router";
import { Loader2, Lock, Mail, User } from "lucide-react";
import * as React from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { signUp } from "@/lib/auth-client";
import { getErrorMessage } from "@/utils/get-error-message";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export function SignUpForm(props: { onSwitchToSignIn(): void }) {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrors({});

    const formData = new FormData(event.currentTarget);
    const parsed = schema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join("."), issue.message])));
      setLoading(false);
      return;
    }

    try {
      await signUp.email(parsed.data, {
        onSuccess: () => {
          toast({ title: "Account created", description: "Welcome to Brainiac." });
          void navigate({ to: "/dashboard", replace: true });
        },
        onError: (error) => {
          toast({
            title: "Sign up failed",
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
        <h1 className="text-3xl font-bold tracking-normal">Create account</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Start with a workspace and add structure as you work.
        </p>
      </header>

      <div className="grid gap-2">
        <Label htmlFor="name">Full name</Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="name" name="name" autoComplete="name" className="pl-11" placeholder="Ada Lovelace" />
        </div>
        {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="signup-email">Email address</Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="signup-email" name="email" type="email" autoComplete="email" className="pl-11" placeholder="name@company.com" />
        </div>
        {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="signup-password" name="password" type="password" autoComplete="new-password" className="pl-11" placeholder="Password" />
        </div>
        {errors.password ? <p className="text-sm text-destructive">{errors.password}</p> : null}
      </div>

      <Button type="submit" size="lg" disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        Create account
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button type="button" className="font-bold text-primary hover:underline" onClick={props.onSwitchToSignIn}>
          Sign in instead
        </button>
      </p>
    </form>
  );
}
