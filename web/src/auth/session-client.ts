import { createApiClient } from "../api/client.ts";
import type { ApiClient } from "../api/client.ts";
import type { CapabilityLoader } from "../kit/capabilities.ts";
import { redirectToSignIn } from "./return-to.ts";
import type { LocationLike } from "./return-to.ts";
import { withCsrfHeader, withSessionEnd } from "./session-fetch.ts";
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

  const api = createApiClient({
    fetch: withSessionEnd(withCsrfHeader(env.fetch, csrfToken), () => {
      redirectToSignIn(env.location);
    }),
  });

  const logout = createApiClient({
    baseUrl: "",
    fetch: withCsrfHeader(env.fetch, csrfToken),
  });

  return {
    api,
    logout,
    signOut(): Promise<SignOutResult> {
      return signOut({ client: logout, loader: env.loader });
    },
  };
}
