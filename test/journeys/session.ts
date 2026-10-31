import { SESSION_COOKIE } from "../../src/identity/oidc/cookies.ts";
import { createApiClient } from "../../web/src/api/client.ts";
import type { ApiClient } from "../../web/src/api/client.ts";
import { completeFakeLogin } from "../support/oidc-login.ts";
import { oidcApi } from "../support/e2e-stack/oidc-part.ts";
import type { E2eStack } from "../support/e2e-stack/stack.ts";

export interface TestSession {
  cookie: string;
  csrfToken: string;
  userId: string;
}

const LOGIN_COOKIE = "ursitoare_login";

function cookieValue(response: Response, name: string): string {
  for (const line of response.headers.getSetCookie()) {
    const pair = line.split(";")[0] ?? "";
    const index = pair.indexOf("=");
    if (index > 0 && pair.slice(0, index).trim() === name) {
      return pair.slice(index + 1).trim();
    }
  }
  throw new Error(`sign-in step failed: no ${name} cookie`);
}

function location(response: Response, step: string): string {
  const value = response.headers.get("location");
  if (response.status < 300 || response.status >= 400 || value === null) {
    throw new Error(`sign-in step failed: ${step} (status ${response.status})`);
  }
  return value;
}

export async function signInAs(
  stack: Pick<E2eStack, "url" | "handles">,
  username: string,
): Promise<TestSession> {
  const login = await fetch(new URL("/auth/oidc/login?return_to=%2F", stack.url), {
    redirect: "manual",
  });
  const authorizationUrl = location(login, "login");
  const loginCookie = cookieValue(login, LOGIN_COOKIE);

  const callbackUrl = await completeFakeLogin(oidcApi(stack.handles).fake, authorizationUrl, username);
  const callback = await fetch(new URL(callbackUrl, stack.url), {
    redirect: "manual",
    headers: { cookie: `${LOGIN_COOKIE}=${loginCookie}` },
  });
  location(callback, "callback");
  const cookie = `${SESSION_COOKIE}=${cookieValue(callback, SESSION_COOKIE)}`;

  const me = await fetch(new URL("/api/v1/me", stack.url), {
    headers: { cookie, accept: "application/json" },
  });
  if (!me.ok) {
    throw new Error(`sign-in step failed: me (status ${me.status})`);
  }
  const body = (await me.json()) as { csrfToken?: unknown; user?: { id?: unknown } };
  const csrfToken = body.csrfToken;
  const userId = body.user?.id;
  if (typeof csrfToken !== "string" || typeof userId !== "string") {
    throw new Error("sign-in step failed: me answered an unexpected shape");
  }
  return { cookie, csrfToken, userId };
}

export function sessionClient(stack: Pick<E2eStack, "url">, session: TestSession): ApiClient {
  return createApiClient({
    fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      headers.set("cookie", session.cookie);
      const method = (init?.method ?? "GET").toUpperCase();
      if (method !== "GET") {
        headers.set("x-csrf-token", session.csrfToken);
      }
      return fetch(new URL(String(input), stack.url), { ...init, headers, redirect: "manual" });
    },
  });
}
