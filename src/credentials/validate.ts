import type { VaultAuthScheme } from "../gateway/index.ts";
import { CredentialsError } from "./types.ts";

const SERVER_ID_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;
const HEADER_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
const VALUE_PATTERN = /^[\x21-\x7e]+$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SCHEMES: readonly string[] = ["API_KEY_HEADER", "BEARER_TOKEN"];
const RESERVED_HEADERS: readonly string[] = [
  "authorization",
  "x-ursitoare-call",
  "host",
  "cookie",
  "proxy-authorization",
  "connection",
  "content-length",
  "transfer-encoding",
  "upgrade",
  "te",
  "trailer",
];
const MAX_VALUE = 4096;

function invalid(field: string, reason: string): CredentialsError {
  return new CredentialsError("CREDENTIALS_INVALID", "credential is invalid", { field, reason });
}

export function checkValue(value: unknown): string {
  if (typeof value !== "string" || value.length < 1 || value.length > MAX_VALUE) {
    throw invalid("value", "size");
  }
  if (!VALUE_PATTERN.test(value)) throw invalid("value", "bad_value");
  return value;
}

export function checkProvision(input: {
  toolServerId: unknown;
  authScheme: unknown;
  headerName: unknown;
  value: unknown;
  serviceId?: unknown;
}): void {
  if (typeof input.toolServerId !== "string" || !SERVER_ID_PATTERN.test(input.toolServerId)) {
    throw invalid("toolServerId", "bad_value");
  }
  checkScheme(input.authScheme, input.headerName);
  checkValue(input.value);
  if (
    input.serviceId !== undefined &&
    (typeof input.serviceId !== "string" || !UUID_PATTERN.test(input.serviceId))
  ) {
    throw invalid("serviceId", "bad_value");
  }
}

export function checkScheme(authScheme: unknown, headerName: unknown): void {
  if (typeof authScheme !== "string" || !SCHEMES.includes(authScheme)) {
    throw invalid("authScheme", "bad_value");
  }
  const scheme = authScheme as VaultAuthScheme;
  if (scheme === "API_KEY_HEADER") {
    if (headerName === null || headerName === undefined) {
      throw invalid("headerName", "required");
    }
    if (typeof headerName !== "string" || !HEADER_PATTERN.test(headerName)) {
      throw invalid("headerName", "bad_value");
    }
    if (RESERVED_HEADERS.includes(headerName.toLowerCase())) {
      throw invalid("headerName", "reserved");
    }
  } else if (headerName !== null && headerName !== undefined) {
    throw invalid("headerName", "not_allowed");
  }
}
