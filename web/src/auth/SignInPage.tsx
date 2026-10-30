import { useEffect } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { ApiRequestError } from "../api/client.ts";
import { ErrorPanel } from "../kit/ErrorPanel.tsx";
import { LoadingState } from "../kit/LoadingState.tsx";
import { signInView } from "./sign-in-page.ts";
import { useSession } from "./use-session.ts";
import "./auth.css";

const PAGE_TITLE = "Sign in · Ursitoare";

export function SignInPage(): ReactNode {
  const state = useSession();
  const view = signInView(window.location.search, state);

  useEffect(() => {
    const previous = document.title;
    document.title = PAGE_TITLE;
    return () => {
      document.title = previous;
    };
  }, []);

  if (view.phase === "checking") {
    return (
      <div className="auth-page">
        <LoadingState label="Checking your session" />
      </div>
    );
  }

  if (view.phase === "signed_in") {
    return (
      <div className="auth-page">
        <h1>Sign in</h1>
        <p>You are signed in as {view.displayName}.</p>
        <Link to={view.continueHref}>Continue</Link>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <h1>Sign in</h1>
      {view.errorCode === null ? null : (
        <ErrorPanel error={new ApiRequestError(400, view.errorCode, "Sign-in refused")} />
      )}
      <p>Use your organization account to open Ursitoare.</p>
      <button
        type="button"
        className="ui-button"
        onClick={() => {
          window.location.assign(view.loginHref);
        }}
      >
        Sign in
      </button>
    </div>
  );
}
