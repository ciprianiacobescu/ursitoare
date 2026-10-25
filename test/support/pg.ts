// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type pg from "pg";

import type { EndpointLike } from "../../src/db/index.ts";

export class TestClusterError extends Error {
  code: string;
  dataDir?: string;
  constructor(_code: string, _message: string, _dataDir?: string) {
    super();
    throw new Error("not implemented");
  }
}

export interface Cluster {
  host: string;
  port: number;
  dataDir: string;
  adminUrl: string;
  stop(): Promise<void>;
}

export function freePort(): Promise<number> {
  throw new Error("not implemented");
}

export function startCluster(_opts?: { port?: number }): Promise<Cluster> {
  throw new Error("not implemented");
}

export interface TestCluster {
  host: string;
  port: number;
  adminUrl: string;
  ownerPassword: string;
  appPassword: string;
  template: string;
}

export function readTestCluster(_env?: Record<string, string | undefined>): TestCluster {
  throw new Error("not implemented");
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

export function withTestDatabase(_opts?: { migrated?: boolean; cluster?: TestCluster }): Promise<TestDatabase> {
  throw new Error("not implemented");
}
