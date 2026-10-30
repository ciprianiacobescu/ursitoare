import { OidcError } from "./errors.ts";

export const SESSION_COOKIE = "ursitoare_session";

const MAX_HEADER_LENGTH = 8192;
const NAME_PATTERN = /^[A-Za-z0-9_]+$/;
const VALUE_PATTERN = /^[A-Za-z0-9_.~-]*$/;

export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = Object.create(null);
  if (header === undefined || header.length > MAX_HEADER_LENGTH) return cookies;
  for (const part of header.split(";")) {
    const pair = part.trim();
    const separator = pair.indexOf("=");
    if (separator < 0) continue;
    const name = pair.slice(0, separator).trim();
    if (name.length === 0 || name in cookies) continue;
    cookies[name] = pair.slice(separator + 1);
  }
  return cookies;
}

export function serializeCookie(
  name: string,
  value: string,
  opts: { path: string; secure: boolean; maxAgeS?: number },
): string {
  if (!NAME_PATTERN.test(name)) {
    throw new OidcError("SESSION_INVALID", "invalid cookie name", { reason: "name" });
  }
  if (!VALUE_PATTERN.test(value)) {
    throw new OidcError("SESSION_INVALID", "invalid cookie value", { reason: "value" });
  }
  if (!opts.path.startsWith("/")) {
    throw new OidcError("SESSION_INVALID", "invalid cookie path", { reason: "path" });
  }
  let cookie = `${name}=${value}; Path=${opts.path}; `;
  if (opts.maxAgeS !== undefined) cookie += `Max-Age=${opts.maxAgeS}; `;
  cookie += "HttpOnly; SameSite=Lax";
  if (opts.secure) cookie += "; Secure";
  return cookie;
}
