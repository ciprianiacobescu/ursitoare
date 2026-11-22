import { toolNameOf } from "../names.ts";
import { ToolsError, type ToolSurface } from "../types.ts";
import { resolveRefObject, translateSchema } from "./schema.ts";
import type {
  OpenApiExclusion,
  OpenApiOperation,
  OpenApiOverlay,
  OpenApiPreview,
} from "./types.ts";

type Rec = Record<string, unknown>;

const METHODS: readonly string[] = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];
const UNSUPPORTED_METHODS: ReadonlySet<string> = new Set(["head", "options", "trace"]);
const PARAM_NAME = /^[A-Za-z0-9_.-]{1,64}$/;
const PATH_TYPES: readonly string[] = ["string", "integer"];
const QUERY_TYPES: readonly string[] = ["string", "integer", "number", "boolean"];
const SUCCESS_CODES: readonly string[] = ["200", "201", "202", "2XX"];
// RFC 3986 path: segments of pchar, each preceded by a slash
const SERVER_PATH = /^(?:\/(?:[A-Za-z0-9\-._~!$&'()*+,;=:@]|%[0-9A-Fa-f]{2})*)*$/;

class Excluded extends Error {
  readonly reason: OpenApiExclusion;

  constructor(reason: OpenApiExclusion) {
    super(reason);
    this.reason = reason;
  }
}

function isRecord(value: unknown): value is Rec {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(field: string, reason: string): ToolsError {
  return new ToolsError("TOOLS_INVALID", `${field}: ${reason}`, { field, reason });
}

function resolve(value: unknown, document: Rec): unknown {
  const result = resolveRefObject(value, document);
  if (!result.ok) throw new Excluded(result.reason);
  return result.value;
}

function translate(schema: unknown, version: "3.0" | "3.1", document: Rec): Rec {
  const result = translateSchema(schema, version, document);
  if (!result.ok) throw new Excluded(result.reason);
  return result.schema;
}

function readBasePath(document: Rec, origin: string): string {
  const servers = document["servers"];
  if (servers === undefined) return "";
  if (!Array.isArray(servers)) throw invalid("servers", "server_mismatch");
  if (servers.length === 0) return "";
  const server: unknown = servers[0];
  const url = isRecord(server) ? server["url"] : undefined;
  if (typeof url !== "string") throw invalid("servers", "server_mismatch");
  if (url.includes("{")) throw invalid("servers", "server_variables");
  let path: string;
  if (url.startsWith("/")) {
    path = url;
  } else if (url.startsWith(origin)) {
    path = url.slice(origin.length);
  } else {
    throw invalid("servers", "server_mismatch");
  }
  if (path.startsWith("//") || !SERVER_PATH.test(path)) {
    throw invalid("servers", "server_mismatch");
  }
  return path.replace(/\/+$/, "");
}

function mergeParameters(pathItem: Rec, operation: Rec, document: Rec): unknown[] {
  const resolveAll = (list: unknown): unknown[] =>
    Array.isArray(list) ? list.map((entry: unknown) => resolve(entry, document)) : [];
  const keyOf = (parameter: unknown): string =>
    isRecord(parameter) ? `${String(parameter["in"])}\u0000${String(parameter["name"])}` : "";
  const own = resolveAll(operation["parameters"]);
  const ownKeys = new Set(own.map(keyOf));
  const inherited = resolveAll(pathItem["parameters"]).filter((p) => !ownKeys.has(keyOf(p)));
  return [...inherited, ...own];
}

function checkParameters(parameters: unknown[], version: "3.0" | "3.1", document: Rec): Rec[] {
  for (const parameter of parameters) {
    if (!isRecord(parameter) || (parameter["in"] !== "path" && parameter["in"] !== "query")) {
      throw new Excluded("param_location");
    }
  }
  const checked = parameters as Rec[];
  for (const parameter of checked) {
    const name = parameter["name"];
    if (typeof name !== "string" || !PARAM_NAME.test(name)) throw new Excluded("param_schema");
    if (!isRecord(parameter["schema"])) throw new Excluded("param_schema");
    const type = translate(parameter["schema"], version, document)["type"];
    const allowed = parameter["in"] === "path" ? PATH_TYPES : QUERY_TYPES;
    if (typeof type !== "string" || !allowed.includes(type)) throw new Excluded("param_schema");
  }
  return checked;
}

function checkPath(path: string, basePath: string, parameters: Rec[]): void {
  const placeholders: string[] = [];
  for (const segment of path.split("/").slice(1)) {
    if (segment === "." || segment === "..") throw new Excluded("path_template");
    if (/[{}]/.test(segment)) {
      const name = /^\{([^{}]+)\}$/.exec(segment)?.[1];
      if (name === undefined || placeholders.includes(name)) throw new Excluded("path_template");
      placeholders.push(name);
    }
  }
  const named = parameters.filter((p) => p["in"] === "path").map((p) => String(p["name"]));
  if (
    placeholders.length !== named.length ||
    !placeholders.every((name) => named.includes(name))
  ) {
    throw new Excluded("path_template");
  }
  const full = basePath + path;
  if (!/^\/[\x21-\x7e]{0,1023}$/.test(full) || /[?#\\]/.test(full)) {
    throw new Excluded("path_template");
  }
}

function bodyProperties(
  operation: Rec,
  version: "3.0" | "3.1",
  document: Rec,
): string[] {
  if (operation["requestBody"] === undefined) return [];
  const body = resolve(operation["requestBody"], document);
  const content = isRecord(body) ? body["content"] : undefined;
  const media =
    isRecord(content) && Object.hasOwn(content, "application/json")
      ? content["application/json"]
      : undefined;
  if (!isRecord(media)) throw new Excluded("body_media_type");
  if (!Object.hasOwn(media, "schema")) throw new Excluded("body_not_object");
  const schema = translate(media["schema"], version, document);
  const properties = schema["properties"];
  if (schema["type"] !== "object" || !isRecord(properties)) throw new Excluded("body_not_object");
  const required = schema["required"];
  if (required !== undefined) {
    if (
      !Array.isArray(required) ||
      !required.every((name) => typeof name === "string" && Object.hasOwn(properties, name))
    ) {
      throw new Excluded("body_not_object");
    }
  }
  return Object.keys(properties);
}

function checkResponses(operation: Rec, version: "3.0" | "3.1", document: Rec): void {
  const responses = operation["responses"];
  if (!isRecord(responses)) throw new Excluded("response_not_object");
  const code = SUCCESS_CODES.find((candidate) => Object.hasOwn(responses, candidate));
  if (code === undefined) {
    if (!Object.hasOwn(responses, "204")) throw new Excluded("response_not_object");
    return;
  }
  const response = resolve(responses[code], document);
  const content = isRecord(response) ? response["content"] : undefined;
  if (content === undefined || (isRecord(content) && Object.keys(content).length === 0)) return;
  const media =
    isRecord(content) && Object.hasOwn(content, "application/json")
      ? content["application/json"]
      : undefined;
  if (!isRecord(media) || !Object.hasOwn(media, "schema")) throw new Excluded("response_not_object");
  if (translate(media["schema"], version, document)["type"] !== "object") {
    throw new Excluded("response_not_object");
  }
}

function exclusionOf(
  method: string,
  path: string,
  pathItem: Rec,
  operation: Rec,
  operationId: string | null,
  name: string | null,
  basePath: string,
  version: "3.0" | "3.1",
  document: Rec,
): OpenApiExclusion | null {
  try {
    if (operationId === null || name === null) throw new Excluded("no_operation_id");
    if (
      UNSUPPORTED_METHODS.has(method) ||
      ((method === "get" || method === "delete") && Object.hasOwn(operation, "requestBody"))
    ) {
      throw new Excluded("method_unsupported");
    }
    const parameters = checkParameters(mergeParameters(pathItem, operation, document), version, document);
    checkPath(path, basePath, parameters);
    const properties = bodyProperties(operation, version, document);
    const names = [...parameters.map((p) => String(p["name"])), ...properties];
    if (new Set(names).size !== names.length) throw new Excluded("param_collision");
    checkResponses(operation, version, document);
    if (names.includes("url_host")) throw new Excluded("reserved_name");
    return null;
  } catch (error) {
    if (error instanceof Excluded) return error.reason;
    throw error;
  }
}

export function readOpenApi(document: unknown, origin: string): OpenApiPreview {
  if (!isRecord(document)) throw invalid("document", "not_object");
  const declared = document["openapi"];
  const match = typeof declared === "string" ? /^3\.([01])\.[0-9]+$/.exec(declared) : null;
  if (match === null) throw invalid("openapi", "openapi_version");
  const version = match[1] === "0" ? "3.0" : "3.1";
  const basePath = readBasePath(document, origin);

  const paths = document["paths"];
  const operations: OpenApiOperation[] = [];
  const seen = new Set<string>();
  if (isRecord(paths)) {
    for (const [path, pathItem] of Object.entries(paths)) {
      if (!path.startsWith("/") || !isRecord(pathItem)) continue;
      for (const [method, operation] of Object.entries(pathItem)) {
        if (!METHODS.includes(method) || !isRecord(operation)) continue;
        const id = operation["operationId"];
        const operationId = typeof id === "string" ? id : null;
        if (operationId !== null) {
          if (seen.has(operationId)) throw invalid("paths", "duplicate_operation_id");
          seen.add(operationId);
        }
        const name = operationId === null ? null : toolNameOf(operationId);
        operations.push({
          operationId,
          method: method.toUpperCase(),
          path,
          name,
          excluded: exclusionOf(
            method,
            path,
            pathItem,
            operation,
            operationId,
            name,
            basePath,
            version,
            document,
          ),
        });
      }
    }
  }
  if (operations.length === 0) throw invalid("paths", "no_operations");
  return { version, basePath, operations };
}

export function importOpenApi(
  _document: unknown,
  _origin: string,
  _overlay: OpenApiOverlay,
): ToolSurface {
  throw new Error("not implemented");
}
