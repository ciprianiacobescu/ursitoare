// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type pg from "pg";

export interface EndpointLike {
  url: string;
  password: { reveal(): string } | null;
}

export interface PoolOptions {
  max?: number;
  connectionTimeoutMs?: number;
  idleTimeoutMs?: number;
  statementTimeoutMs?: number;
  applicationName?: string;
  onError?: (err: Error) => void;
}

export function createPool(_source: string | EndpointLike, _opts?: PoolOptions): pg.Pool {
  throw new Error("not implemented");
}
