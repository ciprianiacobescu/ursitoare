// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { EndpointLike } from "../../../src/db/index.ts";
import type { E2eStackPart } from "../e2e-stack/part.ts";

export interface CrashCluster {
  readonly env: Readonly<Record<string, string>>;
  readonly ownerUrl: string;
  readonly appEndpoint: EndpointLike;
  readonly dataDir: string;
}

export async function startCrashCluster(
  _parts: readonly E2eStackPart[],
): Promise<{ cluster: CrashCluster; close(): Promise<void> }> {
  throw new Error("not implemented");
}

export async function withDedicatedCluster<T>(
  _fn: (cluster: CrashCluster) => Promise<T>,
): Promise<T> {
  throw new Error("not implemented");
}
