export type AuthMode = "sign-in" | "sign-up";

export function authModeFromSearchParam(value: string | null): AuthMode {
  return value === "sign-up" ? "sign-up" : "sign-in";
}
