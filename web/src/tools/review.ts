// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api } from "../admin/shared.ts";
import { ApiRequestError } from "../api/client.ts";
import { toolsErrorMessage } from "./messages.ts";
import { parseToolServer, type ToolServerView } from "./servers.ts";

import { DEFAULT_TRUST, overlayEntry } from "./trust.ts";
import type { Carried, ToolTrust } from "./trust.ts";

export interface ReviewTool {
  name: string;
  effect: string;
  untrusted_result: boolean;
  unsafe_to_retry: boolean;
  call: string;
  hints: string;
  serverName: string | null;
}

const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const MCP_NAME_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;
const EFFECTS: readonly string[] = ["read", "write", "send", "pay"];
const HTTP_METHODS: readonly string[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const PROTOCOL_VERSIONS: readonly string[] = [
  "2026-07-28",
  "2025-11-25",
  "2025-06-18",
  "2025-03-26",
];
const MAX_TOOLS = 100;
const MAX_CODE_SOURCE = 65_536;
const NO_HINTS = "—";
const READ_NOTE =
  "Read tools are called for real, even in a dry run. Check that each one changes nothing.";

type HintName = readonly [key: string, yes: string, no: string];
const HINT_NAMES: readonly HintName[] = [
  ["readOnly", "read-only", "not read-only"],
  ["destructive", "destructive", "not destructive"],
  ["idempotent", "idempotent", "not idempotent"],
];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function member(src: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(src, key) ? src[key] : undefined;
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

function optionalBool(src: Record<string, unknown>, key: string, dflt: boolean): boolean | null {
  const v = member(src, key);
  if (v === undefined) return dflt;
  return typeof v === "boolean" ? v : null;
}

interface CallView {
  call: string;
  hints: string;
  serverName: string | null;
}

function hintsText(v: unknown): string | null {
  if (v === undefined) return NO_HINTS;
  if (!isRecord(v)) return null;
  const parts: string[] = [];
  for (const [key, yes, no] of HINT_NAMES) {
    if (!Object.hasOwn(v, key)) continue;
    const value = v[key];
    if (typeof value !== "boolean") return null;
    parts.push(value ? yes : no);
  }
  return parts.length === 0 ? NO_HINTS : parts.join(", ");
}

function parseHttpCall(v: Record<string, unknown>): CallView | null {
  const method = member(v, "method");
  const path = text(member(v, "path"), 1, 1_024);
  if (typeof method !== "string" || !HTTP_METHODS.includes(method) || path === null) return null;
  const params = member(v, "params");
  if (!Array.isArray(params)) return null;
  for (const param of params as unknown[]) {
    if (!isRecord(param)) return null;
    if (typeof member(param, "name") !== "string") return null;
    const where = member(param, "in");
    if (where !== "path" && where !== "query") return null;
  }
  if (typeof member(v, "body") !== "boolean") return null;
  return { call: `${method} ${path}`, hints: NO_HINTS, serverName: null };
}

function parseMcpCall(v: Record<string, unknown>): CallView | null {
  if (text(member(v, "endpoint"), 1, 1_024) === null) return null;
  const name = member(v, "name");
  if (typeof name !== "string" || !MCP_NAME_PATTERN.test(name)) return null;
  const version = member(v, "protocolVersion");
  if (typeof version !== "string" || !PROTOCOL_VERSIONS.includes(version)) return null;
  const output = member(v, "output");
  if (output !== "structured" && output !== "text") return null;
  const hints = hintsText(member(v, "hints"));
  if (hints === null) return null;
  return { call: `mcp ${name} (${version})`, hints, serverName: name };
}

function parseCodeCall(v: Record<string, unknown>): CallView | null {
  const source = member(v, "source");
  if (
    typeof source !== "string" ||
    source.length < 1 ||
    source.length > MAX_CODE_SOURCE ||
    source.includes("\u0000")
  ) {
    return null;
  }
  return { call: `code (${source.length} characters)`, hints: NO_HINTS, serverName: null };
}

function parseCall(v: unknown): CallView | null {
  if (!isRecord(v)) return null;
  const kind = member(v, "kind");
  if (kind === "http") return parseHttpCall(v);
  if (kind === "mcp") return parseMcpCall(v);
  if (kind === "code") return parseCodeCall(v);
  return null;
}

function parseToolHttp(v: unknown): CallView | null {
  if (!isRecord(v)) return null;
  const method = text(member(v, "method"), 1, 16);
  const path = text(member(v, "path"), 1, 2_048);
  if (method === null || path === null) return null;
  return { call: `${method} ${path}`, hints: NO_HINTS, serverName: null };
}

function parseTool(v: unknown): ReviewTool | null {
  if (!isRecord(v)) return null;
  const name = member(v, "name");
  const effect = member(v, "effect");
  if (typeof name !== "string" || !TOOL_NAME_PATTERN.test(name)) return null;
  if (typeof effect !== "string" || !EFFECTS.includes(effect)) return null;
  const untrusted = optionalBool(v, "untrusted_result", true);
  const unsafe = optionalBool(v, "unsafe_to_retry", false);
  if (untrusted === null || unsafe === null) return null;
  const description = member(v, "description");
  if (description !== undefined && typeof description !== "string") return null;
  const http = member(v, "http");
  const call = member(v, "call");
  const hasHttp = http !== undefined && http !== null;
  const hasCall = call !== undefined && call !== null;
  if (hasHttp === hasCall) return null;
  const view = hasHttp ? parseToolHttp(http) : parseCall(call);
  if (view === null) return null;
  return {
    name,
    effect,
    untrusted_result: untrusted,
    unsafe_to_retry: unsafe,
    call: view.call,
    hints: view.hints,
    serverName: view.serverName,
  };
}

export function parseReviewTools(surface: unknown): ReviewTool[] | null {
  if (!isRecord(surface)) return null;
  const list = member(surface, "tools");
  if (!Array.isArray(list) || list.length > MAX_TOOLS) return null;
  const out: ReviewTool[] = [];
  const names = new Set<string>();
  for (const item of list as unknown[]) {
    const tool = parseTool(item);
    if (tool === null || names.has(tool.name)) return null;
    names.add(tool.name);
    out.push(tool);
  }
  return out;
}

export interface SurfaceChange {
  name: string;
  kind: "added" | "removed" | "changed";
  fields: string[];
  description?: { old: string | null; new: string | null };
  input?: { property: string; text: string }[];
}

const FIELD_ORDER: readonly string[] = [
  "effect",
  "description",
  "input",
  "output",
  "untrusted_result",
  "unsafe_to_retry",
  "data_class",
  "call",
  "hints",
  "untrusted_fields",
];

function isSurface(v: unknown): boolean {
  return parseReviewTools(v) !== null;
}

function toolMap(surface: unknown): Map<string, Record<string, unknown>> {
  const m = new Map<string, Record<string, unknown>>();
  const s = surface as { tools: unknown[] };
  for (const t of s.tools) {
    const tool = t as Record<string, unknown>;
    m.set(tool.name as string, tool);
  }
  return m;
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function boolDefault(v: unknown, d: boolean): boolean {
  return typeof v === "boolean" ? v : d;
}

function isRecordLocal(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function canonical(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  if (typeof v === "object") {
    const keys = Object.keys(v as object).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonical((v as Record<string, unknown>)[k])).join(",") + "}";
  }
  return "null";
}

function sortedCopy(arr: unknown): unknown {
  if (!Array.isArray(arr)) return arr === undefined ? [] : arr;
  return [...arr].sort();
}

function invocation(tool: Record<string, unknown>): unknown {
  if (Object.hasOwn(tool, "http") && tool.http !== undefined && tool.http !== null) {
    return { http: tool.http };
  }
  if (Object.hasOwn(tool, "call") && tool.call !== undefined && tool.call !== null) {
    const c = tool.call as Record<string, unknown>;
    const { hints: _hints, ...rest } = c;
    return { call: rest };
  }
  return null;
}

function hintsValue(tool: Record<string, unknown>): unknown {
  if (isRecordLocal(tool.call)) {
    const c = tool.call as Record<string, unknown>;
    if (Object.hasOwn(c, "hints")) return c.hints;
    return null;
  }
  if (Object.hasOwn(tool, "hints")) return tool.hints;
  return null;
}

function normalized(tool: Record<string, unknown>, field: string): unknown {
  switch (field) {
    case "effect":
      return tool.effect;
    case "description":
      return strOrNull(tool.description);
    case "input":
      return tool.input;
    case "output":
      return tool.output;
    case "untrusted_result":
      return boolDefault(tool.untrusted_result, true);
    case "unsafe_to_retry":
      return boolDefault(tool.unsafe_to_retry, false);
    case "data_class":
      return strOrNull(tool.data_class);
    case "call":
      return invocation(tool);
    case "hints":
      return hintsValue(tool);
    case "untrusted_fields":
      return sortedCopy(tool.untrusted_fields);
    default:
      return undefined;
  }
}

function describedInputs(tool: Record<string, unknown>): { property: string; text: string }[] {
  const input = tool.input;
  if (!isRecordLocal(input)) return [];
  const props = input.properties;
  if (!isRecordLocal(props)) return [];
  const out: { property: string; text: string }[] = [];
  for (const key of Object.keys(props)) {
    const p = props[key];
    if (isRecordLocal(p) && typeof p.description === "string") {
      out.push({ property: key, text: p.description });
    }
  }
  return out;
}

export function surfaceDiff(approved: unknown, pending: unknown): SurfaceChange[] {
  if (!isSurface(approved) || !isSurface(pending)) return [];
  const aMap = toolMap(approved);
  const pMap = toolMap(pending);
  const names = new Set<string>([...aMap.keys(), ...pMap.keys()]);
  const sorted = [...names].sort();
  const out: SurfaceChange[] = [];
  for (const name of sorted) {
    const a = aMap.get(name);
    const p = pMap.get(name);
    if (!a && p) {
      out.push({
        name,
        kind: "added",
        fields: [],
        description: { old: null, new: strOrNull(p.description) },
        input: describedInputs(p),
      });
    } else if (a && !p) {
      out.push({ name, kind: "removed", fields: [] });
    } else if (a && p) {
      const fields: string[] = [];
      for (const f of FIELD_ORDER) {
        if (canonical(normalized(a, f)) !== canonical(normalized(p, f))) {
          fields.push(f);
        }
      }
      if (fields.length === 0) continue;
      const change: SurfaceChange = { name, kind: "changed", fields };
      if (fields.includes("description")) {
        change.description = { old: strOrNull(a.description), new: strOrNull(p.description) };
      }
      if (fields.includes("input")) {
        change.input = describedInputs(p);
      }
      out.push(change);
    }
  }
  return out;
}

export function changeText(c: SurfaceChange): string {
  if (c.kind === "added") return `added ${c.name}`;
  if (c.kind === "removed") return `removed ${c.name}`;
  return `changed ${c.name}: ${c.fields.join(", ")}`;
}

function neutralise(s: string): string {
  let out = s.replace(/\n/g, "\u21b5");
  out = out.replace(/[\p{Cc}\p{Cf}\p{Co}\p{Cn}\p{Zl}\p{Zp}]/gu, "?");
  return out;
}

function cut(s: string): string {
  if (s.length <= 2000) return s;
  return s.slice(0, 2000) + ` (${s.length - 2000} more characters)`;
}

function neutralisedText(v: string | null): string {
  if (v === null) return "(none)";
  return cut(neutralise(v));
}

export function changesView(
  approved: unknown,
  pending: unknown,
): { text: string | null; items: { text: string; lines: string[] }[] } {
  if (pending === null || pending === undefined) {
    return { text: "No pending surface to compare.", items: [] };
  }
  if (!isSurface(pending)) {
    return { text: "The surface could not be read.", items: [] };
  }
  let approvedSurf: unknown;
  if (approved === null || approved === undefined) {
    approvedSurf = { tools: [] };
  } else if (!isSurface(approved)) {
    return { text: "The surface could not be read.", items: [] };
  } else {
    approvedSurf = approved;
  }
  const diff = surfaceDiff(approvedSurf, pending);
  if (diff.length === 0) {
    return { text: "No changes.", items: [] };
  }
  const items = diff.map((c) => {
    const lines: string[] = [];
    if (c.kind === "added") {
      const newDesc = c.description ? c.description.new : null;
      lines.push(`Description: ${neutralisedText(newDesc)}`);
      const inputs = c.input ?? [];
      const shown = inputs.slice(0, 50);
      for (const inp of shown) {
        lines.push(`Input ${inp.property}: ${cut(neutralise(inp.text))}`);
      }
      if (inputs.length > 50) {
        lines.push(`(${inputs.length - 50} more properties)`);
      }
    } else if (c.kind === "changed") {
      if (c.fields.includes("description")) {
        const oldD = c.description ? c.description.old : null;
        const newD = c.description ? c.description.new : null;
        lines.push(`Description before: ${neutralisedText(oldD)}`);
        lines.push(`Description after: ${neutralisedText(newD)}`);
      }
      if (c.fields.includes("input")) {
        const inputs = c.input ?? [];
        const shown = inputs.slice(0, 50);
        for (const inp of shown) {
          lines.push(`Input ${inp.property}: ${cut(neutralise(inp.text))}`);
        }
        if (inputs.length > 50) {
          lines.push(`(${inputs.length - 50} more properties)`);
        }
      }
    }
    return { text: changeText(c), lines };
  });
  return { text: null, items };
}

export interface DiscoverDraft {
  effects: Readonly<Record<string, "" | "read" | "write" | "send" | "pay" | "skip">>;
  names?: Readonly<Record<string, string>>;
  trust?: Readonly<Record<string, ToolTrust>>;
  carried?: Readonly<Record<string, Carried>>;
}

type DraftEffect = "" | "read" | "write" | "send" | "pay" | "skip";

const MAX_EXCLUDED = 1_000;
const OVERLAY_KEY_PATTERN = /^[A-Za-z0-9_.-]{1,128}$/;
const DRAFT_NAME_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const DISCOVERY_REASON_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const DRAFT_EFFECTS: readonly string[] = ["", "read", "write", "send", "pay", "skip"];

export function initialDraft(tools: readonly ReviewTool[]): DiscoverDraft {
  const effects: Record<string, DraftEffect> = {};
  const names: Record<string, string> = {};
  for (const tool of tools) {
    const key = tool.serverName;
    if (key === null || key === "__proto__") continue;
    const effect: DraftEffect = tool.effect === "write" ? "" : (tool.effect as DraftEffect);
    effects[key] = effect;
    if (tool.name !== key) names[key] = tool.name;
  }
  return { effects, names };
}

export function discoverBody(d: DiscoverDraft): {
  tools: Record<string, Record<string, string | boolean>>;
} {
  const keys = new Set<string>();
  for (const key of Object.keys(d.effects ?? {})) keys.add(key);
  if (d.names !== undefined) {
    for (const key of Object.keys(d.names)) keys.add(key);
  }
  if (d.trust !== undefined) {
    for (const key of Object.keys(d.trust)) keys.add(key);
  }
  if (d.carried !== undefined) {
    for (const key of Object.keys(d.carried)) keys.add(key);
  }
  keys.delete("__proto__");
  if (keys.size > MAX_TOOLS) throw new RangeError("too many tool settings");
  const tools: Record<string, Record<string, string | boolean>> = {};
  for (const key of keys) {
    if (!OVERLAY_KEY_PATTERN.test(key)) throw new RangeError(`invalid tool name: ${key}`);
    const effectRaw =
      d.effects !== undefined && Object.hasOwn(d.effects, key) ? d.effects[key] : "";
    if (typeof effectRaw !== "string" || !DRAFT_EFFECTS.includes(effectRaw)) {
      throw new RangeError(`invalid effect for ${key}`);
    }
    const nameRaw =
      d.names !== undefined && Object.hasOwn(d.names, key) ? d.names[key] : "";
    if (typeof nameRaw !== "string") throw new RangeError(`invalid tool name for ${key}`);
    if (nameRaw !== "" && !DRAFT_NAME_PATTERN.test(nameRaw)) {
      throw new RangeError(`invalid tool name for ${key}`);
    }
    const trustRaw =
      d.trust !== undefined && Object.hasOwn(d.trust, key) ? d.trust[key] : undefined;
    if (trustRaw !== undefined) {
      if (typeof trustRaw !== "object" || trustRaw === null || Array.isArray(trustRaw)) {
        throw new RangeError(`invalid trust for ${key}`);
      }
      const tr = trustRaw as { trusted?: unknown; dataClass?: unknown };
      if (typeof tr.trusted !== "boolean") throw new RangeError(`invalid trust for ${key}`);
      const dc = tr.dataClass;
      if (dc !== null && dc !== undefined && dc !== "public" && dc !== "private") {
        throw new RangeError(`invalid trust for ${key}`);
      }
    }
    const carriedRaw =
      d.carried !== undefined && Object.hasOwn(d.carried, key) ? d.carried[key] : undefined;
    if (carriedRaw !== undefined) {
      if (typeof carriedRaw !== "object" || carriedRaw === null || Array.isArray(carriedRaw)) {
        throw new RangeError(`invalid carried for ${key}`);
      }
      const cr = carriedRaw as { name?: unknown; unsafe_to_retry?: unknown };
      if (cr.name !== undefined) {
        if (typeof cr.name !== "string" || !DRAFT_NAME_PATTERN.test(cr.name)) {
          throw new RangeError(`invalid carried name for ${key}`);
        }
      }
      if (cr.unsafe_to_retry !== undefined && typeof cr.unsafe_to_retry !== "boolean") {
        throw new RangeError(`invalid carried retry for ${key}`);
      }
    }
    if (effectRaw === "skip") {
      tools[key] = { skip: true };
      continue;
    }
    const trust: ToolTrust =
      trustRaw === undefined
        ? DEFAULT_TRUST
        : {
            trusted: (trustRaw as { trusted: boolean }).trusted,
            dataClass:
              (trustRaw as { dataClass: ToolTrust["dataClass"] }).dataClass === undefined
                ? null
                : ((trustRaw as { dataClass: ToolTrust["dataClass"] }).dataClass ?? null),
          };
    const carried: Carried = carriedRaw === undefined ? {} : { ...(carriedRaw as Carried) };
    if (nameRaw !== "") carried.name = nameRaw;
    const effect = effectRaw === "" ? null : effectRaw;
    const entry = overlayEntry("mcp", effect, trust, carried);
    if (Object.keys(entry).length > 0) tools[key] = entry;
  }
  return { tools };
}

export function parseDiscovery(raw: unknown): {
  protocolVersion: string;
  era: string;
  count: number;
  excluded: { name: string; reason: string }[];
} | null {
  if (!isRecord(raw)) return null;
  const server = member(raw, "server");
  if (!isRecord(server)) return null;
  const list = member(server, "tools");
  if (!Array.isArray(list) || list.length > MAX_TOOLS) return null;
  const era = member(raw, "era");
  if (era !== "modern" && era !== "legacy") return null;
  const version = member(raw, "protocolVersion");
  if (typeof version !== "string" || !PROTOCOL_VERSIONS.includes(version)) return null;
  const excludedRaw = member(raw, "excluded");
  if (!Array.isArray(excludedRaw) || excludedRaw.length > MAX_EXCLUDED) return null;
  const excluded: { name: string; reason: string }[] = [];
  for (const item of excludedRaw as unknown[]) {
    if (!isRecord(item)) return null;
    const name = member(item, "name");
    const reason = member(item, "reason");
    if (typeof name !== "string") return null;
    if (typeof reason !== "string" || !DISCOVERY_REASON_PATTERN.test(reason)) return null;
    excluded.push({ name, reason });
  }
  return { protocolVersion: version, era, count: list.length, excluded };
}

const SERVER_ID_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;

function checkServerId(serverId: string): void {
  if (!SERVER_ID_PATTERN.test(serverId)) throw new RangeError("Invalid tool server id");
}

function checkDiscoverBody(body: unknown): void {
  if (!isRecord(body)) throw new RangeError("Invalid discovery body");
  if (!Object.hasOwn(body, "tools")) throw new RangeError("Invalid discovery body");
  const tools = body["tools"];
  if (!isRecord(tools)) throw new RangeError("Invalid discovery body");
}

export async function discoverTools(
  api: Api<"post">,
  serverId: string,
  body: unknown,
  key: string,
  signal?: AbortSignal,
): Promise<NonNullable<ReturnType<typeof parseDiscovery>>> {
  checkServerId(serverId);
  if (key.trim() === "") throw new RangeError("Invalid idempotency key");
  checkDiscoverBody(body);
  const options: { headers: Record<string, string>; signal?: AbortSignal } = {
    headers: { "Idempotency-Key": key },
  };
  if (signal !== undefined) options.signal = signal;
  const answer = await api.post<unknown>(`/tool-servers/${serverId}/discover`, body, options);
  const parsed = parseDiscovery(answer);
  if (parsed === null) {
    throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid discovery answer");
  }
  return parsed;
}

function leftOutName(name: string): string {
  const shown = neutralise(name);
  return shown.length > 80 ? shown.slice(0, 79) + "…" : shown;
}

export function discoveryText(d: NonNullable<ReturnType<typeof parseDiscovery>>): string {
  const base = `Discovered ${d.count} tools over MCP ${d.protocolVersion}.`;
  if (d.excluded.length === 0) return base;
  const parts = d.excluded.map((entry) => {
    const reason = entry.reason === "description" ? "description dropped, tool kept" : entry.reason;
    return `${leftOutName(entry.name)} (${reason})`;
  });
  return `${base} Left out: ${parts.join(", ")}`;
}

function excludedParts(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const parts: string[] = [];
  for (const item of v as unknown[]) {
    if (!isRecord(item)) continue;
    const name = member(item, "name");
    const reason = member(item, "reason");
    if (typeof name !== "string" || typeof reason !== "string") continue;
    const why = reason === "description" ? "description dropped, tool kept" : reason;
    parts.push(`${leftOutName(name)} (${why})`);
  }
  return parts;
}

function detailsOf(error: unknown): Record<string, unknown> | null {
  if (!(error instanceof ApiRequestError)) return null;
  return isRecord(error.details) ? error.details : null;
}

function detailsReason(details: Record<string, unknown> | null): string | null {
  if (details === null) return null;
  const reason = details["reason"];
  return typeof reason === "string" ? reason : null;
}

export function discoveryErrorText(error: unknown): string {
  if (error instanceof ApiRequestError && error.status === 422 && error.code === "OPERATION_REFUSED") {
    const details = detailsOf(error);
    const reason = detailsReason(details);
    switch (reason) {
      case "credential_missing":
        return "Store a credential for this server first. A server that needs no key still needs one: enter any text.";
      case "discovery_denied":
        return "Policy refused the discovery request.";
      case "discovery_failed": {
        const status = details === null ? undefined : details["status"];
        if (status === "401" || status === "403") {
          return "The server refused the stored credential. Rotate it, then discover again.";
        }
        return "The MCP server could not be reached, or it answered with an error.";
      }
      case "mcp_session_required":
        return "The MCP server needs a stateful session, which Ursitoare does not support yet.";
      case "no_tools": {
        const base = "The MCP server lists no usable tools.";
        const parts = excludedParts(details === null ? undefined : details["excluded"]);
        return parts.length === 0 ? base : `${base} Left out: ${parts.join(", ")}`;
      }
      case "name_collision": {
        const names = collidingNames(error);
        if (names.length >= 2) {
          return `Two server tools get the same tool name (${names.join(",")}): give one a tool name.`;
        }
        return "Two server tools get the same tool name: give one a tool name.";
      }
      default:
        return toolsErrorMessage(error);
    }
  }
  if (error instanceof ApiRequestError && error.status === 503 && error.code === "EGRESS_UNAVAILABLE") {
    const reason = detailsReason(detailsOf(error));
    if (reason === "discovery_not_configured") {
      return "Discovery is not configured on this engine.";
    }
    if (reason === "gateway_unavailable") {
      return "The egress gateway is unavailable. Try again.";
    }
  }
  return toolsErrorMessage(error);
}

export function collidingNames(error: unknown): string[] {
  if (!(error instanceof ApiRequestError) || error.status !== 422 || error.code !== "OPERATION_REFUSED") {
    return [];
  }
  const details = detailsOf(error);
  if (detailsReason(details) !== "name_collision" || details === null) return [];
  const names = details["names"];
  if (typeof names !== "string") return [];
  const parts = names.split(",");
  if (parts.length < 2) return [];
  for (const name of parts) {
    if (!MCP_NAME_PATTERN.test(name)) return [];
  }
  return parts;
}

export interface ServerReview {
  server: ToolServerView;
  approved: unknown;
  pending: unknown;
}

export async function loadServerReview(
  api: Api<"get">,
  serverId: string,
  signal?: AbortSignal,
): Promise<ServerReview> {
  checkServerId(serverId);
  const path = `/tool-servers/${serverId}`;
  const answer =
    signal === undefined ? await api.get<unknown>(path) : await api.get<unknown>(path, { signal });
  const server = parseToolServer(answer);
  if (server === null) {
    throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid tool server");
  }
  const record = isRecord(answer) ? answer : {};
  const approved = Object.hasOwn(record, "approvedSurface") ? record["approvedSurface"] : null;
  const pending = Object.hasOwn(record, "pendingSurface") ? record["pendingSurface"] : null;
  return { server, approved: approved ?? null, pending: pending ?? null };
}

export function callRows(tools: readonly ReviewTool[]): {
  name: string;
  call: string;
  effect: string;
  retry: string;
  result: string;
  hints: string;
}[] {
  return tools.map((tool) => ({
    name: tool.name,
    call: tool.call,
    effect: tool.effect,
    retry: tool.unsafe_to_retry ? "unsafe to retry" : "safe to retry",
    result: tool.untrusted_result ? "untrusted" : "trusted",
    hints: tool.hints,
  }));
}

export function readNote(tools: readonly ReviewTool[]): string | null {
  return tools.some((tool) => tool.effect === "read") ? READ_NOTE : null;
}

export const REVIEW_NAMES: Readonly<Record<string, string>> = {
  discovery: "Discovery",
  discoverTools: "Discover tools",
  toolSettings: "Tool settings",
  serverTool: "Server tool",
  serverHints: "Server hints",
  toolName: "Tool name",
  toolNameOf: "Tool name of ",
  effect: "Effect",
  proposed: "Proposed",
  skip: "Skip",
  effectOf: "Effect of ",
  discoverAgainWithTheseSettings: "Discover again with these settings",
  changes: "Changes",
  noPendingSurfaceToCompare: "No pending surface to compare.",
  noChanges: "No changes.",
  surfaceCouldNotBeRead: "The surface could not be read.",
  calls: "Calls",
  tool: "Tool",
  call: "Call",
  retry: "Retry",
  readToolsAreCalledForReal: "Read tools are called for real, even in a dry run. Check that each one changes nothing.",
  result: "Result",
  noCalls: "No calls",
};
