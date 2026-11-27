// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api } from "../admin/shared.ts";
import { parseReviewTools } from "./review.ts";
import type { ToolServerView } from "./servers.ts";

export interface RefChange {
  tool: string;
  from: string;
  to: string;
  effect?: { from: string; to: string };
}

export function changedRefs(
  before: ToolServerView,
  after: ToolServerView,
  effectsBefore?: ReadonlyMap<string, string>,
): RefChange[] {
  const beforeTools = new Map(before.tools.map((tool) => [tool.name, tool] as const));
  const changes: RefChange[] = [];
  for (const afterTool of after.tools) {
    const beforeTool = beforeTools.get(afterTool.name);
    if (beforeTool === undefined) continue;
    if (beforeTool.ref === null || afterTool.ref === null) continue;
    if (beforeTool.ref === afterTool.ref) continue;
    const change: RefChange = {
      tool: afterTool.name,
      from: beforeTool.ref,
      to: afterTool.ref,
    };
    const fromEffect = effectsBefore?.get(afterTool.name) ?? beforeTool.effect;
    const toEffect = afterTool.effect;
    if (fromEffect !== toEffect) change.effect = { from: fromEffect, to: toEffect };
    changes.push(change);
  }
  changes.sort((a, b) => (a.tool < b.tool ? -1 : a.tool > b.tool ? 1 : 0));
  return changes;
}

export function approvedEffects(approved: unknown): ReadonlyMap<string, string> {
  const effects = new Map<string, string>();
  const tools = parseReviewTools(approved);
  if (tools === null) return effects;
  for (const tool of tools) effects.set(tool.name, tool.effect);
  return effects;
}

export function refNoticeText(changes: readonly RefChange[]): string | null {
  if (changes.length === 0) return null;
  const parts = changes.map((change) => `${change.from} → ${change.to}`);
  return `Refs changed: ${parts.join(", ")}. Grants and flows still name the old refs.`;
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

export function refState(tool: string, servers: readonly ToolServerView[]): RefState | null {
  const dot = tool.indexOf(".");
  if (dot <= 0) return null;
  const at = tool.lastIndexOf("@");
  if (at <= dot + 1) return null;
  const serverId = tool.slice(0, dot);
  const toolName = tool.slice(dot + 1, at);
  if (toolName.length === 0 || toolName.includes(".")) return null;
  const server = servers.find((s) => s.id === serverId && s.state !== "pending");
  if (server === undefined) return null;
  const listed = server.tools.find((t) => t.name === toolName && t.ref !== null);
  if (listed === undefined) return null;
  if (server.state === "approved") return listed.ref === tool ? "current" : "superseded";
  return listed.ref === tool ? "waiting" : "superseded";
}

export const REF_MARKERS: Readonly<{ superseded: string; waiting: string }> = {
  superseded: "superseded",
  waiting: "waiting for approval",
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
