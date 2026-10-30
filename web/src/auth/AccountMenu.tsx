import { useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";

import { messageFor } from "../kit/messages.ts";
import { toast } from "../kit/toast.ts";
import { accountView } from "./account.ts";
import { browserSession } from "./browser-session.ts";
import { useSession } from "./use-session.ts";
import "./auth.css";

export function AccountMenu(): ReactNode {
  const state = useSession();
  const location = useLocation();
  const view = accountView(state, location);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut(): Promise<void> {
    if (signingOut) return;
    setSigningOut(true);
    const result = await browserSession.signOut();
    if (result.kind === "redirect") {
      window.location.assign(result.to);
      return;
    }
    toast({ kind: "error", message: messageFor(result.code) });
    setSigningOut(false);
  }

  if (view.kind === "hidden") return null;

  if (view.kind === "signed_out") {
    return (
      <div className="auth-account">
        <Link to={view.href}>Sign in</Link>
      </div>
    );
  }

  return (
    <div className="auth-account" role="group" aria-label="Account">
      <p>
        Signed in as <strong>{view.displayName}</strong>
      </p>
      <p>
        Tenant: <strong>{view.tenantName}</strong>
      </p>
      <button
        type="button"
        className="ui-button"
        aria-disabled={signingOut ? true : undefined}
        onClick={() => void handleSignOut()}
      >
        Sign out
      </button>
    </div>
  );
}
