// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyInstance } from "fastify";

import type { PublicReason } from "./route.ts";

export async function definePublicRoutes(
  _server: FastifyInstance,
  _reason: PublicReason,
  _register: (s: FastifyInstance) => unknown,
): Promise<void> {
  throw new Error("not implemented");
}
