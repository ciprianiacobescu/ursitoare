import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import { loadConfig } from "../../../src/config/index.ts";
import { resolveTenantForToken } from "../../../src/identity/index.ts";
import { ensureDefaultTenant } from "../../../src/tenancy/index.ts";

import { E2E_TENANT_NAME } from "./database-part.ts";
import { PARTS_DIR, discoverParts } from "./discover.ts";
import type { PartContext, PartHandle } from "./part.ts";
import { E2eStackError } from "./part.ts";
import { oidcApi, oidcPart } from "./oidc-part.ts";
import type { FakeOidc } from "../fake-oidc/index.ts";
import { completeFakeLogin } from "../oidc-login.ts";
import { withTestDatabase, type TestDatabase } from "../pg.ts";

const ENGINE_ORIGIN = "http://127.0.0.1:39080";
const CONTROL_ORIGIN = "http://127.0.0.1:39081";
const ENGINE_CALLBACK = "http://127.0.0.1:39080/auth/oidc/callback";
const CLIENT_ID = "ursitoare-engine";
const tempRoots: string[] = [];

after(() => {
  for (const dir of tempRoots) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // The part may already have removed its own directories.
    }
  }
});

function tempRoot(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "e2e-oidc-part-"));
  tempRoots.push(dir);
  return dir;
}

async function must<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    assert.fail(`expected the call to resolve: ${String(error)}`);
  }
}

function thrown(call: () => unknown): unknown {
  try {
    call();
  } catch (error) {
    return error;
  }
  assert.fail("expected the call to throw");
}

function fakeOf(handles: ReadonlyMap<string, PartHandle>): FakeOidc {
  try {
    return oidcApi(handles).fake;
  } catch (error) {
    assert.fail(`oidcApi returns the fake of the started part: ${String(error)}`);
  }
}

function configOf(env: Record<string, string>): ReturnType<typeof loadConfig> {
  try {
    return loadConfig(env);
  } catch (error) {
    assert.fail(`loadConfig accepts the part environment: ${String(error)}`);
  }
}

function contextFor(dataDir: string, handles: ReadonlyMap<string, PartHandle>): PartContext {
  return {
    name: "oidc",
    dataDir,
    engineOrigin: ENGINE_ORIGIN,
    controlOrigin: CONTROL_ORIGIN,
    env: {},
    handles,
  };
}

function databaseHandleOf(db: TestDatabase): PartHandle {
  const url = new URL(db.ownerUrl);
  const port = Number(url.port);
  assert.ok(port > 0, "the owner URL names the cluster port");
  return {
    env: {},
    api: { host: "127.0.0.1", port, database: db.name, ownerUrl: db.ownerUrl },
    close: async (): Promise<void> => {
      // The database part owns the cluster; the test closes it itself.
    },
  };
}

async function writeEngineKey(dir: string): Promise<string> {
  const file = path.join(dir, "engine-key");
  await writeFile(file, randomBytes(32).toString("hex"), { mode: 0o600 });
  return file;
}

async function writeAppPassword(db: TestDatabase, dir: string): Promise<string> {
  const file = path.join(dir, "database-password");
  await writeFile(file, db.appEndpoint.password?.reveal() ?? "", { mode: 0o600 });
  return file;
}

function bootEnv(
  handle: PartHandle,
  db: TestDatabase,
  engineKeyFile: string,
  passwordFile: string,
): Record<string, string> {
  return {
    ...handle.env,
    URSITOARE_PUBLIC_BASE_URL: ENGINE_ORIGIN,
    URSITOARE_DATABASE_URL: db.appEndpoint.url,
    URSITOARE_DATABASE_PASSWORD_FILE: passwordFile,
    URSITOARE_ENGINE_KEY_FILE: engineKeyFile,
  };
}

function authorizationUrl(fake: FakeOidc, verifier: string): string {
  const challenge = createHash("sha256").update(verifier, "utf8").digest("base64url");
  const url = new URL(`${fake.issuer}/protocol/openid-connect/auth`);
  url.search = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: ENGINE_CALLBACK,
    response_type: "code",
    scope: "openid profile email organization",
    state: randomBytes(32).toString("base64url"),
    nonce: randomBytes(32).toString("base64url"),
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

test("C-f8d77e43 the oidc part starts seeds the default tenant and closes", async () => {
  const root = tempRoot();
  const filesDir = mkdtempSync(path.join(os.tmpdir(), "e2e-oidc-config-"));
  const dataDir = path.join(root, "oidc");
  mkdirSync(dataDir, { recursive: true });

  let cleanup: TestDatabase | undefined;
  let started: PartHandle | undefined;
  try {
    const db = await withTestDatabase();
    cleanup = db;
    const database = databaseHandleOf(db);
    const handles = new Map<string, PartHandle>([["database", database]]);
    const seedContext = contextFor(dataDir, handles);

    const handle = await must(() => oidcPart.start(seedContext));
    started = handle;
    assert.equal(oidcPart.name, "oidc", "the part is named oidc");

    const fake = fakeOf(handles);

    assert.equal(handle.env.URSITOARE_OIDC_ISSUER, fake.issuer, "the env names the fake issuer");
    const secretPath = handle.env.URSITOARE_OIDC_CLIENT_SECRET_FILE;
    assert.ok(typeof secretPath === "string", "the env names the client secret file");
    assert.equal(statSync(secretPath).mode & 0o777, 0o600, "the secret file has mode 0600");
    const secret = readFileSync(secretPath, "utf8");
    assert.equal(secret, fake.clientSecret(CLIENT_ID), "the secret file holds the client secret");

    const engineKeyFile = await writeEngineKey(filesDir);
    const passwordFile = await writeAppPassword(db, filesDir);
    const config = configOf(bootEnv(handle, db, engineKeyFile, passwordFile));
    assert.equal(config.oidc?.issuer, fake.issuer, "loadConfig yields the oidc config");
    assert.equal(
      config.oidc?.clientSecret.reveal(),
      secret.replace(/\r?\n$/, ""),
      "the client secret is the file content",
    );

    const seed = oidcPart.seed;
    assert.equal(typeof seed, "function", "the oidc part has a seed");
    await must(async () => {
      await seed?.call(oidcPart, seedContext);
      await seed?.call(oidcPart, seedContext);
    });

    const tenant = await must(() => ensureDefaultTenant(db.ownerPool, E2E_TENANT_NAME));
    const tenantA = await must(() =>
      resolveTenantForToken(db.appPool, { issuer: fake.issuer, organization: ["org-a"] }),
    );
    assert.deepEqual(tenantA, tenant, "org-a at the fake maps to the default tenant");

    const idps = await db.ownerPool.query<{
      tenant_id: string;
      issuer: string;
      organization: string;
    }>("SELECT tenant_id, issuer, organization FROM ursitoare.tenant_idp");
    assert.deepEqual(
      idps.rows,
      [{ tenant_id: tenant.tenantId, issuer: fake.issuer, organization: "org-a" }],
      "the seed provisions one tenant_idp row",
    );

    const callback = await must(() =>
      completeFakeLogin(fake, authorizationUrl(fake, randomBytes(32).toString("base64url")), "alice"),
    );
    assert.ok(
      callback.startsWith(`${ENGINE_CALLBACK}?`),
      "the completed login redirects to the engine callback",
    );
    assert.ok(
      new URL(callback).searchParams.get("code") !== null,
      "the redirect to the engine carries a code",
    );

    await must(() => handle.close());
    await must(() => handle.close());
    await assert.rejects(
      fetch(`${fake.issuer}/.well-known/openid-configuration`, {
        redirect: "error",
        signal: AbortSignal.timeout(2000),
      }),
      "the fake no longer answers after the close",
    );

    const missing = thrown(() => oidcApi(new Map<string, PartHandle>()));
    assert.ok(missing instanceof E2eStackError, `expected an E2eStackError, got ${String(missing)}`);
    assert.equal(missing.code, "STACK_PART_MISSING");
  } finally {
    await started?.close().catch(() => undefined);
    await cleanup?.close().catch(() => undefined);
  }
});

test("C-40f6caea discovery runs the oidc part after the database part", async () => {
  const parts = await must(() => discoverParts());
  const names = parts.map((part) => part.name);
  assert.ok(names.includes("oidc"), "the oidc part is discovered");
  assert.ok(names.includes("database"), "the database part is discovered");
  assert.ok(
    names.indexOf("database") < names.indexOf("oidc"),
    "the oidc part is discovered after the database part",
  );

  const partFile = path.join(PARTS_DIR, "25-oidc.ts");
  assert.ok(existsSync(partFile), "the shipped oidc part file exists");
  assert.equal(
    readFileSync(partFile, "utf8").trim(),
    'export { oidcPart as part } from "../oidc-part.ts";',
    "the part file re-exports the oidc part",
  );
});
