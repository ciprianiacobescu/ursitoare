import type { CapabilityState } from "../kit/capabilities.ts";
import { SIGN_IN_PATH, signInUrl } from "./return-to.ts";
import type { LocationLike } from "./return-to.ts";

export type AccountView =
  | { kind: "hidden" }
  | { kind: "signed_in"; displayName: string; tenantName: string }
  | { kind: "signed_out"; href: string };

function isSignInPath(pathname: string): boolean {
  return pathname === SIGN_IN_PATH || pathname.startsWith(`${SIGN_IN_PATH}/`);
}

export function accountView(
  state: CapabilityState | null,
  location: Pick<LocationLike, "pathname" | "search">,
): AccountView {
  if (state === null || state.status === "failed") return { kind: "hidden" };

  if (state.status === "ready") {
    return {
      kind: "signed_in",
      displayName: state.me.user.displayName,
      tenantName: state.me.tenant.name,
    };
  }

  if (isSignInPath(location.pathname)) return { kind: "hidden" };

  return {
    kind: "signed_out",
    href: signInUrl({ returnTo: location.pathname + location.search }),
  };
}
