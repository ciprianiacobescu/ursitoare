// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyInstance } from "fastify";

import type { PepDeps } from "./pep.ts";
import type { ServerDeps } from "./server.ts";

export async function buildInternalServer(
  _deps: ServerDeps & { pep?: PepDeps | null },
): Promise<FastifyInstance> {
  throw new Error("not implemented");
}
