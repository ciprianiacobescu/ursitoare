import type { FastifyInstance } from "fastify";

import { ERROR_CODES } from "./error-codes.ts";
import { defineRoute, listDefinedRoutes } from "./route.ts";
import type { DefinedRoute } from "./route.ts";

const API_METHODS = new Set<string>(["GET", "POST", "PUT", "PATCH", "DELETE"]);

const ERROR_ENVELOPE = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message"],
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        details: {},
      },
    },
  },
} as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIncluded(route: DefinedRoute): boolean {
  if (route.listener !== "public" || !API_METHODS.has(route.method)) {
    return false;
  }
  return !(route.method === "GET" && route.url === "/*");
}

function pathOf(url: string): { path: string; names: string[] } {
  const names: string[] = [];
  const segments = url.split("/").map((segment) => {
    if (!segment.startsWith(":")) {
      return segment;
    }
    const open = segment.indexOf("(");
    const name = open === -1 ? segment.slice(1) : segment.slice(1, open);
    if (name.length > 0) {
      names.push(name);
    }
    return `{${name}}`;
  });
  return { path: segments.join("/"), names };
}

function operationIdOf(method: string, url: string): string {
  const normalized = url.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `${method.toLowerCase()}_${normalized}`;
}

function authOf(route: DefinedRoute): string {
  return route.auth.kind === "public"
    ? `public:${route.auth.reason}`
    : route.auth.kind;
}

function pathParameters(route: DefinedRoute, names: readonly string[]): Record<string, unknown>[] {
  const schema = route.schema;
  const params = isPlainObject(schema.params) ? schema.params : undefined;
  const properties = params !== undefined && isPlainObject(params.properties) ? params.properties : undefined;
  return names.map((name) => ({
    name,
    in: "path",
    required: true,
    schema: properties !== undefined && Object.hasOwn(properties, name)
      ? properties[name]
      : { type: "string" },
  }));
}

function partParameters(part: unknown, location: "query" | "header"): Record<string, unknown>[] {
  if (!isPlainObject(part)) {
    return [];
  }
  const properties = isPlainObject(part.properties) ? part.properties : undefined;
  if (properties === undefined) {
    return [];
  }
  const required = Array.isArray(part.required)
    ? part.required.filter((name): name is string => typeof name === "string")
    : [];
  return Object.keys(properties)
    .sort()
    .map((name) => ({
      name,
      in: location,
      required: required.includes(name),
      schema: properties[name],
    }));
}

function parametersOf(route: DefinedRoute, names: readonly string[]): Record<string, unknown>[] {
  return [
    ...pathParameters(route, names),
    ...partParameters(route.schema.querystring, "query"),
    ...partParameters(route.schema.headers, "header"),
  ];
}

function errorResponses(
  route: DefinedRoute,
  defined: Record<string, unknown>,
): Record<string, unknown> {
  const byStatus = new Map<number, string[]>();
  for (const code of route.errors) {
    const entry = ERROR_CODES[code];
    if (entry === undefined) {
      continue;
    }
    const codes = byStatus.get(entry.status) ?? [];
    codes.push(code);
    byStatus.set(entry.status, codes);
  }

  const responses: Record<string, unknown> = {};
  for (const status of [...byStatus.keys()].sort((a, b) => a - b)) {
    const key = String(status);
    if (Object.hasOwn(defined, key)) {
      continue;
    }
    const codes = [...(byStatus.get(status) ?? [])].sort();
    responses[key] = {
      description: `Error codes: ${codes.join(", ")}`,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorEnvelope" },
        },
      },
    };
  }
  return responses;
}

function responsesOf(route: DefinedRoute): Record<string, unknown> {
  const schema = route.schema;
  const defined = isPlainObject(schema.response) ? schema.response : {};
  const responses: Record<string, unknown> = {};
  let hasSuccess = false;
  for (const [status, value] of Object.entries(defined)) {
    responses[status] = {
      description: "Success",
      content: { "application/json": { schema: value } },
    };
    if (status === "default" || /^2\d\d$/.test(status)) {
      hasSuccess = true;
    }
  }
  if (!hasSuccess) {
    responses["200"] = { description: "Success" };
  }
  return { ...responses, ...errorResponses(route, defined) };
}

function operationOf(route: DefinedRoute, names: readonly string[]): Record<string, unknown> {
  const operation: Record<string, unknown> = {
    operationId: operationIdOf(route.method, route.url),
    "x-ursitoare-auth": authOf(route),
    "x-ursitoare-errors": [...route.errors].sort(),
  };
  if (route.action !== null) {
    operation["x-ursitoare-action"] = route.action;
  }

  const parameters = parametersOf(route, names);
  if (parameters.length > 0) {
    operation.parameters = parameters;
  }

  const body = route.schema.body;
  if (isPlainObject(body)) {
    operation.requestBody = {
      required: true,
      content: { "application/json": { schema: body } },
    };
  }

  operation.responses = responsesOf(route);
  return operation;
}

export function buildOpenApiDocument(
  routes: readonly DefinedRoute[],
  info: { version: string },
): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const route of routes) {
    if (!isIncluded(route)) {
      continue;
    }
    const { path, names } = pathOf(route.url);
    const pathItem = paths[path] ?? {};
    pathItem[route.method.toLowerCase()] = operationOf(route, names);
    paths[path] = pathItem;
  }

  return {
    openapi: "3.1.0",
    info: { title: "Ursitoare API", version: info.version },
    paths,
    components: { schemas: { ErrorEnvelope: ERROR_ENVELOPE } },
  };
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (isPlainObject(value)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortValue(value[key]);
    }
    return sorted;
  }
  return value;
}

export function renderOpenApi(doc: unknown): string {
  return `${JSON.stringify(sortValue(doc), null, 2)}\n`;
}

export function registerOpenApiRoute(server: FastifyInstance, opts: { version: string }): void {
  defineRoute(server, {
    method: "GET",
    url: "/api/v1/openapi.json",
    auth: { kind: "public", reason: "static" },
    schema: {},
    errors: [],
    handler: async () => buildOpenApiDocument(listDefinedRoutes(server), { version: opts.version }),
  });
}
