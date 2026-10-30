import { fixedClock } from "../../../src/core/index.ts";
import { createPool } from "../../../src/db/index.ts";
import { provisionTenantIdp } from "../../../src/identity/index.ts";
import { decodeJwt } from "../fake-oidc/index.ts";
import type { FakeOidc } from "../fake-oidc/index.ts";
import { TENANT_B_ID } from "../tenants.ts";
import { E2E_TENANT_NAME, databaseApi } from "./database-part.ts";
import { oidcApi } from "./oidc-part.ts";
import { E2eStackError } from "./part.ts";
import type { E2eStackPart, PartContext, PartHandle } from "./part.ts";

export const TENANT_B_NAME: string = "Tenant B";

export const TENANT_B_ORGANIZATION: string = "org-b";

export type SeedUser = Readonly<{
  username: string;
  password: string;
  displayName: string;
  tenantName: string;
}>;

const SEED_USERNAMES = ["alice", "bob", "carol", "mallory"] as const;
const TENANT_B_CLOCK = "2026-01-01T00:00:00.000Z";
const POOL_APPLICATION_NAME = "e2e-tenant-b";
const INSERT_TENANT =
  "INSERT INTO ursitoare.tenant (tenant_id, name, review_profile) VALUES ($1, $2, 'solo') ON CONFLICT (tenant_id) DO NOTHING";

function displayNameOf(fake: Pick<FakeOidc, "passwordOf" | "mintToken">, username: string): string {
  const payload = decodeJwt(fake.mintToken({ user: username, kind: "id" })).payload;
  const name = payload["name"];
  if (typeof name !== "string" || name.length === 0) {
    throw new E2eStackError("STACK_PART_INVALID", "the fake's id token carries no name claim", {
      part: "tenant-b",
      user: username,
    });
  }
  return name;
}

export function seedUsersOf(
  fake: Pick<FakeOidc, "passwordOf" | "mintToken">,
): Record<string, SeedUser> {
  const users: Record<string, SeedUser> = {};
  for (const username of SEED_USERNAMES) {
    users[username] = {
      username,
      password: fake.passwordOf(username),
      displayName: displayNameOf(fake, username),
      tenantName: username === "mallory" ? TENANT_B_NAME : E2E_TENANT_NAME,
    };
  }
  return users;
}

function ownerUrlOf(context: PartContext): string {
  const handle = context.handles.get("database");
  if (handle === undefined) {
    throw new E2eStackError("STACK_PART_MISSING", "the database part has not started", {
      part: "database",
    });
  }
  const api = handle.api as { ownerUrl?: unknown } | undefined;
  if (api !== undefined && typeof api.ownerUrl === "string") {
    return api.ownerUrl;
  }
  return databaseApi(context.handles).ownerUrl;
}

async function start(context: PartContext): Promise<PartHandle> {
  databaseApi(context.handles);
  const fake = oidcApi(context.handles).fake;
  return {
    env: {},
    api: {
      seedData: (): { users: Record<string, SeedUser> } => ({ users: seedUsersOf(fake) }),
    },
    close: async (): Promise<void> => {},
  };
}

async function seed(context: PartContext): Promise<void> {
  const fake = oidcApi(context.handles).fake;
  const pool = createPool(ownerUrlOf(context), {
    max: 1,
    applicationName: POOL_APPLICATION_NAME,
  });
  try {
    await pool.query(INSERT_TENANT, [TENANT_B_ID, TENANT_B_NAME]);
    await provisionTenantIdp(
      pool,
      { tenantId: TENANT_B_ID, reviewProfile: "solo" },
      { issuer: fake.issuer, organization: TENANT_B_ORGANIZATION },
      { clock: fixedClock(TENANT_B_CLOCK) },
    );
  } finally {
    await pool.end();
  }
}

export const tenantBPart: E2eStackPart = {
  name: "tenant-b",
  start,
  seed,
};
