// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { ApiRequestError } from "../api/client.ts";
import type { ApiClient } from "../api/client.ts";
import type { CapabilityLoader } from "../kit/capabilities.ts";
import { LOGOUT_PATH, SIGN_IN_PATH } from "./return-to.ts";

export type SignOutResult = { kind: "redirect"; to: string } | { kind: "failed"; code: string };

const MAX_REDIRECT_LENGTH = 2048;

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

export function isCsrfFailure(error: unknown): boolean {
  if (!(error instanceof ApiRequestError)) return false;
  if (error.status !== 403) return false;
  return error.code === "CSRF_INVALID" || error.code === "OIDC_CSRF_INVALID";
}

export function safeRedirect(value: unknown): string {
  if (typeof value !== "string") return SIGN_IN_PATH;
  if (value.length < 1 || value.length > MAX_REDIRECT_LENGTH) return SIGN_IN_PATH;
  if (value.includes("\\")) return SIGN_IN_PATH;
  if (hasControlCharacter(value)) return SIGN_IN_PATH;

  if (value.startsWith("/") && !value.startsWith("//")) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return SIGN_IN_PATH;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return SIGN_IN_PATH;
  if (url.username !== "" || url.password !== "") return SIGN_IN_PATH;
  return value;
}

function codeOf(error: unknown): string {
  return error instanceof ApiRequestError ? error.code : "UNKNOWN_ERROR";
}

export async function signOut(deps: {
  client: Pick<ApiClient, "post">;
  loader: Pick<CapabilityLoader, "load" | "reset">;
}): Promise<SignOutResult> {
  const { client, loader } = deps;
  let resetDone = false;
  const reset = (): void => {
    if (resetDone) return;
    resetDone = true;
    loader.reset();
  };

  for (let round = 0; round < 2; round += 1) {
    try {
      const body = await client.post<{ redirect?: unknown }>(LOGOUT_PATH);
      reset();
      return { kind: "redirect", to: safeRedirect(body?.redirect) };
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        reset();
        return { kind: "redirect", to: SIGN_IN_PATH };
      }
      if (round === 0 && isCsrfFailure(error)) {
        reset();
        await loader.load();
        continue;
      }
      return { kind: "failed", code: codeOf(error) };
    }
  }

  return { kind: "failed", code: "UNKNOWN_ERROR" };
}
