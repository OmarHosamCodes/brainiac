import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import {
  signInFormSchema,
  signUpFormSchema,
  type SignInFormValues,
  type SignUpFormValues,
} from "@/features/auth/auth-schemas";
import { getErrorMessage } from "@/lib/utils/get-error-message";

export type AuthMode = "sign-in" | "sign-up";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  state_mismatch: "Sign-in expired or was interrupted. Please try again.",
  please_restart_the_process: "Sign-in could not be completed. Please try again.",
  invalid_callback_request: "Invalid sign-in response. Please try again.",
};

function formatOAuthError(code: string): string {
  return OAUTH_ERROR_MESSAGES[code] ?? "Sign in failed. Please try again.";
}

export function useLoginPage() {
  const session = authClient.useSession();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [error, setError] = useState<string | null>(() => {
    const oauthError = searchParams.get("error");
    return oauthError ? formatOAuthError(oauthError) : null;
  });
  const [pending, setPending] = useState(false);
  const [emailAuthOpen, setEmailAuthOpen] = useState(false);
  const redirectTo = (location.state as { from?: string } | null)?.from ?? "/dashboard";
  const signInForm = useForm<SignInFormValues>({
    resolver: zodResolver(signInFormSchema),
    defaultValues: { email: "", password: "" },
  });
  const signUpForm = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: { email: "", password: "", name: "" },
  });
  const isSignUp = mode === "sign-up";

  async function handleSignIn(values: SignInFormValues) {
    setPending(true);
    setError(null);
    try {
      const result = await authClient.signIn.email({
        email: values.email.trim(),
        password: values.password,
      });
      if (result.error) setError(result.error.message ?? "Sign in failed.");
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
      toast.success("Welcome to Orch", { description: "Your workspace is ready." });
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Sign up failed."));
    } finally {
      setPending(false);
    }
  }

  async function handleGoogleSignIn() {
    setPending(true);
    setError(null);
    try {
      const loginUrl = new URL("/login", window.location.origin).href;
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: new URL(redirectTo, window.location.origin).href,
        errorCallbackURL: loginUrl,
      });
      if (result.error) setError(result.error.message ?? "Google sign in failed.");
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Google sign in failed."));
    } finally {
      setPending(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setEmailAuthOpen(true);
    signInForm.reset();
    signUpForm.reset();
  }

  function toggleEmailAuth() {
    setEmailAuthOpen((open) => {
      if (open) setError(null);
      return !open;
    });
  }

  return {
    session,
    redirectTo,
    isSignUp,
    error,
    pending,
    emailAuthOpen,
    form: isSignUp ? signUpForm : signInForm,
    signInForm,
    signUpForm,
    handleSignIn,
    handleSignUp,
    handleGoogleSignIn,
    switchMode,
    toggleEmailAuth,
  };
}
