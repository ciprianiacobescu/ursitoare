// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api } from "../admin/shared.ts";

export interface PolicyView {
  version: string | null;
  source: string;
  pendingGrants: number;
}

export function parsePolicyView(_raw: unknown): PolicyView | null {
  throw new Error("not implemented");
}

export function validationText(_v: {
  ok: boolean;
  problems: { stage: string; ids: string[]; message: string }[];
}): string {
  throw new Error("not implemented");
}

export function deployText(_version: string): string {
  throw new Error("not implemented");
}

export function currentText(_v: PolicyView): string {
  throw new Error("not implemented");
}

export function pendingText(_n: number): string {
  throw new Error("not implemented");
}

export function checkPolicySource(_source: string): { ok: true } | { ok: false; message: string } {
  throw new Error("not implemented");
}

export function policyErrorText(_error: unknown): string {
  throw new Error("not implemented");
}

export async function loadPolicy(_client: Api<"get">, _signal?: AbortSignal): Promise<PolicyView> {
  throw new Error("not implemented");
}

export async function validatePolicy(
  _client: Api<"post">,
  _source: string,
): Promise<{ ok: boolean; problems: { stage: string; ids: string[]; message: string }[] }> {
  throw new Error("not implemented");
}

export async function deployPolicy(
  _client: Api<"post">,
  _source: string,
  _key: string,
): Promise<string> {
  throw new Error("not implemented");
}
