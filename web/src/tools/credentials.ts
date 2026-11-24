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

export async function loadServerCredential(
  _api: Api<"get">,
  _serverId: string,
  _signal?: AbortSignal,
): Promise<CredentialView | null> {
  throw new Error("not implemented");
}

export async function storeCredential(
  _api: Api<"post">,
  _body: unknown,
  _key: string,
): Promise<CredentialView> {
  throw new Error("not implemented");
}

export async function rotateServerCredential(
  _api: Api<"post">,
  _credentialId: string,
  _draft: CredentialDraft,
): Promise<CredentialView> {
  throw new Error("not implemented");
}

export const CREDENTIAL_NAMES: Readonly<Record<string, string>> = {};

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
