// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api } from "../admin/shared.ts";

export interface ToolServerView {
  id: string;
  adapter: string;
  origin: string;
  state: "pending" | "approved" | "drifted";
  registeredBy: string;
  pendingDigest: string | null;
  approvedDigest: string | null;
  tools: {
    name: string;
    effect: "read" | "write" | "send" | "pay";
    ref: string | null;
    untrusted_result: boolean;
    unsafe_to_retry: boolean;
    http: { method: string; path: string } | null;
  }[];
  pendingSubmittedBy: string | null;
}

const ID_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;
const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const TOOL_REF_PATTERN = /^[a-z][a-z0-9._-]*@(0|[1-9][0-9]{0,8})$/;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const ADAPTERS: readonly string[] = ["fixture", "mcp", "http_openapi", "code_block"];
const STATES: readonly string[] = ["pending", "approved", "drifted"];
const EFFECTS: readonly string[] = ["read", "write", "send", "pay"];
const MAX_TOOLS = 100;

type Tool = ToolServerView["tools"][number];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function hasControl(v: string): boolean {
  for (let i = 0; i < v.length; i += 1) {
    const c = v.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return true;
  }
  return false;
}

function text(v: unknown, min: number, max: number): string | null {
  if (typeof v !== "string" || v.length < min || v.length > max || hasControl(v)) return null;
  return v;
}

function digest(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v === "string" && DIGEST_PATTERN.test(v)) return v;
  return undefined;
}

function member(src: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(src, key) ? src[key] : undefined;
}

function optionalBool(src: Record<string, unknown>, key: string, dflt: boolean): boolean | null {
  const v = member(src, key);
  if (v === undefined) return dflt;
  return typeof v === "boolean" ? v : null;
}

function parseHttp(v: unknown): { method: string; path: string } | null | undefined {
  if (v === undefined || v === null) return null;
  if (!isRecord(v)) return undefined;
  const method = text(member(v, "method"), 1, 16);
  const path = text(member(v, "path"), 1, 2048);
  if (method === null || path === null) return undefined;
  return { method, path };
}

interface RecordTool {
  name: string;
  effect: Tool["effect"];
  ref: string | null;
}

function parseRecordTools(v: unknown): RecordTool[] | null {
  if (!Array.isArray(v) || v.length > MAX_TOOLS) return null;
  const out: RecordTool[] = [];
  for (const item of v as unknown[]) {
    if (!isRecord(item)) return null;
    const name = member(item, "name");
    const effect = member(item, "effect");
    const ref = member(item, "ref");
    if (typeof name !== "string" || !TOOL_NAME_PATTERN.test(name)) return null;
    if (typeof effect !== "string" || !EFFECTS.includes(effect)) return null;
    if (ref !== null && (typeof ref !== "string" || ref.length > 128 || !TOOL_REF_PATTERN.test(ref))) {
      return null;
    }
    out.push({ name, effect: effect as Tool["effect"], ref });
  }
  return out;
}

function parseSurfaceTools(surface: unknown, refs: Map<string, string | null>): Tool[] | null {
  if (!isRecord(surface)) return null;
  const list = member(surface, "tools");
  if (!Array.isArray(list) || list.length > MAX_TOOLS) return null;
  const out: Tool[] = [];
  for (const item of list as unknown[]) {
    if (!isRecord(item)) return null;
    const name = member(item, "name");
    const effect = member(item, "effect");
    if (typeof name !== "string" || !TOOL_NAME_PATTERN.test(name)) return null;
    if (typeof effect !== "string" || !EFFECTS.includes(effect)) return null;
    const untrusted = optionalBool(item, "untrusted_result", true);
    const unsafe = optionalBool(item, "unsafe_to_retry", false);
    const http = parseHttp(member(item, "http"));
    if (untrusted === null || unsafe === null || http === undefined) return null;
    out.push({
      name,
      effect: effect as Tool["effect"],
      ref: refs.get(name) ?? null,
      untrusted_result: untrusted,
      unsafe_to_retry: unsafe,
      http,
    });
  }
  return out;
}

export function parseToolServer(raw: unknown): ToolServerView | null {
  if (!isRecord(raw)) return null;
  const id = member(raw, "id");
  const adapter = member(raw, "adapter");
  const state = member(raw, "state");
  if (typeof id !== "string" || !ID_PATTERN.test(id)) return null;
  if (typeof adapter !== "string" || !ADAPTERS.includes(adapter)) return null;
  if (typeof state !== "string" || !STATES.includes(state)) return null;
  const origin = text(member(raw, "origin"), 1, 2048);
  const registeredBy = text(member(raw, "registeredBy"), 1, 256);
  if (origin === null || registeredBy === null) return null;
  const pendingDigest = digest(member(raw, "pendingDigest"));
  const approvedDigest = digest(member(raw, "approvedDigest"));
  if (pendingDigest === undefined || approvedDigest === undefined) return null;
  const submitted = member(raw, "pendingSubmittedBy");
  let pendingSubmittedBy: string | null = null;
  if (submitted !== undefined && submitted !== null) {
    pendingSubmittedBy = text(submitted, 1, 256);
    if (pendingSubmittedBy === null) return null;
  }
  const recordTools = parseRecordTools(member(raw, "tools"));
  if (recordTools === null) return null;
  const refs = new Map(recordTools.map((t) => [t.name, t.ref] as const));

  const pending = member(raw, "pendingSurface");
  const approved = member(raw, "approvedSurface");
  let tools: Tool[] | null;
  if (pending !== undefined && pending !== null) {
    tools = parseSurfaceTools(pending, refs);
  } else if (approved !== undefined && approved !== null) {
    tools = parseSurfaceTools(approved, refs);
  } else {
    tools = recordTools.map((t) => ({
      ...t,
      untrusted_result: true,
      unsafe_to_retry: false,
      http: null,
    }));
  }
  if (tools === null) return null;
  return {
    id,
    adapter,
    origin,
    state: state as ToolServerView["state"],
    registeredBy,
    pendingDigest,
    approvedDigest,
    tools,
    pendingSubmittedBy,
  };
}

function shortDigest(d: string | null): string {
  return d === null ? "" : d.slice("sha256:".length, "sha256:".length + 12);
}

export function serverRowText(s: ToolServerView): string {
  return `${s.id} · ${s.origin} · ${s.state}`;
}

export function approvalView(
  s: ToolServerView,
  me: { userId: string; reviewProfile: "solo" | "team" },
): { canApprove: boolean; selfApproval: boolean; message: string | null } {
  if (s.pendingDigest === null) {
    return { canApprove: false, selfApproval: false, message: "Nothing to approve." };
  }
  if (s.pendingSubmittedBy === me.userId) {
    if (me.reviewProfile === "team") {
      return {
        canApprove: false,
        selfApproval: false,
        message: "Another admin must approve this surface.",
      };
    }
    return {
      canApprove: true,
      selfApproval: true,
      message: "You submitted this surface. Approving it is recorded as a self-approval.",
    };
  }
  return { canApprove: true, selfApproval: false, message: null };
}

export const SURFACE_APPROVED: string = "";

export function toolRows(
  s: ToolServerView,
): { name: string; effect: string; block: string; result: string; call: string }[] {
  return s.tools.map((t) => ({
    name: t.name,
    effect: t.effect,
    block: t.ref ?? "—",
    result: t.untrusted_result ? "untrusted" : "trusted",
    call: t.http === null ? "—" : `${t.http.method} ${t.http.path}`,
  }));
}

export function stateNote(s: ToolServerView): string | null {
  if (s.state === "pending") {
    return `This server has not been approved. Its tools cannot be used yet. Pending surface ${shortDigest(s.pendingDigest)}.`;
  }
  if (s.state === "drifted") {
    return `The surface changed after it was approved. Its tools stop working until the new surface is approved. Approved surface ${shortDigest(s.approvedDigest)}, pending surface ${shortDigest(s.pendingDigest)}. The table lists the pending surface.`;
  }
  return null;
}

export function ownBoxShown(_view: { selfApproval: boolean }, _ownSurface: boolean): boolean {
  throw new Error("not implemented");
}

export function approveRequest(
  _s: ToolServerView,
  _me: { userId: string; reviewProfile: "solo" | "team" },
  _input: { ticked: boolean; ownSurface: boolean },
): { ok: true; body: { digest: string; selfApproval: boolean } } | { ok: false; message: string } {
  throw new Error("not implemented");
}

export function approveDialog(
  _s: ToolServerView,
): { title: string; description: string; action: string } | null {
  throw new Error("not implemented");
}

export function approveFailure(_error: unknown): {
  message: string;
  ownSurface: boolean;
  reload: boolean;
} {
  throw new Error("not implemented");
}

export function approveControl(
  _s: ToolServerView | null,
  _me: { userId: string; reviewProfile: "solo" | "team" } | null,
  _busy: boolean,
): { disabled: boolean; selfApproval: boolean; message: string | null } {
  throw new Error("not implemented");
}

export function serverLink(_id: string): string {
  throw new Error("not implemented");
}

export function serverIdFromSearch(_search: string): string | null {
  throw new Error("not implemented");
}

export async function loadToolServer(
  _client: Api<"get">,
  _id: string,
  _signal?: AbortSignal,
): Promise<ToolServerView> {
  throw new Error("not implemented");
}

export async function approveToolSurface(
  _client: Api<"post">,
  _id: string,
  _body: { digest: string; selfApproval: boolean },
): Promise<ToolServerView> {
  throw new Error("not implemented");
}
