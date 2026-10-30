import { SIGN_IN_ERROR_CODES } from "./messages.ts";

export const SIGN_IN_PATH: string = "/sign-in";
export const LOGIN_PATH: string = "/auth/oidc/login";
export const LOGOUT_PATH: string = "/auth/oidc/logout";

const RETURN_TO_ORIGIN = "http://x.invalid";
const MAX_RETURN_TO_LENGTH = 512;
const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;

export interface LocationLike {
  pathname: string;
  search: string;
  assign(url: string): void;
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

function isRefusedPath(path: string): boolean {
  return (
    path === SIGN_IN_PATH ||
    path.startsWith(`${SIGN_IN_PATH}/`) ||
    path === "/auth" ||
    path.startsWith("/auth/")
  );
}

export function safeReturnTo(raw: unknown): string {
  if (typeof raw !== "string") return "/";
  if (raw.length < 1 || raw.length > MAX_RETURN_TO_LENGTH) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
  if (raw.includes("\\")) return "/";
  if (hasControlCharacter(raw)) return "/";

  let origin: string;
  try {
    origin = new URL(raw, RETURN_TO_ORIGIN).origin;
  } catch {
    return "/";
  }
  if (origin !== RETURN_TO_ORIGIN) return "/";

  const path = raw.split(/[?#]/, 1)[0] ?? "";
  if (isRefusedPath(path)) return "/";
  return raw;
}

export function loginUrl(returnTo: unknown): string {
  return `${LOGIN_PATH}?return_to=${encodeURIComponent(safeReturnTo(returnTo))}`;
}

export function signInUrl(opts: { error?: string; returnTo?: unknown } = {}): string {
  const parts: string[] = [];
  if (typeof opts.error === "string" && ERROR_CODE_PATTERN.test(opts.error)) {
    parts.push(`error=${opts.error}`);
  }
  const returnTo = safeReturnTo(opts.returnTo);
  if (returnTo !== "/") {
    parts.push(`return_to=${encodeURIComponent(returnTo)}`);
  }
  return parts.length === 0 ? SIGN_IN_PATH : `${SIGN_IN_PATH}?${parts.join("&")}`;
}

export function parseSignInSearch(search: string): { error: string | null; returnTo: string } {
  const params = new URLSearchParams(search);
  const rawError = params.get("error");
  let error: string | null;
  if (rawError === null || rawError === "") {
    error = null;
  } else if (SIGN_IN_ERROR_CODES.includes(rawError)) {
    error = rawError;
  } else {
    error = "UNKNOWN_ERROR";
  }
  return { error, returnTo: safeReturnTo(params.get("return_to")) };
}

export function redirectToSignIn(location: LocationLike): boolean {
  if (
    location.pathname === SIGN_IN_PATH ||
    location.pathname.startsWith(`${SIGN_IN_PATH}/`)
  ) {
    return false;
  }
  location.assign(
    signInUrl({ error: "SESSION_ENDED", returnTo: location.pathname + location.search }),
  );
  return true;
}
