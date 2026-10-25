// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { E2eStackPart, PartHandle } from "./part.ts";

export const E2E_DATABASE: string = "";

export const E2E_TEMPLATE: string = "";

export const E2E_TENANT_NAME: string = "";

export type DatabaseApi = Readonly<{ host: "127.0.0.1"; port: number; database: string; ownerUrl: string }>;

export function databaseApi(_handles: ReadonlyMap<string, PartHandle>): DatabaseApi {
  throw new Error("not implemented");
}

export const databasePart: E2eStackPart = {
  name: "database",
  start(): Promise<PartHandle> {
    throw new Error("not implemented");
  },
  seed(): Promise<void> {
    throw new Error("not implemented");
  },
};
