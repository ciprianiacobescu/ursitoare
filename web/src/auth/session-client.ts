import { createApiClient } from "../api/client.ts";
import type { ApiClient } from "../api/client.ts";
import type { CapabilityLoader } from "../kit/capabilities.ts";
import { redirectToSignIn } from "./return-to.ts";
import type { LocationLike } from "./return-to.ts";
import { withCsrfHeader, withCsrfRetry, withSessionEnd } from "./session-fetch.ts";
import { signOut } from "./sign-out.ts";
import type { SignOutResult } from "./sign-out.ts";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export interface SessionEnv {
  fetch: typeof fetch;
  location: LocationLike;
  loader: Pick<CapabilityLoader, "load" | "reset">;
}

export interface BrowserSession {
  api: ApiClient;
  logout: ApiClient;
  signOut(): Promise<SignOutResult>;
}

export function csrfTokenFrom(
  loader: Pick<CapabilityLoader, "load">,
): () => Promise<string | null> {
  return async (): Promise<string | null> => {
    const state = await loader.load();
    if (state.status !== "ready") return null;
    const token = state.me.csrfToken;
    return TOKEN_PATTERN.test(token) ? token : null;
  };
}

export function createBrowserSession(env: SessionEnv): BrowserSession {
  const csrfToken = csrfTokenFrom(env.loader);
  const csrfFetch = withCsrfHeader(env.fetch, csrfToken);
  const refresh = async (): Promise<void> => {
    env.loader.reset();
    await env.loader.load();
  };

  const api = createApiClient({
    fetch: withSessionEnd(withCsrfRetry(csrfFetch, refresh), () => {
      redirectToSignIn(env.location);
    }),
  });

  const logout = createApiClient({
    baseUrl: "",
    fetch: withCsrfRetry(csrfFetch, refresh),
  });

  const signOutClient = createApiClient({ baseUrl: "", fetch: csrfFetch });

  return {
    api,
    logout,
    signOut(): Promise<SignOutResult> {
      return signOut({ client: signOutClient, loader: env.loader });
    },
  };
}
