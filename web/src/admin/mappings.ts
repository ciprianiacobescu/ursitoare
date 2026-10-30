// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FetchPage } from "../kit/data/cursor-list.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import type { Api, ConfirmSpec } from "./shared.ts";

export interface MappingRow {
  issuer: string;
  group: string;
  roleId: string | null;
  teamId: string | null;
  reviewedBy: string;
}

export interface GrantOption {
  value: string;
  label: string;
}

export type MappingBody =
  | { issuer: string; group: string; roleId: string }
  | { issuer: string; group: string; teamId: string };

export interface MappingCells {
  group: string;
  grants: string;
  issuer: string;
  reviewedBy: string;
}

export const ISSUER_HINT: string = "";

export function parseGroupMapping(_raw: unknown): MappingRow | null {
  throw new Error("not implemented");
}

export function mappingCells(_m: MappingRow): MappingCells {
  throw new Error("not implemented");
}

export function grantOptions(_roles: readonly string[], _teams: readonly string[]): GrantOption[] {
  throw new Error("not implemented");
}

export function defaultIssuer(_rows: readonly MappingRow[]): string {
  throw new Error("not implemented");
}

export function mappingRequest(
  _input: { issuer: string; group: string; grant: string },
  _options: readonly GrantOption[],
): { ok: true; body: MappingBody } | { ok: false; errors: FormErrors } {
  throw new Error("not implemented");
}

export async function setMapping(_client: Api<"put">, _body: MappingBody): Promise<MappingRow> {
  throw new Error("not implemented");
}

export function mappedMessage(_group: string): string {
  throw new Error("not implemented");
}

export function removeMappingConfirm(_m: MappingRow): ConfirmSpec {
  throw new Error("not implemented");
}

export async function removeMapping(
  _client: Api<"delete">,
  _m: Pick<MappingRow, "issuer" | "group">,
): Promise<void> {
  throw new Error("not implemented");
}

export async function loadAllItems<T>(_fetchPage: FetchPage<T>): Promise<T[]> {
  throw new Error("not implemented");
}
