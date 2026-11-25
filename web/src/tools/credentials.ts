// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api } from "../admin/shared.ts";
import { ApiRequestError } from "../api/client.ts";
import { FORM_ERROR_KEY, mapEnvelopeErrors } from "../kit/data/form-errors.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import { toolsErrorMessage } from "./messages.ts";

export interface CredentialView {
  id: string;
  toolServerId: string;
  authScheme: "API_KEY_HEADER" | "BEARER_TOKEN";
  headerName: string | null;
  keyVersion: number;
}

const SERVER_ID = /^[a-z][a-z0-9_]{0,31}$/;
const CREDENTIAL_ID = /^[A-Za-z0-9_-]{1,128}$/;
const HEADER_NAME = /^[A-Za-z0-9-]{1,64}$/;
const VALUE = /^[\x21-\x7e]+$/;
const MAX_VALUE = 4096;
const MAX_KEY_VERSION = 2147483647;

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

const HDR_T = "Enter a header name of 1 to 64 letters, digits and hyphens.";
const RESERVED = "That header name is reserved.";
const VAL_T = "Enter the secret value: 1 to 4096 printable ASCII characters, no spaces.";
const NO_CREDENTIAL = "No credential stored.";
const CODE_NO_CREDENTIAL = "Code blocks need no credential.";
const ALREADY_STORED = "A credential is already stored for this server.";
const VAULT_UNAVAILABLE = "The credential vault is unavailable. Try again in a moment.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function member(source: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(source, key) ? source[key] : undefined;
}

function refusalReason(error: unknown): string | null {
  if (!(error instanceof ApiRequestError)) return null;
  const details: unknown = error.details;
  if (typeof details !== "object" || details === null) return null;
  const reason: unknown = (details as { reason?: unknown }).reason;
  return typeof reason === "string" ? reason : null;
}

export function parseCredential(raw: unknown): CredentialView | null {
  if (!isRecord(raw)) return null;
  const id = member(raw, "id");
  if (typeof id !== "string" || !CREDENTIAL_ID.test(id)) return null;
  const toolServerId = member(raw, "toolServerId");
  if (typeof toolServerId !== "string" || !SERVER_ID.test(toolServerId)) return null;
  const authScheme = member(raw, "authScheme");
  if (authScheme !== "API_KEY_HEADER" && authScheme !== "BEARER_TOKEN") return null;
  const headerName = member(raw, "headerName");
  if (
    headerName !== null &&
    (typeof headerName !== "string" || !HEADER_NAME.test(headerName))
  ) {
    return null;
  }
  const keyVersion = member(raw, "keyVersion");
  if (
    typeof keyVersion !== "number" ||
    !Number.isInteger(keyVersion) ||
    keyVersion < 1 ||
    keyVersion > MAX_KEY_VERSION
  ) {
    return null;
  }
  return { id, toolServerId, authScheme, headerName, keyVersion };
}

export interface CredentialDraft {
  authScheme: "API_KEY_HEADER" | "BEARER_TOKEN";
  headerName: string;
  value: string;
}

export function credentialBody(
  serverId: string,
  d: CredentialDraft,
): { ok: true; body: unknown } | { ok: false; field: "headerName" | "value"; message: string } {
  if (!SERVER_ID.test(serverId)) {
    throw new RangeError("The server id is not valid.");
  }
  let headerName: string | null = null;
  if (d.authScheme === "API_KEY_HEADER") {
    headerName = d.headerName.trim();
    if (headerName === "" || !HEADER_NAME.test(headerName)) {
      return { ok: false, field: "headerName", message: HDR_T };
    }
    if (RESERVED_HEADERS.includes(headerName.toLowerCase())) {
      return { ok: false, field: "headerName", message: RESERVED };
    }
  }
  const value = d.value;
  if (value.length < 1 || value.length > MAX_VALUE || !VALUE.test(value)) {
    return { ok: false, field: "value", message: VAL_T };
  }
  const body: Record<string, unknown> = {
    toolServerId: serverId,
    authScheme: d.authScheme,
    value,
  };
  if (headerName !== null) body["headerName"] = headerName;
  return { ok: true, body };
}

export function credentialText(c: CredentialView | null, adapter: string): string {
  if (adapter === "code_block") return CODE_NO_CREDENTIAL;
  if (c === null) return NO_CREDENTIAL;
  return `Credential stored (key version ${c.keyVersion}).`;
}

const PAGE_LIMIT = 200;
const MAX_PAGES = 50;

function invalidResponse(what: string): ApiRequestError {
  return new ApiRequestError(200, "INVALID_RESPONSE", `Invalid ${what}`);
}

export async function loadServerCredential(
  api: Api<"get">,
  serverId: string,
  signal?: AbortSignal,
): Promise<CredentialView | null> {
  if (!SERVER_ID.test(serverId)) throw new RangeError("The server id is not valid.");
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const query: Record<string, string | number> = { limit: PAGE_LIMIT };
    if (cursor !== undefined) query["cursor"] = cursor;
    const answer =
      signal === undefined
        ? await api.get<unknown>("/credentials", { query })
        : await api.get<unknown>("/credentials", { query, signal });
    if (!isRecord(answer)) throw invalidResponse("credential list");
    const items = answer["items"];
    const next = answer["next_cursor"];
    if (!Array.isArray(items) || (next !== null && typeof next !== "string")) {
      throw invalidResponse("credential list");
    }
    for (const item of items as unknown[]) {
      const view = parseCredential(item);
      if (view === null) throw invalidResponse("credential");
      if (view.toolServerId === serverId) return view;
    }
    if (next === null) return null;
    if (page === MAX_PAGES - 1) throw invalidResponse("credential list");
    cursor = next;
  }
  return null;
}

export async function storeCredential(
  api: Api<"post">,
  body: unknown,
  key: string,
): Promise<CredentialView> {
  if (!isRecord(body)) throw new RangeError("The credential body is not valid.");
  if (key.trim() === "") throw new RangeError("The idempotency key is blank.");
  const answer = await api.post<unknown>("/credentials", body, {
    headers: { "Idempotency-Key": key },
  });
  const view = parseCredential(answer);
  if (view === null) throw invalidResponse("credential");
  return view;
}

export async function rotateServerCredential(
  api: Api<"post">,
  credentialId: string,
  draft: CredentialDraft,
): Promise<CredentialView> {
  if (!CREDENTIAL_ID.test(credentialId)) throw new RangeError("The credential id is not valid.");
  let headerName: string | null = null;
  if (draft.authScheme === "API_KEY_HEADER") {
    headerName = draft.headerName.trim();
    if (headerName === "" || !HEADER_NAME.test(headerName)) {
      throw new RangeError("The header name is not valid.");
    }
    if (RESERVED_HEADERS.includes(headerName.toLowerCase())) {
      throw new RangeError("That header name is reserved.");
    }
  }
  const value = draft.value;
  if (value.length < 1 || value.length > MAX_VALUE || !VALUE.test(value)) {
    throw new RangeError("The secret value is not valid.");
  }
  const body: Record<string, unknown> = { value, authScheme: draft.authScheme };
  if (headerName !== null) body["headerName"] = headerName;
  const answer = await api.post<unknown>(`/credentials/${credentialId}/rotate`, body);
  const view = parseCredential(answer);
  if (view === null) throw invalidResponse("credential");
  return view;
}

export const CREDENTIAL_NAMES: Readonly<Record<string, string>> = {
  credential: "Credential",
  scheme: "Scheme",
  apiKeyHeader: "API key header",
  bearerToken: "Bearer token",
  headerName: "Header name",
  secretValue: "Secret value",
  storeCredential: "Store credential",
  rotateCredential: "Rotate credential",
  credentialStored: "Credential stored.",
  credentialRotated: "Credential rotated.",
  needsValue: "A server that needs no key still needs a value here: enter any text.",
};

export function credentialErrors(error: unknown): FormErrors {
  if (error instanceof ApiRequestError) {
    if (error.status === 400) {
      return mapEnvelopeErrors(error, ["headerName", "value"]);
    }
    if (error.status === 409) {
      return { [FORM_ERROR_KEY]: ALREADY_STORED };
    }
    if (error.status === 422 && refusalReason(error) === "no_credential_needed") {
      return { [FORM_ERROR_KEY]: CODE_NO_CREDENTIAL };
    }
    if (error.status === 503 && error.code === "EGRESS_UNAVAILABLE") {
      return { [FORM_ERROR_KEY]: VAULT_UNAVAILABLE };
    }
  }
  return { [FORM_ERROR_KEY]: toolsErrorMessage(error) };
}
