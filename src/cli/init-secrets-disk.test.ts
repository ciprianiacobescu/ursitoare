import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { loadConfig } from "../config/index.ts";
import {
  createInitSecretsCommand,
  nodeInitSecretsFs,
  planSecrets,
  writeSecrets,
} from "./init-secrets.ts";
import type { CommandRegistry } from "./registry.ts";
import { createCommandRegistry } from "./registry.ts";
import { cliMain } from "./main.ts";

assert.equal(typeof planSecrets, "function");

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

function digest(k: number): Buffer {
  return createHash("sha256").update(`init-secrets-test:${k}`).digest();
}

function seeded(): (n: number) => Uint8Array {
  let call = 0;
  return (n: number): Uint8Array => {
    call += 1;
    return digest(call).subarray(0, n);
  };
}

function hexOf(k: number): string {
  return digest(k).toString("hex");
}

function makeRegistry(random: (n: number) => Uint8Array): CommandRegistry {
  const registry = createCommandRegistry();
  try {
    registry.registerCommand("init-secrets", createInitSecretsCommand({ random }));
  } catch {
    // a stub throws here; the empty registry then fails the assertions below
  }
  return registry;
}

async function run(
  argv: string[],
  registry: CommandRegistry,
): Promise<{ code: number; out: string; err: string }> {
  let out = "";
  let err = "";
  const code = await cliMain(argv, {
    env: {},
    registry,
    stdout: {
      write: (t: string): void => {
        out += t;
      },
    },
    stderr: {
      write: (t: string): void => {
        err += t;
      },
    },
  });
  return { code, out, err };
}

function modeOf(path: string): Promise<number> {
  return stat(path).then(
    (s) => s.mode & 0o777,
    () => -1,
  );
}

function sizeOf(path: string): Promise<number> {
  return stat(path).then(
    (s) => s.size,
    () => -1,
  );
}

function bytesOf(path: string): Promise<Buffer> {
  return readFile(path).then(
    (b) => b,
    () => Buffer.alloc(0),
  );
}

function settle<T>(p: Promise<T>): Promise<unknown> {
  return p.then(
    (v) => v,
    (e: unknown) => e,
  );
}

function fileOf(D: string): string[] {
  return [...NAMES.map((n) => join(D, "secrets", n)), join(D, ".env")];
}

test("C-87e40c14 real files, modes, a second run and a bad directory", async () => {
  const base = await mkdtemp(join(tmpdir(), "init-secrets-"));
  try {
    const D = join(base, "a", "b", "deploy");
    const registry = makeRegistry(seeded());
    const first = await run(["init-secrets", "--dir", D], registry);
    assert.equal(first.code, 0);
    assert.equal(first.err, "");
    assert.equal(await modeOf(join(D, "secrets")), 0o700);
    const paths = fileOf(D);
    for (const p of paths) assert.equal(await modeOf(p), 0o600);
    assert.equal(await sizeOf(join(D, "secrets", "engine_key")), 65);
    assert.equal(await sizeOf(join(D, "secrets", "kek")), 32);
    assert.equal(await sizeOf(join(D, "secrets", "signing_seed")), 32);
    assert.equal(await sizeOf(join(D, ".env")), 422);
    assert.deepEqual(await bytesOf(join(D, "secrets", "kek")), digest(2));

    const before = await Promise.all(paths.map(bytesOf));
    const second = await run(["init-secrets", "--dir", D], registry);
    assert.equal(second.code, 1);
    assert.equal(second.out, "");
    assert.equal(second.err, `CLI_SECRETS_EXIST: refusing to overwrite ${paths.join(", ")}\n`);
    const after = await Promise.all(paths.map(bytesOf));
    assert.deepEqual(after, before);

    const D3 = join(base, "d3");
    await mkdir(join(D3, "secrets"), { recursive: true });
    await writeFile(join(D3, "secrets", "kek"), "keep");
    await symlink("/nonexistent-target", join(D3, ".env"));
    const third = await run(["init-secrets", "--dir", D3], registry);
    assert.equal(third.code, 1);
    assert.equal(
      third.err,
      `CLI_SECRETS_EXIST: refusing to overwrite ${join(D3, "secrets", "kek")}, ${join(D3, ".env")}\n`,
    );
    assert.deepEqual(await readdir(join(D3, "secrets")), ["kek"]);
    assert.equal((await readFile(join(D3, "secrets", "kek"))).toString(), "keep");
    assert.equal((await lstat(join(D3, ".env"))).isSymbolicLink(), true);

    const plain = join(base, "plain");
    await writeFile(plain, "x");
    const fourth = await run(["init-secrets", "--dir", `${plain}/x`], registry);
    assert.equal(fourth.code, 1);
    assert.equal(
      fourth.err,
      `CLI_SECRETS_FAILED: could not check ${plain}/x/secrets/engine_key (ENOTDIR)\n`,
    );
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("C-b583a50f the engine reads what was written", async () => {
  const base = await mkdtemp(join(tmpdir(), "init-secrets-"));
  try {
    const D = join(base, "deploy");
    const written = await run(["init-secrets", "--dir", D], makeRegistry(seeded()));
    assert.equal(written.code, 0);
    const file = (name: string): string => join(D, "secrets", name);
    const env: Record<string, string> = {
      URSITOARE_ENGINE_KEY_FILE: file("engine_key"),
      URSITOARE_DATABASE_URL: "postgres://ursitoare_app@postgres:5432/ursitoare",
      URSITOARE_DATABASE_PASSWORD_FILE: file("db_app_password"),
      URSITOARE_DATABASE_OWNER_URL: "postgres://ursitoare_owner@postgres:5432/ursitoare",
      URSITOARE_DATABASE_OWNER_PASSWORD_FILE: file("db_owner_password"),
      URSITOARE_OIDC_ISSUER: "http://localhost:8180/realms/ursitoare",
      URSITOARE_OIDC_CLIENT_SECRET_FILE: file("oidc_client_secret"),
      URSITOARE_EGRESS_BROKER_URL: "http://mintkey-broker:8083",
      URSITOARE_EGRESS_PROXY_URL: "http://mintkey-proxy:8086",
      URSITOARE_EGRESS_BROKER_TOKEN_FILE: file("mk_issue_token"),
      URSITOARE_EGRESS_VAULT_URL: "http://mintkey-vault:8084",
      URSITOARE_EGRESS_VAULT_IDENTITY: "svcid_ursitoare",
      URSITOARE_EGRESS_VAULT_TOKEN_FILE: file("mk_vault_writer_token"),
    };
    const cfg = (() => {
      try {
        return loadConfig(env);
      } catch {
        return null;
      }
    })();
    assert.notEqual(cfg, null);
    assert.equal(cfg?.engineKey?.reveal(), hexOf(1));
    assert.equal(cfg?.oidc?.clientSecret.reveal(), hexOf(13));
    assert.equal(cfg?.egress?.brokerToken.reveal(), hexOf(4));
    assert.equal(cfg?.egress?.vault?.token.reveal(), hexOf(8));
    assert.equal(cfg?.database.app?.password?.reveal(), hexOf(11));
    assert.equal(cfg?.database.owner?.password?.reveal(), hexOf(10));

    const envText = (await bytesOf(join(D, ".env"))).toString("utf8");
    const fromEnv: Record<string, string> = {};
    for (const line of envText.split("\n")) {
      if (line === "") continue;
      const at = line.indexOf("=");
      fromEnv[line.slice(0, at)] = line.slice(at + 1);
    }
    assert.equal(Object.keys(fromEnv).length, 6);
    const cfg2 = (() => {
      try {
        return loadConfig(fromEnv);
      } catch {
        return null;
      }
    })();
    assert.notEqual(cfg2, null);
    assert.equal(cfg2?.engineKey, null);
    assert.equal(cfg2?.oidc, undefined);
    assert.equal(cfg2?.egress, undefined);
    assert.equal(cfg2?.database.app?.password ?? null, null);
    assert.equal(cfg2?.database.owner?.password ?? null, null);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("C-7212b6ab the default fs on a real directory", async () => {
  const T = await mkdtemp(join(tmpdir(), "init-secrets-"));
  try {
    const fs = nodeInitSecretsFs;
    const exists: unknown[] = [];
    exists.push(await settle(fs.exists(join(T, "a"))));
    assert.equal(await settle(fs.mkdir(join(T, "s"), 0o700)), undefined);
    exists.push(await settle(fs.exists(join(T, "s"))));
    const f = join(T, "s", "f");
    assert.equal(await settle(fs.writeNew(f, new Uint8Array([1, 2, 3]), 0o600)), undefined);
    assert.deepEqual([...(await bytesOf(f))], [1, 2, 3]);
    assert.equal(await modeOf(f), 0o600);
    const again = await settle(fs.writeNew(f, new Uint8Array([9]), 0o600));
    assert.equal((again as { code?: unknown }).code, "EEXIST");
    assert.deepEqual([...(await bytesOf(f))], [1, 2, 3]);
    await symlink(join(T, "missing"), join(T, "l"));
    exists.push(await settle(fs.exists(join(T, "l"))));
    assert.deepEqual(exists, [false, true, true]);
    assert.equal(await settle(fs.remove(f)), undefined);
    assert.equal(await sizeOf(f), -1);
    assert.equal(await settle(fs.remove(f)), undefined);

    const proxy = join(T, "d", "secrets", "mk_proxy_token");
    const failing = {
      ...nodeInitSecretsFs,
      writeNew: (path: string, bytes: Uint8Array, mode: number): Promise<void> =>
        path === proxy
          ? Promise.reject(Object.assign(new Error("x"), { code: "ENOSPC" }))
          : nodeInitSecretsFs.writeNew(path, bytes, mode),
    };
    const planned = planSecrets(join(T, "d"), seeded());
    const error = await settle(writeSecrets(planned, failing));
    assert.equal((error as { code?: unknown }).code, "CLI_SECRETS_FAILED");
    assert.equal((error as { message?: unknown }).message, `could not write ${proxy} (ENOSPC)`);
    const left = await readdir(join(T, "d", "secrets")).then(
      (l) => l,
      () => ["missing"],
    );
    assert.deepEqual(left, []);
  } finally {
    await rm(T, { recursive: true, force: true });
  }
});
