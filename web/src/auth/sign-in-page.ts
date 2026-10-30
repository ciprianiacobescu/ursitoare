import type { CapabilityState } from "../kit/capabilities.ts";
import { loginUrl, parseSignInSearch } from "./return-to.ts";

export type SignInView =
  | { phase: "checking" }
  | { phase: "signed_in"; displayName: string; continueHref: string }
  | { phase: "ready"; errorCode: string | null; loginHref: string };

export function signInView(search: string, state: CapabilityState | null): SignInView {
  if (state === null) return { phase: "checking" };

  const parsed = parseSignInSearch(search);

  if (state.status === "ready") {
    return {
      phase: "signed_in",
      displayName: state.me.user.displayName,
      continueHref: parsed.returnTo,
    };
  }

  return {
    phase: "ready",
    errorCode: parsed.error,
    loginHref: loginUrl(parsed.returnTo),
  };
}
