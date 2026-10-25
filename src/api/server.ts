// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { FastifyInstance } from "fastify";

import type { IdSource } from "../core/index.ts";
import type { Logger, Tracer } from "../observability/index.ts";
import type { HealthRegistry } from "./health.ts";

export interface ServerDeps {
  readonly version: string;
  readonly ids: IdSource;
  readonly logger: Logger;
  readonly tracer: Tracer;
  readonly health?: HealthRegistry;
  readonly healthCheckTimeoutMs?: number;
}

export function buildServer(_deps: ServerDeps): Promise<FastifyInstance> {
  throw new Error("not implemented");
}
