// Node test-runner global setup (package.json `test` script: --test-global-setup).
// Starts the one embedded Postgres cluster of a `pnpm run test` run, bootstraps its
// roles, migrates a template database and publishes the coordinates in
// TEST_PG_CLUSTER. Test-support file: only a task that names it may change it.

import { randomBytes } from "node:crypto";

import type pg from "pg";

import { systemClock } from "../../src/core/index.ts";
import {
  ROLE_OWNER,
  createPool,
  ensureRoles,
  prepareDatabase,
} from "../../src/db/index.ts";
import { startCluster, type Cluster, type TestCluster } from "./pg.ts";

const TEMPLATE = "ursitoare_template";

let active: Cluster | undefined;

function randomPassword(): string {
  return randomBytes(16).toString("hex");
}

function roleUrl(cluster: Cluster, role: string, password: string, database: string): string {
  return `postgres://${role}:${password}@${cluster.host}:${cluster.port}/${database}`;
}

export async function globalSetup(): Promise<void> {
  const previous = active;
  active = undefined;
  if (previous !== undefined) {
    await previous.stop();
  }

  const cluster = await startCluster();
  try {
    const ownerPassword = randomPassword();
    const appPassword = randomPassword();

    const adminPool = createPool(cluster.adminUrl, { max: 2 });
    let ownerPool: pg.Pool | undefined;
    try {
      await ensureRoles(adminPool, { ownerPassword, appPassword });
      await adminPool.query(
        `CREATE DATABASE "${TEMPLATE}" OWNER "${ROLE_OWNER}" TEMPLATE template0`,
      );

      ownerPool = createPool(roleUrl(cluster, ROLE_OWNER, ownerPassword, TEMPLATE), { max: 2 });
      await prepareDatabase(ownerPool, systemClock);
    } finally {
      if (ownerPool !== undefined) {
        await ownerPool.end();
      }
      await adminPool.end();
    }

    const published: TestCluster = {
      host: cluster.host,
      port: cluster.port,
      adminUrl: cluster.adminUrl,
      ownerPassword,
      appPassword,
      template: TEMPLATE,
    };
    process.env.TEST_PG_CLUSTER = JSON.stringify(published);
    active = cluster;
  } catch (error) {
    await cluster.stop().catch(() => undefined);
    throw error;
  }
}

export async function globalTeardown(): Promise<void> {
  const cluster = active;
  active = undefined;
  delete process.env.TEST_PG_CLUSTER;
  if (cluster !== undefined) {
    await cluster.stop();
  }
}
