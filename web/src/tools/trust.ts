// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { OperationRowView } from "./register.ts";

export type DataClass = "public" | "private";

export interface ToolTrust {
  trusted: boolean;
  dataClass: DataClass | null;
}

export const DEFAULT_TRUST: Readonly<ToolTrust> = Object.freeze({
  trusted: false,
  dataClass: null,
});

export interface StoredTool {
  name: string;
  effect: string;
  untrusted_result: boolean;
  unsafe_to_retry: boolean | null;
  data_class: DataClass | null;
  serverName: string | null;
}

const TOOL_NAME = /^[a-z][a-z0-9_]{0,63}$/;
const MCP_NAME = /^[A-Za-z0-9_.-]{1,128}$/;
const EFFECTS: readonly string[] = ["read", "write", "send", "pay"];
const MAX_TOOLS = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStoredTool(raw: unknown): StoredTool | null {
  if (!isRecord(raw)) return null;
  const name = raw["name"];
  if (typeof name !== "string" || !TOOL_NAME.test(name)) return null;
  const effect = raw["effect"];
  if (typeof effect !== "string" || !EFFECTS.includes(effect)) return null;
  const untrusted = raw["untrusted_result"];
  if (Object.hasOwn(raw, "untrusted_result") && typeof untrusted !== "boolean") {
    return null;
  }
  const retry = raw["unsafe_to_retry"];
  if (Object.hasOwn(raw, "unsafe_to_retry") && typeof retry !== "boolean") {
    return null;
  }
  const dataClass = raw["data_class"];
  if (
    Object.hasOwn(raw, "data_class") &&
    dataClass !== null &&
    dataClass !== "public" &&
    dataClass !== "private"
  ) {
    return null;
  }
  let serverName: string | null = null;
  if (Object.hasOwn(raw, "call")) {
    const call = raw["call"];
    if (call !== null) {
      if (!isRecord(call)) return null;
      if (call["kind"] === "mcp") {
        const mcpName = call["name"];
        if (typeof mcpName !== "string" || !MCP_NAME.test(mcpName)) return null;
        serverName = mcpName;
      }
    }
  }
  return {
    name,
    effect,
    untrusted_result: untrusted === undefined ? true : untrusted === true,
    unsafe_to_retry: retry === undefined ? null : (retry as boolean),
    data_class:
      dataClass === undefined || dataClass === null ? null : (dataClass as DataClass),
    serverName,
  };
}

export function storedTools(surface: unknown): ReadonlyMap<string, StoredTool> | null {
  if (!isRecord(surface)) return null;
  const tools = surface["tools"];
  if (!Array.isArray(tools) || tools.length > MAX_TOOLS) return null;
  const map = new Map<string, StoredTool>();
  for (const raw of tools) {
    const tool = readStoredTool(raw);
    if (tool === null) return null;
    if (map.has(tool.name)) return null;
    map.set(tool.name, tool);
  }
  return map;
}

export function trustOf(t: StoredTool | undefined): ToolTrust {
  if (t === undefined) return DEFAULT_TRUST;
  return { trusted: !t.untrusted_result, dataClass: t.data_class };
}

export type OverlayAdapter = "openapi" | "mcp";

export interface Carried {
  name?: string;
  unsafe_to_retry?: boolean;
}

function defaultRetry(adapter: OverlayAdapter, effect: string): boolean {
  return adapter === "mcp" ? true : effect !== "read";
}

export function carriedFields(
  adapter: OverlayAdapter,
  stored: StoredTool | undefined,
  next: { effect: string; derivedName: string | null },
): Carried {
  if (stored === undefined) return {};
  const carried: Carried = {};
  if (next.derivedName !== null && next.derivedName !== stored.name) {
    carried.name = stored.name;
  }
  if (
    stored.effect === next.effect &&
    stored.unsafe_to_retry !== null &&
    stored.unsafe_to_retry !== defaultRetry(adapter, next.effect)
  ) {
    carried.unsafe_to_retry = stored.unsafe_to_retry;
  }
  return carried;
}

export function carriedAfterEffect(
  adapter: OverlayAdapter,
  stored: ReadonlyMap<string, StoredTool> | null,
  lookup: string | null,
  effect: string,
  derivedName: string | null,
): Carried {
  if (stored === null || lookup === null) return {};
  let tool: StoredTool | undefined;
  if (adapter === "mcp") {
    for (const candidate of stored.values()) {
      if (candidate.serverName === lookup) {
        tool = candidate;
        break;
      }
    }
  } else {
    tool = stored.get(lookup);
  }
  if (tool === undefined) return {};
  if (adapter === "openapi" && effect === "") return {};
  const nextEffect = adapter === "mcp" && effect === "" ? "write" : effect;
  return carriedFields(adapter, tool, { effect: nextEffect, derivedName });
}

function setOwn<T>(record: Record<string, T>, key: string, value: T): void {
  Object.defineProperty(record, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  });
}

export function overlayEntry(
  adapter: OverlayAdapter,
  effect: string | null,
  trust: ToolTrust,
  carried: Carried,
): Record<string, string | boolean> {
  if (adapter === "openapi" && effect === null) {
    throw new RangeError("An OpenAPI entry needs an effect.");
  }
  if (effect !== null && !EFFECTS.includes(effect)) {
    throw new RangeError("Unknown effect.");
  }
  if (
    trust.dataClass !== null &&
    trust.dataClass !== "public" &&
    trust.dataClass !== "private"
  ) {
    throw new RangeError("Unknown data class.");
  }
  if (carried.name !== undefined && !TOOL_NAME.test(carried.name)) {
    throw new RangeError("Invalid tool name.");
  }
  const entry: Record<string, string | boolean> = {};
  if (effect !== null) entry["effect"] = effect;
  if (carried.name !== undefined) entry["name"] = carried.name;
  if (trust.trusted) entry["untrusted_result"] = false;
  if (carried.unsafe_to_retry !== undefined) {
    entry["unsafe_to_retry"] = carried.unsafe_to_retry;
  }
  if (trust.dataClass !== null) entry["data_class"] = trust.dataClass;
  return entry;
}

export function prefillTrust(
  stored: ReadonlyMap<string, StoredTool> | null,
  operations: readonly OperationRowView[],
): { trust: Record<string, ToolTrust>; carried: Record<string, Carried> } {
  const trust: Record<string, ToolTrust> = {};
  const carried: Record<string, Carried> = {};
  if (stored === null) return { trust, carried };
  for (const operation of operations) {
    if (operation.excluded !== null) continue;
    if (operation.operationId === null) continue;
    if (operation.name === null) continue;
    const tool = stored.get(operation.name);
    if (tool === undefined) continue;
    const toolTrust = trustOf(tool);
    const toolCarried = carriedFields("openapi", tool, {
      effect: tool.effect,
      derivedName: operation.name,
    });
    if (toolTrust.trusted || toolTrust.dataClass !== null) {
      setOwn(trust, operation.operationId, toolTrust);
    }
    if (
      toolCarried.name !== undefined ||
      toolCarried.unsafe_to_retry !== undefined
    ) {
      setOwn(carried, operation.operationId, toolCarried);
    }
  }
  return { trust, carried };
}

export function discoverSettings(stored: ReadonlyMap<string, StoredTool> | null): {
  trust: Record<string, ToolTrust>;
  carried: Record<string, Carried>;
} {
  const trust: Record<string, ToolTrust> = {};
  const carried: Record<string, Carried> = {};
  if (stored === null) return { trust, carried };
  for (const tool of stored.values()) {
    const serverName = tool.serverName;
    if (serverName === null || serverName === "__proto__") continue;
    const toolTrust = trustOf(tool);
    const fields = carriedFields("mcp", tool, {
      effect: tool.effect,
      derivedName: serverName,
    });
    const toolCarried: Carried = {};
    if (fields.unsafe_to_retry !== undefined) {
      toolCarried.unsafe_to_retry = fields.unsafe_to_retry;
    }
    if (toolTrust.trusted || toolTrust.dataClass !== null) {
      setOwn(trust, serverName, toolTrust);
    }
    if (toolCarried.unsafe_to_retry !== undefined) {
      setOwn(carried, serverName, toolCarried);
    }
  }
  return { trust, carried };
}

export function trustAckMissing(
  _trust: Readonly<Record<string, ToolTrust>>,
  _ack: Readonly<Record<string, boolean>>,
): string[] {
  throw new Error("not implemented");
}

export function ackStatus(
  _trust: Readonly<Record<string, ToolTrust>>,
  _baseline: Readonly<Record<string, ToolTrust>>,
  _ticks: Readonly<Record<string, boolean>>,
): { shown: string[]; missing: string[]; message: string | null } {
  throw new Error("not implemented");
}

export function valueChangeLines(_approved: unknown, _pending: unknown): ReadonlyMap<string, string[]> {
  throw new Error("not implemented");
}

export interface ChangesText {
  text: string | null;
  items: { text: string; lines: string[] }[];
}

export function withValueLines(_view: ChangesText, _values: ReadonlyMap<string, string[]>): ChangesText {
  throw new Error("not implemented");
}

export function fillName(_template: string, _key: string): string {
  throw new Error("not implemented");
}

export const TRUST_WARNING: string = "";

export const TRUST_NAMES: Readonly<Record<string, string>> = {};
