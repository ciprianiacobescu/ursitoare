import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { planSecrets, writeSecrets } from "./init-secrets.ts";
import type { InitSecretsFs, SecretPlan } from "./init-secrets.ts";

assert.equal(typeof writeSecrets, "function");

const NAMES = [
  "engine_key",
  "kek",
  "signing_seed",
  "mk_issue_token",
  "mk_proxy_token",
  "mk_broker_token",
  "mk_vault_proxy_token",
  "mk_vault_writer_token",
  "db_superuser_password",
  "db_owner_password",
  "db_app_password",
  "db_keycloak_password",
  "oidc_client_secret",
  "keycloak_admin_password",
  "first_user_password",
];

function seededRandom(): (n: number) => Uint8Array {
  let call = 0;
  return (n: number): Uint8Array => {
    call += 1;
    return createHash("sha256").update(`init-secrets-test:${call}`).digest().subarray(0, n);
  };
}

function secretPath(name: string): string {
  return `/deploy/secrets/${name}`;
}

function diskError(code?: string): Error {
  const error = new Error("disk-secret");
  return code === undefined ? error : Object.assign(error, { code });
}

interface MemoryFs {
  fs: InitSecretsFs;
  calls: string[];
  existing: Set<string>;
}

function memoryFs(opts: { existing?: string[]; fail?: Record<string, Error> }): MemoryFs {
  const calls: string[] = [];
  const existing = new Set<string>(opts.existing ?? []);
  const fail = opts.fail ?? {};
  const maybeFail = (key: string): void => {
    const error = fail[key];
    if (error !== undefined) throw error;
  };
  const fs: InitSecretsFs = {
    exists: (path) => {
      calls.push(`exists ${path}`);
      try {
        maybeFail(`exists ${path}`);
      } catch (e) {
        return Promise.reject(e);
      }
      return Promise.resolve(existing.has(path));
    },
    mkdir: (path, mode) => {
      calls.push(`mkdir ${path} ${mode}`);
      try {
        maybeFail(`mkdir ${path}`);
      } catch (e) {
        return Promise.reject(e);
      }
      return Promise.resolve();
    },
    writeNew: (path, bytes, mode) => {
      calls.push(`writeNew ${path} ${mode} ${bytes.length}`);
      try {
        maybeFail(`writeNew ${path}`);
      } catch (e) {
        return Promise.reject(e);
      }
      existing.add(path);
      return Promise.resolve();
    },
    remove: (path) => {
      calls.push(`remove ${path}`);
      try {
        maybeFail(`remove ${path}`);
      } catch (e) {
        return Promise.reject(e);
      }
      existing.delete(path);
      return Promise.resolve();
    },
  };
  return { fs, calls, existing };
}

function plan(): SecretPlan {
  return planSecrets("/deploy", seededRandom());
}

function settle<T>(p: Promise<T>): Promise<unknown> {
  return p.then(
    (v) => v,
    (e: unknown) => e,
  );
}

function codeOf(e: unknown): unknown {
  return (e as { code?: unknown }).code;
}

function messageOf(e: unknown): unknown {
  return (e as { message?: unknown }).message;
}

const PLAN_PATHS = [...NAMES.map(secretPath), "/deploy/.env"];
const EXISTS_CALLS = PLAN_PATHS.map((p) => `exists ${p}`);

test("C-424f4b02 existing files stop the run before any write", async () => {
  const blocked = memoryFs({ existing: [secretPath("kek"), "/deploy/.env"] });
  const error = await settle(writeSecrets(plan(), blocked.fs));
  assert.equal(codeOf(error), "CLI_SECRETS_EXIST");
  assert.equal(
    messageOf(error),
    "refusing to overwrite /deploy/secrets/kek, /deploy/.env",
  );
  assert.deepEqual(blocked.calls, EXISTS_CALLS);
  assert.deepEqual([...blocked.existing], [secretPath("kek"), "/deploy/.env"]);

  const clean = memoryFs({});
  const result = await settle(writeSecrets(plan(), clean.fs));
  assert.deepEqual(result, { written: PLAN_PATHS });
  const lengths = [65, 32, 32, ...Array<number>(12).fill(65)];
  assert.deepEqual(clean.calls, [
    ...EXISTS_CALLS,
    "mkdir /deploy/secrets 448",
    ...NAMES.map((n, i) => `writeNew ${secretPath(n)} 384 ${lengths[i]}`),
    "writeNew /deploy/.env 384 422",
  ]);
});

const REMOVED_FROM_PROXY = [
  secretPath("mk_issue_token"),
  secretPath("signing_seed"),
  secretPath("kek"),
  secretPath("engine_key"),
];

function removals(calls: string[]): string[] {
  return calls.filter((c) => c.startsWith("remove ")).map((c) => c.slice("remove ".length));
}

test("C-9590654a a failing dependency leaves nothing behind", async () => {
  const proxy = secretPath("mk_proxy_token");

  const w1 = memoryFs({ fail: { [`writeNew ${proxy}`]: diskError("ENOSPC") } });
  const e1 = await settle(writeSecrets(plan(), w1.fs));
  assert.equal(codeOf(e1), "CLI_SECRETS_FAILED");
  assert.equal(messageOf(e1), `could not write ${proxy} (ENOSPC)`);
  assert.deepEqual(removals(w1.calls), [proxy, ...REMOVED_FROM_PROXY]);
  assert.equal(w1.calls.filter((c) => c.startsWith("writeNew ")).length, 5);

  const w2 = memoryFs({
    fail: {
      [`writeNew ${proxy}`]: diskError(),
      [`remove ${secretPath("signing_seed")}`]: diskError("EIO"),
    },
  });
  const e2 = await settle(writeSecrets(plan(), w2.fs));
  assert.equal(codeOf(e2), "CLI_SECRETS_FAILED");
  assert.equal(
    messageOf(e2),
    `could not write ${proxy}; could not remove ${secretPath("signing_seed")}`,
  );
  assert.deepEqual(removals(w2.calls), [proxy, ...REMOVED_FROM_PROXY]);

  const w3 = memoryFs({ fail: { [`writeNew ${proxy}`]: diskError("EEXIST") } });
  const e3 = await settle(writeSecrets(plan(), w3.fs));
  assert.equal(codeOf(e3), "CLI_SECRETS_EXIST");
  assert.equal(messageOf(e3), `refusing to overwrite ${proxy}`);
  assert.deepEqual(removals(w3.calls), REMOVED_FROM_PROXY);

  const m1 = memoryFs({ fail: { "mkdir /deploy/secrets": diskError("EACCES") } });
  const e4 = await settle(writeSecrets(plan(), m1.fs));
  assert.equal(codeOf(e4), "CLI_SECRETS_FAILED");
  assert.equal(messageOf(e4), "could not create /deploy/secrets (EACCES)");
  assert.equal(m1.calls.filter((c) => c.startsWith("writeNew ")).length, 0);

  const x1 = memoryFs({ fail: { [`exists ${secretPath("engine_key")}`]: diskError("EACCES") } });
  const e5 = await settle(writeSecrets(plan(), x1.fs));
  assert.equal(codeOf(e5), "CLI_SECRETS_FAILED");
  assert.equal(messageOf(e5), "could not check /deploy/secrets/engine_key (EACCES)");
  assert.deepEqual(x1.calls, [`exists ${secretPath("engine_key")}`]);

  const w4 = memoryFs({ fail: { "writeNew /deploy/.env": diskError("EDQUOT") } });
  const e6 = await settle(writeSecrets(plan(), w4.fs));
  assert.equal(codeOf(e6), "CLI_SECRETS_FAILED");
  assert.equal(messageOf(e6), "could not write /deploy/.env (EDQUOT)");
  assert.deepEqual(removals(w4.calls), ["/deploy/.env", ...NAMES.map(secretPath).reverse()]);

  for (const e of [e1, e2, e3, e4, e5, e6]) {
    assert.ok(!String(messageOf(e)).includes("disk-secret"));
  }
});
