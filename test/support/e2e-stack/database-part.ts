import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import type pg from "pg";

import { fixedClock, sequentialIds, systemClock } from "../../../src/core/index.ts";
import {
  createPool,
  ensureRoles,
  prepareDatabase,
  ROLE_APP,
  ROLE_OWNER,
} from "../../../src/db/index.ts";
import { ensureDefaultTenant } from "../../../src/tenancy/index.ts";
import { startCluster, type Cluster } from "../pg.ts";
import { E2eStackError } from "./part.ts";
import type { E2eStackPart, PartContext, PartHandle } from "./part.ts";

export const E2E_DATABASE: string = "ursitoare_e2e";

export const E2E_TEMPLATE: string = "ursitoare_e2e_template";

export const E2E_TENANT_NAME: string = "E2E tenant";

const E2E_PASSWORD_FILE = "app-password";
const E2E_APPLICATION_NAME = "e2e-stack";
const E2E_TENANT_CLOCK = "2026-01-01T00:00:00.000Z";

export type DatabaseApi = Readonly<{ host: "127.0.0.1"; port: number; database: string; ownerUrl: string }>;

interface DatabaseState {
  cluster: Cluster;
  adminPool: pg.Pool;
  ownerUrl: string;
  closed: boolean;
}

const states = new WeakMap<PartHandle, DatabaseState>();

function roleUrl(cluster: Cluster, role: string, password: string | null, database: string): string {
  const credentials = password === null ? role : `${role}:${password}`;
  return `postgres://${credentials}@${cluster.host}:${cluster.port}/${database}`;
}

function missing(): E2eStackError {
  return new E2eStackError("STACK_PART_MISSING", "the database part has not started", {
    part: "database",
  });
}

function stateOf(handles: ReadonlyMap<string, PartHandle>): DatabaseState {
  const handle = handles.get("database");
  const state = handle === undefined ? undefined : states.get(handle);
  if (state === undefined) {
    throw missing();
  }
  return state;
}

export function databaseApi(handles: ReadonlyMap<string, PartHandle>): DatabaseApi {
  const state = stateOf(handles);
  return {
    host: "127.0.0.1",
    port: state.cluster.port,
    database: E2E_DATABASE,
    ownerUrl: state.ownerUrl,
  };
}

async function removeCluster(cluster: Cluster): Promise<void> {
  await fs.rm(cluster.dataDir, { recursive: true, force: true }).catch(() => undefined);
}

async function start(context: PartContext): Promise<PartHandle> {
  const cluster = await startCluster();
  const ownerPassword = randomBytes(24).toString("hex");
  const appPassword = randomBytes(24).toString("hex");
  const adminPool = createPool(cluster.adminUrl, {
    applicationName: E2E_APPLICATION_NAME,
    max: 4,
  });

  try {
    await ensureRoles(adminPool, { ownerPassword, appPassword });
    await adminPool.query(`CREATE DATABASE "${E2E_TEMPLATE}" OWNER ${ROLE_OWNER}`);

    const templatePool = createPool(
      roleUrl(cluster, ROLE_OWNER, ownerPassword, E2E_TEMPLATE),
      { applicationName: E2E_APPLICATION_NAME, max: 1 },
    );
    try {
      await prepareDatabase(templatePool, systemClock);
    } finally {
      await templatePool.end();
    }

    const passwordFile = path.join(context.dataDir, E2E_PASSWORD_FILE);
    await fs.writeFile(passwordFile, `${appPassword}\n`, { mode: 0o600 });
    await fs.chmod(passwordFile, 0o600);

    const ownerUrl = roleUrl(cluster, ROLE_OWNER, ownerPassword, E2E_DATABASE);
    const state: DatabaseState = { cluster, adminPool, ownerUrl, closed: false };
    const handle: PartHandle = {
      env: {
        URSITOARE_DATABASE_URL: roleUrl(cluster, ROLE_APP, null, E2E_DATABASE),
        URSITOARE_DATABASE_PASSWORD_FILE: passwordFile,
      },
      api: {
        host: "127.0.0.1",
        port: cluster.port,
        database: E2E_DATABASE,
        ownerUrl,
      },
      close: async (): Promise<void> => {
        if (state.closed) {
          return;
        }
        state.closed = true;
        try {
          await adminPool.end();
        } finally {
          try {
            await cluster.stop();
          } finally {
            await removeCluster(cluster);
          }
        }
      },
    };
    states.set(handle, state);
    return handle;
  } catch (error) {
    await adminPool.end().catch(() => undefined);
    await cluster.stop().catch(() => undefined);
    await removeCluster(cluster);
    throw error;
  }
}

async function seed(context: PartContext): Promise<void> {
  const state = stateOf(context.handles);
  if (state.closed) {
    throw new E2eStackError("STACK_PART_MISSING", "the database part has been closed", {
      part: "database",
    });
  }

  await state.adminPool.query(`DROP DATABASE IF EXISTS "${E2E_DATABASE}" WITH (FORCE)`);
  await state.adminPool.query(
    `CREATE DATABASE "${E2E_DATABASE}" OWNER ${ROLE_OWNER} TEMPLATE "${E2E_TEMPLATE}"`,
  );

  const ownerPool = createPool(state.ownerUrl, {
    applicationName: E2E_APPLICATION_NAME,
    max: 1,
  });
  try {
    await ensureDefaultTenant(ownerPool, E2E_TENANT_NAME, {
      ids: sequentialIds(1),
      clock: fixedClock(E2E_TENANT_CLOCK),
    });
  } finally {
    await ownerPool.end();
  }
}

export const databasePart: E2eStackPart = {
  name: "database",
  start,
  seed,
};
