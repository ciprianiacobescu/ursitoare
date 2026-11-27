// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api } from "../admin/shared.ts";
import { ApiRequestError } from "../api/client.ts";
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

export function copyPlan(grants: readonly GrantRecord[], changes: readonly RefChange[]): CopyPlan {
  const copy: CopyPlan["copy"] = [];
  const flowFirst: CopyPlan["flowFirst"] = [];
  const effectChanged: CopyPlan["effectChanged"] = [];
  for (const grant of grants) {
    if (grant.status === "revoked") continue;
    const change = changes.find((c) => c.from === grant.tool);
    if (change === undefined) continue;
    if (change.effect !== undefined) {
      effectChanged.push({ grant, to: change.to, effect: change.effect });
    } else if (grant.scope.kind === "any_step") {
      copy.push({ grant, to: change.to });
    } else if (grant.scope.kind === "node") {
      flowFirst.push({ grant, to: change.to });
    }
  }
  return { copy, flowFirst, effectChanged };
}

export function copyGrantBody(
  grant: GrantRecord,
  to: string,
): { subject: GrantSubject; tool: string; scope: { kind: "any_step" }; args: GrantArg[] } {
  if (!GRANT_TOOL.test(to)) throw new RangeError("Invalid tool ref");
  const subject: GrantSubject =
    grant.subject.kind === "role"
      ? { kind: "role", role: grant.subject.role }
      : { kind: "user", userId: grant.subject.userId };
  return {
    subject,
    tool: to,
    scope: { kind: "any_step" },
    args: grant.args.map((arg) => ({ arg: arg.arg, op: arg.op, value: arg.value })),
  };
}

export type CopyOutcome =
  | { grantId: string; to: string; ok: true; newId: string }
  | { grantId: string; to: string; ok: false; reason: string };

function isValidKey(key: string): boolean {
  if (key.length < 1 || key.length > 128) return false;
  for (let i = 0; i < key.length; i += 1) {
    const code = key.charCodeAt(i);
    if (code < 0x21 || code > 0x7e) return false;
  }
  return true;
}

function errorReason(err: unknown): string {
  if (!(err instanceof ApiRequestError)) return "request_failed";
  if (err.status === 422 && err.code === "OPERATION_REFUSED") {
    const details = err.details;
    if (isRecord(details)) {
      const reason = details["reason"];
      if (typeof reason === "string" && /^[a-z][a-z0-9_]{0,63}$/.test(reason)) {
        return reason;
      }
    }
  }
  if (/^[A-Z][A-Z0-9_]*$/.test(err.code)) return err.code;
  return "request_failed";
}

function readGrantId(reply: unknown): string | null {
  if (!isRecord(reply)) return null;
  const id = reply["id"];
  if (typeof id !== "string" || !GRANT_ID.test(id)) return null;
  return id;
}

export async function copyGrants(
  api: Api<"post">,
  plan: CopyPlan,
  keyOf: (grantId: string, to: string) => string,
): Promise<CopyOutcome[]> {
  const outcomes: CopyOutcome[] = [];
  for (const entry of plan.copy) {
    const { grant, to } = entry;
    let key: string;
    try {
      key = keyOf(grant.id, to);
    } catch {
      outcomes.push({ grantId: grant.id, to, ok: false, reason: "request_failed" });
      continue;
    }
    if (!isValidKey(key)) {
      outcomes.push({ grantId: grant.id, to, ok: false, reason: "request_failed" });
      continue;
    }
    let reply: unknown;
    try {
      reply = await api.post("/grants", copyGrantBody(grant, to), {
        headers: { "Idempotency-Key": key },
      });
    } catch (err) {
      outcomes.push({ grantId: grant.id, to, ok: false, reason: errorReason(err) });
      continue;
    }
    const newId = readGrantId(reply);
    if (newId === null) {
      outcomes.push({ grantId: grant.id, to, ok: false, reason: "INVALID_RESPONSE" });
    } else {
      outcomes.push({ grantId: grant.id, to, ok: true, newId });
    }
  }
  return outcomes;
}

export function carryKeys(newKey: () => string): (grantId: string, to: string) => string {
  const cache = new Map<string, string>();
  return (grantId: string, to: string): string => {
    const cacheKey = `${grantId}\u0000${to}`;
    const cached = cache.get(cacheKey);
    if (cached !== undefined) return cached;
    const key = newKey();
    if (!isValidKey(key)) throw new RangeError("Invalid idempotency key");
    cache.set(cacheKey, key);
    return key;
  };
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

export const REF_MARKERS: Readonly<{ superseded: string; waiting: string }> = Object.freeze({
  superseded: "superseded",
  waiting: "waiting for approval",
});

export const REF_CARRY_NAMES: Readonly<Record<string, string>> = Object.freeze({
  copyAction: "Create the same grants for the new refs",
  copied: "Created {to} for {grant}.",
  refused: "Not created for {grant}: {reason}.",
  flowFirst: "Update the flow first: {grant} ({tool}).",
  effectChanged:
    "Effect changed: {old} → {new}; grant it again on the Grants page: {grant} ({tool}).",
  deploy: "Deploy on Policies",
  deployPath: "/admin/policies",
  incomplete: "Only the first 10,000 grants were read.",
  none: "No grant names the old refs.",
  listName: "Copied grants",
});

export function fillRefText(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{([^{}]*)\}/g, (whole: string, key: string): string => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) return whole;
    return values[key] ?? whole;
  });
}

export function grantLabel(grant: GrantRecord): string {
  const subject =
    grant.subject.kind === "role" ? `role ${grant.subject.role}` : `user ${grant.subject.userId}`;
  const scope =
    grant.scope.kind === "any_step" ? "any step" : `${grant.scope.flowId} / ${grant.scope.nodeId}`;
  return `${subject} · ${scope}`;
}

export interface CarryView {
  lines: string[];
  empty: string | null;
  incomplete: string | null;
  deploy: boolean;
}

export function carryView(
  plan: CopyPlan,
  outcomes: readonly CopyOutcome[],
  complete: boolean,
): CarryView {
  if (outcomes.length !== plan.copy.length) throw new RangeError("Outcomes do not follow the plan");
  const lines: string[] = [];
  plan.copy.forEach((entry, index) => {
    const outcome = outcomes[index];
    if (outcome === undefined || outcome.grantId !== entry.grant.id || outcome.to !== entry.to) {
      throw new RangeError("Outcomes do not follow the plan");
    }
    const grant = grantLabel(entry.grant);
    lines.push(
      outcome.ok
        ? fillRefText(REF_CARRY_NAMES["copied"] ?? "", { to: entry.to, grant })
        : fillRefText(REF_CARRY_NAMES["refused"] ?? "", { grant, reason: outcome.reason }),
    );
  });
  for (const entry of plan.flowFirst) {
    lines.push(
      fillRefText(REF_CARRY_NAMES["flowFirst"] ?? "", {
        grant: grantLabel(entry.grant),
        tool: entry.to,
      }),
    );
  }
  for (const entry of plan.effectChanged) {
    lines.push(
      fillRefText(REF_CARRY_NAMES["effectChanged"] ?? "", {
        old: entry.effect.from,
        new: entry.effect.to,
        grant: grantLabel(entry.grant),
        tool: entry.to,
      }),
    );
  }
  return {
    lines,
    empty: lines.length === 0 ? (REF_CARRY_NAMES["none"] ?? null) : null,
    incomplete: complete ? null : (REF_CARRY_NAMES["incomplete"] ?? null),
    deploy: outcomes.some((outcome) => outcome.ok),
  };
}

export async function carryGrants(
  api: Api<"get" | "post">,
  changes: readonly RefChange[],
  keyOf: (grantId: string, to: string) => string,
  signal?: AbortSignal,
): Promise<CarryView> {
  const { grants, complete } = await loadAllGrants(api, signal);
  const plan = copyPlan(grants, changes);
  const outcomes = await copyGrants(api, plan, keyOf);
  return carryView(plan, outcomes, complete);
}
