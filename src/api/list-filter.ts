// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyRequest } from "fastify";

import type { SqlPredicate } from "./route.ts";

export function listPredicate(_r: FastifyRequest, _first: number): SqlPredicate {
  throw new Error("not implemented");
}
