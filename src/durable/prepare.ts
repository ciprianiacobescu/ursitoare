import { DBOS } from "@dbos-inc/dbos-sdk";

import { ROLE_APP } from "../db/index.ts";
import { DurableError } from "./errors.ts";

export const DBOS_SCHEMA: string = "dbos";

const OWNER_SCHEMES = new Set(["postgres:", "postgresql:"]);

function badUrl(): never {
  throw new DurableError("DURABLE_INVALID", "invalid owner URL", { reason: "bad_url" });
}

function parseOwnerUrl(ownerUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(ownerUrl);
  } catch {
    badUrl();
  }
  if (!OWNER_SCHEMES.has(parsed.protocol)) {
    badUrl();
  }
  if (parsed.hostname === "" || parsed.pathname.replace(/^\//, "") === "") {
    badUrl();
  }
  return parsed;
}

function sqlState(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const candidate = error as { code?: unknown; severity?: unknown };
  if (typeof candidate.code === "string" && typeof candidate.severity === "string") {
    return candidate.code;
  }
  return undefined;
}

export async function prepareDurable(ownerUrl: string): Promise<void> {
  parseOwnerUrl(ownerUrl);

  try {
    await DBOS.migrate(ownerUrl, {
      schemaName: DBOS_SCHEMA,
      applicationRole: ROLE_APP,
    });
  } catch (error) {
    throw new DurableError("DURABLE_UNAVAILABLE", "the DBOS schema could not be prepared", {
      reason: sqlState(error) ?? "migrate_failed",
    });
  }
}
