import type { CallAdapter, CallAnswer, CallBuild, HttpCallSpec, ToolJson } from "../calls.ts";

const MAX_PATH = 2048;

function isPlain(value: unknown): value is { [key: string]: ToolJson } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function encode(value: unknown): string | null {
  try {
    return encodeURIComponent(String(value));
  } catch {
    return null;
  }
}

function sortedJson(value: ToolJson | undefined): string {
  if (Array.isArray(value)) return `[${value.map((item) => sortedJson(item === undefined ? null : item)).join(",")}]`;
  if (isPlain(value)) {
    const parts: string[] = [];
    for (const key of Object.keys(value).sort()) {
      const item = value[key];
      if (item === undefined) continue;
      parts.push(`${JSON.stringify(key)}:${sortedJson(item)}`);
    }
    return `{${parts.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function build(call: HttpCallSpec, args: ToolJson, idemKey: string | null): CallBuild {
  if (!isPlain(args)) return { ok: false, reason: "args_not_object" };
  const values = new Map<string, string>();
  const query: string[] = [];
  for (const param of call.params) {
    const value: ToolJson | undefined = Object.hasOwn(args, param.name) ? args[param.name] : undefined;
    if (param.in === "path") {
      if (typeof value !== "string" && !(typeof value === "number" && Number.isFinite(value))) {
        return { ok: false, reason: "path_param" };
      }
      if (value === "" || value === "." || value === "..") return { ok: false, reason: "path_param" };
      const encoded = encode(value);
      if (encoded === null) return { ok: false, reason: "path_param" };
      values.set(param.name, encoded);
    } else {
      if (value === undefined || value === null) continue;
      if (
        typeof value !== "string" &&
        typeof value !== "boolean" &&
        !(typeof value === "number" && Number.isFinite(value))
      ) {
        return { ok: false, reason: "query_param" };
      }
      const name = encode(param.name);
      const encoded = encode(value);
      if (name === null || encoded === null) return { ok: false, reason: "query_param" };
      query.push(`${name}=${encoded}`);
    }
  }
  let missing = false;
  let path = call.path.replace(/\{([^{}]*)\}/g, (_whole, name: string) => {
    const value = values.get(name);
    if (value === undefined) {
      missing = true;
      return "";
    }
    return value;
  });
  if (missing) return { ok: false, reason: "path_param" };
  if (query.length > 0) path += `?${query.join("&")}`;
  if (path.length > MAX_PATH) return { ok: false, reason: "path_too_long" };
  const headers: Record<string, string> = { accept: "application/json" };
  let body: Uint8Array | null = null;
  if (call.body) {
    headers["content-type"] = "application/json";
    const names = new Set(call.params.map((param) => param.name));
    const rest: { [key: string]: ToolJson } = {};
    for (const key of Object.keys(args)) {
      if (names.has(key)) continue;
      Object.defineProperty(rest, key, {
        value: args[key],
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    body = new TextEncoder().encode(sortedJson(rest));
  }
  if (idemKey !== null) headers["idempotency-key"] = idemKey;
  return { ok: true, request: { method: call.method, path, headers, body } };
}

function answer(_call: HttpCallSpec, response: { status: number; body: Uint8Array }): CallAnswer {
  const { status, body } = response;
  if (status < 200 || status > 299) return { ok: false, stage: "upstream", reason: "status", status };
  if (body.byteLength === 0) return { ok: true, output: {} };
  try {
    const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
    if (isPlain(parsed)) return { ok: true, output: parsed };
  } catch {
    // falls through to not_json
  }
  return { ok: false, stage: "response", reason: "not_json", status: null };
}

export const httpCallAdapter: CallAdapter<HttpCallSpec> = { build, answer };

export const HTTP_EMPTY_OUTPUT: Readonly<{ type: "object"; additionalProperties: false }> =
  Object.freeze({ type: "object", additionalProperties: false });
