// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api } from "../admin/shared.ts";
import type { ToolServerView } from "./servers.ts";

export interface RefChange {
  tool: string;
  from: string;
  to: string;
  effect?: { from: string; to: string };
}

export function changedRefs(
  _before: ToolServerView,
  _after: ToolServerView,
  _effectsBefore?: ReadonlyMap<string, string>,
): RefChange[] {
  throw new Error("not implemented");
}

export function approvedEffects(_approved: unknown): ReadonlyMap<string, string> {
  throw new Error("not implemented");
}

export function refNoticeText(_changes: readonly RefChange[]): string | null {
  throw new Error("not implemented");
}

export type GrantSubject = { kind: "role"; role: string } | { kind: "user"; userId: string };

export type GrantScope = { kind: "any_step" } | { kind: "node"; flowId: string; nodeId: string };

export interface GrantArg {
  arg: string;
  op: "eq" | "lte" | "gte";
  value: string | number | boolean;
}

export interface GrantRecord {
  id: string;
  subject: GrantSubject;
  tool: string;
  scope: GrantScope;
  args: readonly GrantArg[];
  status: "active" | "needs_reconfirm" | "revoked";
}

export function parseGrantRecord(_raw: unknown): GrantRecord | null {
  throw new Error("not implemented");
}

export async function loadAllGrants(
  _api: Api<"get">,
  _signal?: AbortSignal,
): Promise<{ grants: GrantRecord[]; complete: boolean }> {
  throw new Error("not implemented");
}

export async function loadAllToolServers(
  _api: Api<"get">,
  _signal?: AbortSignal,
): Promise<{ servers: ToolServerView[]; complete: boolean }> {
  throw new Error("not implemented");
}

export interface CopyPlan {
  copy: { grant: GrantRecord; to: string }[];
  flowFirst: { grant: GrantRecord; to: string }[];
  effectChanged: { grant: GrantRecord; to: string; effect: { from: string; to: string } }[];
}

export function copyPlan(_grants: readonly GrantRecord[], _changes: readonly RefChange[]): CopyPlan {
  throw new Error("not implemented");
}

export function copyGrantBody(
  _grant: GrantRecord,
  _to: string,
): { subject: GrantSubject; tool: string; scope: { kind: "any_step" }; args: GrantArg[] } {
  throw new Error("not implemented");
}

export type CopyOutcome =
  | { grantId: string; to: string; ok: true; newId: string }
  | { grantId: string; to: string; ok: false; reason: string };

export async function copyGrants(
  _api: Api<"post">,
  _plan: CopyPlan,
  _keyOf: (grantId: string, to: string) => string,
): Promise<CopyOutcome[]> {
  throw new Error("not implemented");
}

export function carryKeys(_newKey: () => string): (grantId: string, to: string) => string {
  throw new Error("not implemented");
}

export type RefState = "current" | "superseded" | "waiting";

export function refState(_tool: string, _servers: readonly ToolServerView[]): RefState | null {
  throw new Error("not implemented");
}

export const REF_MARKERS: Readonly<{ superseded: string; waiting: string }> = {
  superseded: "",
  waiting: "",
};

export const REF_CARRY_NAMES: Readonly<Record<string, string>> = {};

export function fillRefText(_template: string, _values: Readonly<Record<string, string>>): string {
  throw new Error("not implemented");
}

export function grantLabel(_grant: GrantRecord): string {
  throw new Error("not implemented");
}

export interface CarryView {
  lines: string[];
  empty: string | null;
  incomplete: string | null;
  deploy: boolean;
}

export function carryView(
  _plan: CopyPlan,
  _outcomes: readonly CopyOutcome[],
  _complete: boolean,
): CarryView {
  throw new Error("not implemented");
}

export async function carryGrants(
  _api: Api<"get" | "post">,
  _changes: readonly RefChange[],
  _keyOf: (grantId: string, to: string) => string,
  _signal?: AbortSignal,
): Promise<CarryView> {
  throw new Error("not implemented");
}
