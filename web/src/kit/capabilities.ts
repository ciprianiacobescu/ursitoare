import { ApiRequestError, createApiClient } from "../api/client.ts";
import type { ApiClient } from "../api/client.ts";
import { navItems } from "../app/features.ts";
import type { NavItem } from "../app/features.ts";
import { messageFor } from "./messages.ts";

export interface Me {
  user: { id: string; displayName: string; email: string | null };
  tenant: { id: string; name: string; reviewProfile: "solo" | "team" };
  capabilities: ReadonlySet<string>;
  csrfToken: string;
}

export type CapabilityState =
  | { status: "signed_out" }
  | { status: "failed"; code: string }
  | { status: "ready"; me: Me };

export interface CapabilityLoader {
  load(signal?: AbortSignal): Promise<CapabilityState>;
  reset(): void;
}

const CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;
const CAPABILITY_PATTERN = /^[a-z][a-z0-9_.:-]{0,63}$/;
const REVIEW_PROFILES: ReadonlySet<string> = new Set(["solo", "team"]);

const HIDDEN_PREFIX =
  "Some menu entries are hidden because your permissions could not be loaded. ";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function abortError(): Error {
  return new DOMException("Aborted", "AbortError");
}

export function parseMe(body: unknown): Me | null {
  if (!isRecord(body)) return null;
  const user = body["user"];
  const tenant = body["tenant"];
  const capabilities = body["capabilities"];
  const csrfToken = body["csrfToken"];
  if (!isRecord(user) || !isRecord(tenant) || !Array.isArray(capabilities)) return null;
  const { id, displayName, email } = user;
  if (!isString(id) || !isString(displayName)) return null;
  if (!(email === null || isString(email))) return null;
  const { id: tenantId, name: tenantName, reviewProfile } = tenant;
  if (!isString(tenantId) || !isString(tenantName)) return null;
  if (!isString(reviewProfile) || !REVIEW_PROFILES.has(reviewProfile)) return null;
  if (!isString(csrfToken) || csrfToken.length < 1) return null;
  const allowed = new Set<string>();
  for (const entry of capabilities) {
    if (isString(entry) && CAPABILITY_PATTERN.test(entry)) {
      allowed.add(entry);
    }
  }
  return {
    user: { id, displayName, email },
    tenant: {
      id: tenantId,
      name: tenantName,
      reviewProfile: reviewProfile === "team" ? "team" : "solo",
    },
    capabilities: allowed,
    csrfToken,
  };
}

export function createCapabilityLoader(client: Pick<ApiClient, "get">): CapabilityLoader {
  let cached: CapabilityState | null = null;
  let inFlight: Promise<CapabilityState> | null = null;

  function start(): Promise<CapabilityState> {
    if (inFlight !== null) return inFlight;
    const request: Promise<CapabilityState> = client.get<unknown>("/me").then(
      (body): CapabilityState => {
        const me = parseMe(body);
        if (me === null) return { status: "failed", code: "INVALID_RESPONSE" };
        cached = { status: "ready", me };
        return cached;
      },
      (error): CapabilityState => {
        if (error instanceof ApiRequestError) {
          if (error.status === 401) return { status: "signed_out" };
          return {
            status: "failed",
            code: CODE_PATTERN.test(error.code) ? error.code : "UNKNOWN_ERROR",
          };
        }
        return { status: "failed", code: "UNKNOWN_ERROR" };
      },
    );
    inFlight = request;
    request.then(
      () => {
        if (inFlight === request) inFlight = null;
      },
      () => {
        if (inFlight === request) inFlight = null;
      },
    );
    return request;
  }

  async function load(signal?: AbortSignal): Promise<CapabilityState> {
    if (signal?.aborted) throw abortError();
    if (cached !== null) return cached;
    const pending = start();
    if (signal === undefined) return pending;
    return new Promise<CapabilityState>((resolve, reject) => {
      const onAbort = (): void => {
        reject(abortError());
      };
      signal.addEventListener("abort", onAbort);
      pending.then(
        (state) => {
          signal.removeEventListener("abort", onAbort);
          resolve(state);
        },
        (error: unknown) => {
          signal.removeEventListener("abort", onAbort);
          reject(error);
        },
      );
    });
  }

  return {
    load,
    reset(): void {
      cached = null;
    },
  };
}

export const capabilityLoader: CapabilityLoader = createCapabilityLoader(createApiClient());

export function visibleNav(
  state: CapabilityState | null,
  nav: (capabilities?: ReadonlySet<string>) => NavItem[] = navItems,
): NavItem[] {
  if (state !== null && state.status === "ready") {
    return nav(state.me.capabilities);
  }
  return nav();
}

export function capabilityNotice(state: CapabilityState | null): string | null {
  if (state === null || state.status !== "failed") return null;
  return `${HIDDEN_PREFIX}${messageFor(state.code)}`;
}
