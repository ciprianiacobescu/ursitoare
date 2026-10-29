import { promises as fs } from "node:fs";
import path from "node:path";

import { createPool } from "../../../src/db/index.ts";
import { provisionTenantIdp } from "../../../src/identity/index.ts";
import { ensureDefaultTenant } from "../../../src/tenancy/index.ts";
import { startFakeOidc } from "../fake-oidc/index.ts";
import type { FakeOidc } from "../fake-oidc/index.ts";
import { E2E_TENANT_NAME, databaseApi } from "./database-part.ts";
import { E2eStackError } from "./part.ts";
import type { E2eStackPart, PartContext, PartHandle } from "./part.ts";

const CLIENT_ID = "ursitoare-engine";
const SECRET_FILE = "client-secret";
const ORGANIZATION = "org-a";
const FILE_MODE = 0o600;
const DIRECTORY_MODE = 0o700;

interface OidcState {
  fake: FakeOidc;
  closed: boolean;
}

const states = new WeakMap<PartHandle, OidcState>();
const startedFor = new WeakMap<object, FakeOidc>();

function missing(): E2eStackError {
  return new E2eStackError("STACK_PART_MISSING", "the oidc part has not started", {
    part: "oidc",
  });
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
  const fake = await startFakeOidc();
  try {
    fake.registerRedirect(`${context.engineOrigin}/auth/oidc/callback`);
    fake.registerRedirect(`${context.engineOrigin}/sign-in`, { postLogout: true });

    await fs.mkdir(context.dataDir, { recursive: true, mode: DIRECTORY_MODE });
    const secretFile = path.join(context.dataDir, SECRET_FILE);
    await fs.writeFile(secretFile, fake.clientSecret(CLIENT_ID), { mode: FILE_MODE });
    await fs.chmod(secretFile, FILE_MODE);

    const state: OidcState = { fake, closed: false };
    const handle: PartHandle = {
      env: {
        URSITOARE_OIDC_ISSUER: fake.issuer,
        URSITOARE_OIDC_CLIENT_SECRET_FILE: secretFile,
      },
      api: { fake },
      close: async (): Promise<void> => {
        if (state.closed) {
          return;
        }
        state.closed = true;
        await fake.close();
      },
    };
    states.set(handle, state);
    startedFor.set(context.handles, fake);
    return handle;
  } catch (error) {
    await fake.close().catch(() => undefined);
    throw error;
  }
}

async function seed(context: PartContext): Promise<void> {
  const fake = oidcApi(context.handles).fake;
  const pool = createPool(ownerUrlOf(context), { max: 1 });
  try {
    const tenant = await ensureDefaultTenant(pool, E2E_TENANT_NAME);
    await provisionTenantIdp(pool, tenant, {
      issuer: fake.issuer,
      organization: ORGANIZATION,
    });
  } finally {
    await pool.end();
  }
}

export const oidcPart: E2eStackPart = {
  name: "oidc",
  start,
  seed,
};

export function oidcApi(handles: ReadonlyMap<string, PartHandle>): { fake: FakeOidc } {
  const direct = handles.get("oidc");
  const state = direct === undefined ? undefined : states.get(direct);
  if (state !== undefined) {
    return { fake: state.fake };
  }
  const remembered = startedFor.get(handles);
  if (remembered !== undefined) {
    return { fake: remembered };
  }
  throw missing();
}
