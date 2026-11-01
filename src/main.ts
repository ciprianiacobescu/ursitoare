import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { FastifyInstance } from "fastify";
import pino from "pino";

import type { HealthRegistry, PepDeps, SignalSource } from "./api/index.ts";
import {
  buildInternalServer,
  buildServer,
  createHealthRegistry,
  DEFAULT_WEB_DIST,
  definePublicRoutes,
  installGracefulShutdown,
  installPep,
  isWebBuilt,
  listDefinedRoutes,
  registerAdminRoutes,
  registerAuditRoutes,
  registerBlockRoutes,
  registerMeRoute,
  registerOpenApiRoute,
  registerWebApp,
} from "./api/index.ts";
import type { AppConfig } from "./config/index.ts";
import { ConfigError, loadConfigFromProcess, parseInternalPort } from "./config/index.ts";
import { systemClock, systemIds } from "./core/index.ts";
import type { Database } from "./db/index.ts";
import { openDatabase } from "./db/index.ts";
import { registerOidcRoutes } from "./identity/index.ts";
import type { LogDestination, Logger } from "./observability/index.ts";
import { createLogger, noopTracer } from "./observability/index.ts";
import { createPolicyEngine, defaultSrcDir } from "./pdp/index.ts";

export const VERSION = "0.0.0";

export interface RunningServer {
  url: string;
  close(): Promise<void>;
}

function formatHost(host: string): string {
  return host.includes(":") ? `[${host}]` : host;
}

async function listen(server: FastifyInstance, port: number, host: string): Promise<number> {
  await server.listen({ port, host });
  const address = server.server.address();
  if (address === null || typeof address === "string") {
    return port;
  }
  return address.port;
}

function fatalFields(error: unknown): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const code = (error as { code?: unknown } | null)?.code;
  fields["code"] = typeof code === "string" ? code : "STARTUP_FAILED";
  if (error instanceof ConfigError) {
    fields["variable"] = error.variable;
  }
  const reason = (error as { details?: { reason?: unknown } } | null)?.details?.reason;
  if (typeof reason === "string") {
    fields["reason"] = reason;
  }
  return fields;
}

function fatalMessage(error: unknown): string {
  if (error instanceof ConfigError) {
    return `startup failed: ${error.message}`;
  }
  return "startup failed";
}

export function startServer(port: number, host = "127.0.0.1"): Promise<RunningServer> {
  return (async () => {
    const logger = createLogger({ level: "silent" });
    const server = await buildServer({
      version: VERSION,
      ids: systemIds,
      logger,
      tracer: noopTracer,
    });
    try {
      const bound = await listen(server, port, host);
      return {
        url: `http://${formatHost(host)}:${bound}`,
        close: async () => {
          await server.close();
        },
      };
    } catch (error) {
      await server.close().catch(() => undefined);
      throw error;
    }
  })();
}

// Signature of the composition root. The optional members belong to later units: openDatabase
// (add-db-foundation), configureServer (add-e2e-stack); main keeps and ignores them.
export interface MainDeps {
  loadConfig: () => AppConfig;
  destination: LogDestination;
  signals: SignalSource;
  exit: (code: number) => void;
  openDatabase?: typeof openDatabase;
  configureServer?: (server: FastifyInstance) => void | Promise<void>;
  inspectServers?: (s: {
    public: FastifyInstance;
    internal: FastifyInstance;
  }) => void | Promise<void>;
}

export async function main(deps: Partial<MainDeps> = {}): Promise<RunningServer | null> {
  const destination = deps.destination ?? pino.destination(1);
  const bootstrap: Logger = createLogger({ level: "error", destination });
  const loadConfig = deps.loadConfig ?? loadConfigFromProcess;
  const signals = deps.signals ?? process;
  const exit = deps.exit ?? process.exit;

  let config: AppConfig;
  try {
    config = loadConfig();
  } catch (error) {
    bootstrap.fatal(fatalFields(error), fatalMessage(error));
    exit(1);
    return null;
  }

  const logger = createLogger({ level: config.logLevel, destination });
  const health: HealthRegistry = createHealthRegistry();

  let database: Database | null;
  try {
    database = await (deps.openDatabase ?? openDatabase)(config, { health, logger });
  } catch (error) {
    bootstrap.fatal(fatalFields(error), fatalMessage(error));
    exit(1);
    return null;
  }

  let server: FastifyInstance;
  try {
    server = await buildServer({
      version: VERSION,
      ids: systemIds,
      logger,
      tracer: noopTracer,
      health,
    });
  } catch (error) {
    await database?.close().catch(() => undefined);
    bootstrap.fatal(fatalFields(error), fatalMessage(error));
    exit(1);
    return null;
  }

  const distDir = resolve(config.webDist ?? DEFAULT_WEB_DIST);
  try {
    registerWebApp(server, { distDir });
  } catch (error) {
    await server.close().catch(() => undefined);
    await database?.close().catch(() => undefined);
    const code = (error as { code?: unknown } | null)?.code;
    bootstrap.fatal(
      { code: typeof code === "string" ? code : "STARTUP_FAILED" },
      "startup failed",
    );
    exit(1);
    return null;
  }

  if (!(await isWebBuilt(distDir))) {
    logger.warn(
      { code: "WEB_NOT_BUILT" },
      "web app is not built; run pnpm run build or set URSITOARE_WEB_DIST",
    );
  }

  if (deps.configureServer !== undefined) {
    try {
      await deps.configureServer(server);
    } catch (error) {
      await server.close().catch(() => undefined);
      await database?.close().catch(() => undefined);
      const code = (error as { code?: unknown } | null)?.code;
      bootstrap.fatal(
        { code: typeof code === "string" ? code : "SERVER_HOOK_FAILED" },
        "startup failed",
      );
      exit(1);
      return null;
    }
  }

  let internal: FastifyInstance | undefined;
  try {
    const engine = database
      ? await createPolicyEngine({ srcDir: defaultSrcDir(), clock: systemClock, ids: systemIds, logger })
      : null;
    const pep: PepDeps = {
      pool: database?.appPool ?? null,
      engine,
      clock: systemClock,
      publicBaseUrl: config.publicBaseUrl,
    };
    installPep(server, pep);
    registerMeRoute(server, pep);
    registerAdminRoutes(server, {
      pool: pep.pool,
      clock: pep.clock,
      ids: systemIds,
      engineKey: config.engineKey,
    });
    registerAuditRoutes(server, {
      pool: pep.pool,
      clock: pep.clock,
      engineKey: config.engineKey,
    });
    registerBlockRoutes(server, { pool: pep.pool, engineKey: config.engineKey });
    registerOpenApiRoute(server, { version: VERSION });
    await definePublicRoutes(server, "oidc", (scoped) =>
      registerOidcRoutes(scoped, {
        config: config.oidc ?? null,
        publicBaseUrl: config.publicBaseUrl,
        pool: database?.appPool ?? null,
        engineKey: config.engineKey,
        clock: systemClock,
      }),
    );
    internal = await buildInternalServer({
      version: VERSION,
      ids: systemIds,
      logger,
      tracer: noopTracer,
      pep,
    });
    await deps.inspectServers?.({ public: server, internal });
  } catch (error) {
    await internal?.close().catch(() => undefined);
    await server.close().catch(() => undefined);
    await database?.close().catch(() => undefined);
    bootstrap.fatal(fatalFields(error), fatalMessage(error));
    exit(1);
    return null;
  }

  const closeAll = async (): Promise<void> => {
    await server.close().catch(() => undefined);
    await internal?.close().catch(() => undefined);
    await database?.close().catch(() => undefined);
  };

  let bound: number;
  try {
    bound = await listen(server, config.port, config.host);
  } catch (error) {
    await closeAll();
    bootstrap.fatal(
      { ...fatalFields(error), host: config.host, port: config.port },
      "startup failed",
    );
    exit(1);
    return null;
  }

  const internalPort = config.internalPort ?? parseInternalPort({}, config.port);
  if (listDefinedRoutes(internal).length > 0) {
    let internalBound: number;
    try {
      internalBound = await listen(internal, internalPort, config.host);
    } catch (error) {
      await closeAll();
      bootstrap.fatal(
        { ...fatalFields(error), host: config.host, port: internalPort },
        "startup failed",
      );
      exit(1);
      return null;
    }
    logger.info(
      { role: config.role, host: config.host, port: internalBound },
      "internal listener listening",
    );
  }

  const url = `http://${formatHost(config.host)}:${bound}`;
  logger.info({ url, role: config.role, host: config.host, port: bound }, "ursitoare listening");

  installGracefulShutdown({
    close: closeAll,
    drainTimeoutMs: config.shutdownDrainMs,
    exit,
    logger,
    signals,
  });

  return {
    url,
    close: closeAll,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
