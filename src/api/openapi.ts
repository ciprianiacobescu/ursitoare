// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyInstance } from "fastify";

import type { DefinedRoute } from "./route.ts";

export function buildOpenApiDocument(
  _routes: readonly DefinedRoute[],
  _info: { version: string },
): Record<string, unknown> {
  throw new Error("not implemented");
}

export function renderOpenApi(_doc: unknown): string {
  throw new Error("not implemented");
}

export function registerOpenApiRoute(_server: FastifyInstance, _opts: { version: string }): void {
  throw new Error("not implemented");
}
