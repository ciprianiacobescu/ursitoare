// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api } from "../admin/shared.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";

export interface CredentialView {
  id: string;
  toolServerId: string;
  authScheme: "API_KEY_HEADER" | "BEARER_TOKEN";
  headerName: string | null;
  keyVersion: number;
}

export function parseCredential(_raw: unknown): CredentialView | null {
  throw new Error("not implemented");
}

export interface CredentialDraft {
  authScheme: "API_KEY_HEADER" | "BEARER_TOKEN";
  headerName: string;
  value: string;
}

export function credentialBody(
  _serverId: string,
  _d: CredentialDraft,
): { ok: true; body: unknown } | { ok: false; field: "headerName" | "value"; message: string } {
  throw new Error("not implemented");
}

export function credentialText(_c: CredentialView | null, _adapter: string): string {
  throw new Error("not implemented");
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

export function credentialErrors(_error: unknown): FormErrors {
  throw new Error("not implemented");
}
