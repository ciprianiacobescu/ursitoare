// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api } from "../admin/shared.ts";

export interface GrantView {
  id: string;
  subject: string;
  tool: string;
  scope: string;
  status: "active" | "needs_reconfirm" | "revoked";
}

export function parseGrant(_raw: unknown): GrantView | null {
  throw new Error("not implemented");
}

export function grantRowText(_g: GrantView): string {
  throw new Error("not implemented");
}

export interface GrantDraft {
  subjectKind: "role" | "user";
  subject: string;
  tool: string;
  scopeKind: "any_step" | "node";
  flowId: string;
  nodeId: string;
}

export function grantBody(
  _d: GrantDraft,
): { ok: true; body: unknown } | { ok: false; field: string; message: string } {
  throw new Error("not implemented");
}

export const GRANT_DONE: { created: string; revoked: string; confirmed: string } = {
  created: "",
  revoked: "",
  confirmed: "",
};

export function grantActions(_g: GrantView): { revoke: boolean; confirm: boolean } {
  throw new Error("not implemented");
}

export async function loadToolRefs(_client: Api<"get">, _signal?: AbortSignal): Promise<string[]> {
  throw new Error("not implemented");
}

export async function postGrant(
  _client: Api<"post">,
  _draft: GrantDraft,
  _key: string,
): Promise<string> {
  throw new Error("not implemented");
}

export async function revokeGrantById(_client: Api<"delete">, _id: string): Promise<void> {
  throw new Error("not implemented");
}

export async function confirmGrantById(_client: Api<"post">, _id: string): Promise<void> {
  throw new Error("not implemented");
}
