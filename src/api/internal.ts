import type { FastifyInstance } from "fastify";

import { systemClock } from "../core/index.ts";
import { installPep } from "./pep.ts";
import type { PepDeps } from "./pep.ts";
import { buildServer } from "./server.ts";
import type { ServerDeps } from "./server.ts";

export async function buildInternalServer(
  deps: ServerDeps & { pep?: PepDeps | null },
): Promise<FastifyInstance> {
  const server = await buildServer({ ...deps, listener: "internal" });
  installPep(
    server,
    deps.pep ?? {
      pool: null,
      engine: null,
      clock: systemClock,
      publicBaseUrl: "http://127.0.0.1",
    },
  );
  return server;
}
