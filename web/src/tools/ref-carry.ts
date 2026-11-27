// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api } from "../admin/shared.ts";
import { cursorPageFetcher } from "../kit/data/page-fetcher.ts";
import { parseReviewTools } from "./review.ts";
import { parseToolServer } from "./servers.ts";
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

const GRANT_ID = /^grant_[A-Za-z0-9-]{1,64}$/;
const GRANT_TOOL = /^[a-z][a-z0-9._-]*@(0|[1-9][0-9]{0,8})$/;
const GRANT_ROLE = /^[a-z][a-z0-9_]{0,31}$/;
const GRANT_USER = /^[A-Za-z0-9_-]{1,64}$/;
const GRANT_FLOW = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const GRANT_NODE = /^[a-z][a-z0-9_]*$/;
const GRANT_ARG = /^[a-z][a-z0-9_]{0,63}$/;
const GRANT_STATUSES: readonly GrantRecord["status"][] = [
  "active",
  "needs_reconfirm",
  "revoked",
];
const GRANT_OPS: readonly GrantArg["op"][] = ["eq", "lte", "gte"];
const MAX_ARGS = 8;
const MAX_ARG_VALUE = 256;
const PAGE_LIMIT = 100;
const MAX_PAGES = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function matchesText(value: unknown, pattern: RegExp, max: number): value is string {
  return typeof value === "string" && value.length <= max && pattern.test(value);
}

function parseGrantSubject(raw: unknown): GrantSubject | null {
  if (!isRecord(raw)) return null;
  if (raw["kind"] === "role") {
    const role = raw["role"];
    if (matchesText(role, GRANT_ROLE, 32)) return { kind: "role", role };
  }
  if (raw["kind"] === "user") {
    const userId = raw["userId"];
    if (matchesText(userId, GRANT_USER, 64)) return { kind: "user", userId };
  }
  return null;
}

function parseGrantScope(raw: unknown): GrantScope | null {
  if (!isRecord(raw)) return null;
  if (raw["kind"] === "any_step") return { kind: "any_step" };
  if (raw["kind"] === "node") {
    const flowId = raw["flowId"];
    const nodeId = raw["nodeId"];
    if (matchesText(flowId, GRANT_FLOW, 64) && matchesText(nodeId, GRANT_NODE, 128)) {
      return { kind: "node", flowId, nodeId };
    }
  }
  return null;
}

function parseGrantArg(raw: unknown): GrantArg | null {
  if (!isRecord(raw)) return null;
  const arg = raw["arg"];
  const op = raw["op"];
  const value = raw["value"];
  if (!matchesText(arg, GRANT_ARG, 64)) return null;
  if (typeof op !== "string" || !GRANT_OPS.includes(op as GrantArg["op"])) return null;
  if (typeof value === "string") {
    if (value.length > MAX_ARG_VALUE) return null;
  } else if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
  } else if (typeof value !== "boolean") {
    return null;
  }
  return { arg, op: op as GrantArg["op"], value };
}

export function parseGrantRecord(raw: unknown): GrantRecord | null {
  if (!isRecord(raw)) return null;
  const status = raw["status"];
  if (typeof status !== "string" || !GRANT_STATUSES.includes(status as GrantRecord["status"])) {
    return null;
  }
  const grant = raw["grant"];
  if (!isRecord(grant)) return null;
  const id = grant["id"];
  const tool = grant["tool"];
  if (!matchesText(id, GRANT_ID, 69) || !matchesText(tool, GRANT_TOOL, 128)) return null;
  const subject = parseGrantSubject(grant["subject"]);
  const scope = parseGrantScope(grant["scope"]);
  if (subject === null || scope === null) return null;
  const rawArgs = grant["args"];
  if (!Array.isArray(rawArgs) || rawArgs.length > MAX_ARGS) return null;
  const args: GrantArg[] = [];
  for (const item of rawArgs as unknown[]) {
    const parsed = parseGrantArg(item);
    if (parsed === null) return null;
    args.push(parsed);
  }
  return { id, subject, tool, scope, args, status: status as GrantRecord["status"] };
}

async function readAllPages<T>(
  api: Api<"get">,
  path: string,
  parseItem: (raw: unknown) => T | null,
  signal?: AbortSignal,
): Promise<{ items: T[]; complete: boolean }> {
  const fetchPage = cursorPageFetcher(api, path, { parseItem });
  const pageSignal = signal ?? new AbortController().signal;
  const items: T[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const answer = await fetchPage({ cursor, limit: PAGE_LIMIT, signal: pageSignal });
    items.push(...answer.items);
    if (answer.next_cursor === null) return { items, complete: true };
    cursor = answer.next_cursor;
  }
  return { items, complete: false };
}

export async function loadAllGrants(
  api: Api<"get">,
  signal?: AbortSignal,
): Promise<{ grants: GrantRecord[]; complete: boolean }> {
  const page = await readAllPages(api, "/grants", parseGrantRecord, signal);
  return { grants: page.items, complete: page.complete };
}

export async function loadAllToolServers(
  api: Api<"get">,
  signal?: AbortSignal,
): Promise<{ servers: ToolServerView[]; complete: boolean }> {
  const page = await readAllPages(api, "/tool-servers", parseToolServer, signal);
  return { servers: page.items, complete: page.complete };
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
