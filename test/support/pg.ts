import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";

import { ROLE_APP, ROLE_OWNER, createPool, type EndpointLike } from "../../src/db/index.ts";

const TEST_PG_CLUSTER = "TEST_PG_CLUSTER";
const CLONE_ATTEMPTS = 5;
const CLONE_RETRY_BASE_MS = 50;
const TEMPLATE_DATABASE = "template0";

export class TestClusterError extends Error {
  code: string;
  dataDir?: string;

  constructor(code: string, message: string, dataDir?: string) {
    super(message);
    this.name = "TestClusterError";
    this.code = code;
    if (dataDir !== undefined) {
      this.dataDir = dataDir;
    }
  }
}

export interface Cluster {
  host: string;
  port: number;
  dataDir: string;
  adminUrl: string;
  stop(): Promise<void>;
}

function noop(): void {
  // The embedded cluster must not write to the console from inside the gate.
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

// The e2e stack's engine and control defaults (test/support/e2e-stack/stack.ts): a free-port pick must never hand
// them to an embedded cluster or another test server, which would take them before the stack binds.
const RESERVED_PORTS: ReadonlySet<number> = new Set([39080, 39081]);

export function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const attempt = (): void => {
      const server = createServer();
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (address === null || typeof address === "string") {
          server.close(() => {
            reject(new Error("could not reserve a loopback port"));
          });
          return;
        }
        const port = address.port;
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          if (RESERVED_PORTS.has(port)) {
            attempt();
            return;
          }
          resolve(port);
        });
      });
    };
    attempt();
  });
}

function adminUrl(port: number, password: string): string {
  return `postgres://postgres:${password}@127.0.0.1:${port}/postgres`;
}

function forgetProcess(embedded: EmbeddedPostgres): void {
  // embedded-postgres cannot stop a child that exited before start() rejected:
  // its stop() would await an `exit` event that already fired. Clearing the
  // reference lets the exit hook return instead of hanging the test process.
  (embedded as unknown as { process?: unknown }).process = undefined;
}

export async function startCluster(opts?: { port?: number }): Promise<Cluster> {
  const dataDir = await mkdtemp(join(tmpdir(), "ursitoare-pg-"));
  const port = opts?.port ?? (await freePort());
  const password = randomBytes(16).toString("hex");

  const embedded = new EmbeddedPostgres({
    databaseDir: dataDir,
    port,
    user: "postgres",
    password,
    authMethod: "scram-sha-256",
    persistent: false,
    postgresFlags: [
      "-c",
      "fsync=off",
      "-c",
      "synchronous_commit=off",
      "-c",
      "full_page_writes=off",
      "-c",
      "max_connections=300",
      "-c",
      "listen_addresses=127.0.0.1",
    ],
    onLog: noop,
    onError: noop,
  });

  try {
    await embedded.initialise();
    await embedded.start();
  } catch (error) {
    forgetProcess(embedded);
    await rm(dataDir, { recursive: true, force: true });
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new TestClusterError(
      "TEST_CLUSTER_START_FAILED",
      `could not start the embedded Postgres on port ${port}${detail}`,
      dataDir,
    );
  }

  let stopped = false;
  return {
    host: "127.0.0.1",
    port,
    dataDir,
    adminUrl: adminUrl(port, password),
    stop: async () => {
      if (stopped) {
        return;
      }
      stopped = true;
      await embedded.stop();
    },
  };
}

export interface TestCluster {
  host: string;
  port: number;
  adminUrl: string;
  ownerPassword: string;
  appPassword: string;
  template: string;
}

function missingCluster(): TestClusterError {
  return new TestClusterError(
    "TEST_CLUSTER_MISSING",
    `TEST_PG_CLUSTER is not set; run the tests with \`pnpm run test\``,
  );
}

export function readTestCluster(env: Record<string, string | undefined> = process.env): TestCluster {
  const raw = env[TEST_PG_CLUSTER];
  if (raw === undefined || raw === "") {
    throw missingCluster();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw missingCluster();
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw missingCluster();
  }

  const cluster = parsed as Partial<Record<keyof TestCluster, unknown>>;
  if (
    typeof cluster.host !== "string" ||
    typeof cluster.port !== "number" ||
    typeof cluster.adminUrl !== "string" ||
    typeof cluster.ownerPassword !== "string" ||
    typeof cluster.appPassword !== "string" ||
    typeof cluster.template !== "string"
  ) {
    throw missingCluster();
  }

  return {
    host: cluster.host,
    port: cluster.port,
    adminUrl: cluster.adminUrl,
    ownerPassword: cluster.ownerPassword,
    appPassword: cluster.appPassword,
    template: cluster.template,
  };
}

export interface TestDatabase {
  name: string;
  ownerUrl: string;
  appUrl: string;
  ownerEndpoint: EndpointLike;
  appEndpoint: EndpointLike;
  ownerPool: pg.Pool;
  appPool: pg.Pool;
  close(): Promise<void>;
}

function roleUrl(
  cluster: TestCluster,
  role: string,
  password: string | null,
  database: string,
): string {
  const credentials = password === null ? role : `${role}:${password}`;
  return `postgres://${credentials}@${cluster.host}:${cluster.port}/${database}`;
}

function endpoint(url: string, password: string): EndpointLike {
  return { url, password: { reveal: () => password } };
}

function sqlState(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") {
      return code;
    }
  }
  return undefined;
}

async function createDatabase(
  cluster: TestCluster,
  name: string,
  template: string,
): Promise<void> {
  let attempt = 0;
  for (;;) {
    attempt += 1;
    const client = new pg.Client({ connectionString: cluster.adminUrl });
    try {
      await client.connect();
      await client.query(
        `CREATE DATABASE "${name}" OWNER "${ROLE_OWNER}" TEMPLATE "${template}"`,
      );
      return;
    } catch (error) {
      const retryable = sqlState(error) === "55006" && attempt < CLONE_ATTEMPTS;
      if (!retryable) {
        throw error;
      }
      await delay(CLONE_RETRY_BASE_MS * attempt);
    } finally {
      await client.end().catch(() => undefined);
    }
  }
}

async function dropDatabase(cluster: TestCluster, name: string): Promise<void> {
  const client = new pg.Client({ connectionString: cluster.adminUrl });
  try {
    await client.connect();
    await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function withTestDatabase(opts?: {
  migrated?: boolean;
  cluster?: TestCluster;
}): Promise<TestDatabase> {
  const cluster = opts?.cluster ?? readTestCluster();
  const name = `t_${randomBytes(12).toString("hex")}`;
  const migrated = opts?.migrated ?? true;
  const template = migrated ? cluster.template : TEMPLATE_DATABASE;

  await createDatabase(cluster, name, template);

  const ownerEndpoint = endpoint(roleUrl(cluster, ROLE_OWNER, null, name), cluster.ownerPassword);
  const appEndpoint = endpoint(roleUrl(cluster, ROLE_APP, null, name), cluster.appPassword);

  const ownerPool = createPool(ownerEndpoint, { max: 2, idleTimeoutMs: 2000 });
  const appPool = createPool(appEndpoint, { max: 4, idleTimeoutMs: 2000 });

  let closed = false;
  return {
    name,
    ownerUrl: roleUrl(cluster, ROLE_OWNER, cluster.ownerPassword, name),
    appUrl: roleUrl(cluster, ROLE_APP, cluster.appPassword, name),
    ownerEndpoint,
    appEndpoint,
    ownerPool,
    appPool,
    close: async () => {
      if (closed) {
        return;
      }
      closed = true;
      try {
        await Promise.all([ownerPool.end(), appPool.end()]);
      } finally {
        await dropDatabase(cluster, name);
      }
    },
  };
}
