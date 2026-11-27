import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  createInitSecretsCommand,
  initSecretsCommand,
  planSecrets,
} from "./init-secrets.ts";
import type { InitSecretsFs } from "./init-secrets.ts";
import { cliMain } from "./main.ts";
import type { CommandRegistry } from "./registry.ts";
import { createCommandRegistry } from "./registry.ts";

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

interface Spy {
  fs: InitSecretsFs;
  calls: string[];
}

function spyFs(failWriteOf?: string): Spy {
  const calls: string[] = [];
  const fs: InitSecretsFs = {
    exists: (path) => {
      calls.push(`exists ${path}`);
      return Promise.resolve(false);
    },
    mkdir: (path) => {
      calls.push(`mkdir ${path}`);
      return Promise.resolve();
    },
    writeNew: (path) => {
      calls.push(`writeNew ${path}`);
      if (path === failWriteOf) {
        return Promise.reject(Object.assign(new Error("disk-secret"), { code: "ENOSPC" }));
      }
      return Promise.resolve();
    },
    remove: (path) => {
      calls.push(`remove ${path}`);
      return Promise.resolve();
    },
  };
  return { fs, calls };
}

function makeRegistry(deps: Parameters<typeof createInitSecretsCommand>[0]): CommandRegistry {
  const registry = createCommandRegistry();
  try {
    registry.registerCommand("init-secrets", createInitSecretsCommand(deps));
  } catch {
    // a stub throws here; the empty registry then fails the assertions below
  }
  return registry;
}

async function run(
  argv: string[],
  registry: CommandRegistry,
  env: Record<string, string> = {},
): Promise<{ code: number; out: string; err: string }> {
  let out = "";
  let err = "";
  const code = await cliMain(argv, {
    env,
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

function leaks(text: string): boolean {
  const needles: string[] = [];
  for (let k = 1; k <= 15; k += 1) needles.push(digest(k).toString("hex"));
  needles.push(digest(2).toString("base64"), digest(3).toString("base64"));
  const envFile = planSecrets("/deploy", seeded()).files[15];
  const envText = Buffer.from(envFile?.bytes ?? new Uint8Array()).toString("utf8");
  for (const line of envText.split("\n")) if (line !== "") needles.push(line);
  needles.push("entropy-secret");
  return needles.some((n) => text.includes(n));
}

const LAST = "first user owner; the one-time password is in secrets/first_user_password\n";

test("C-3c0b021a the output names files and never values", async () => {
  const base = await mkdtemp(join(tmpdir(), "init-secrets-"));
  try {
    const D = join(base, "deploy");
    const first = await run(["init-secrets", "--dir", D], makeRegistry({ random: seeded() }));
    assert.equal(first.code, 0);
    assert.equal(first.err, "");
    assert.equal(
      first.out,
      `${NAMES.map((n) => `wrote secrets/${n}\n`).join("")}wrote .env\n${LAST}`,
    );

    const D2 = join(base, "second");
    const second = await run(
      ["init-secrets", "--dir", D2, "--first-user", "ana.m"],
      makeRegistry({ random: seeded() }),
    );
    assert.equal(second.code, 0);
    assert.ok(
      second.out.endsWith(
        "first user ana.m; the one-time password is in secrets/first_user_password\n",
      ),
    );

    const failing = spyFs(join("/deploy", "secrets", "mk_proxy_token"));
    const third = await run(
      ["init-secrets", "--dir", "/deploy"],
      makeRegistry({ random: seeded(), fs: failing.fs }),
    );
    assert.equal(third.code, 1);
    assert.equal(
      third.err,
      "CLI_SECRETS_FAILED: could not write /deploy/secrets/mk_proxy_token (ENOSPC)\n",
    );

    const fourth = await run(["init-secrets", "--dir", D], makeRegistry({ random: seeded() }));
    assert.equal(fourth.code, 1);
    assert.ok(fourth.err.startsWith("CLI_SECRETS_EXIST: refusing to overwrite "));

    const quiet = spyFs();
    const fifth = await run(
      ["init-secrets", "--dir", join(base, "never")],
      makeRegistry({
        random: (): Uint8Array => {
          throw new Error("entropy-secret");
        },
        fs: quiet.fs,
      }),
    );
    assert.equal(fifth.code, 1);
    assert.equal(fifth.err, "CLI_INTERNAL: command failed\n");
    assert.equal(fifth.out, "");
    assert.deepEqual(quiet.calls, []);

    for (const r of [first, second, third, fourth, fifth]) {
      assert.equal(leaks(r.out + r.err), false);
    }
    assert.deepEqual(await readdir(base).then((l) => l.sort(), () => []), ["deploy", "second"]);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("C-5b7f452d missing and bad options, the environment and help", async () => {
  const spy = spyFs();
  const asked: number[] = [];
  const spied = makeRegistry({
    random: (n: number): Uint8Array => {
      asked.push(n);
      return new Uint8Array(n);
    },
    fs: spy.fs,
  });
  const bad: { argv: string[]; err: string }[] = [
    { argv: ["init-secrets"], err: "CLI_USAGE: missing required option --dir\n" },
    { argv: ["init-secrets", "--dir", ""], err: "CLI_USAGE: --dir must name a directory\n" },
    {
      argv: ["init-secrets", "--dir", "/x", "--first-user", "Bob"],
      err: "CLI_USAGE: --first-user must match ^[a-z][a-z0-9._-]{0,63}$\n",
    },
  ];
  for (const row of bad) {
    const r = await run(row.argv, spied, { URSITOARE_PORT: "abc" });
    assert.equal(r.code, 2);
    assert.equal(r.out, "");
    assert.equal(r.err, row.err);
  }
  assert.deepEqual(spy.calls, []);
  assert.deepEqual(asked, []);

  const base = await mkdtemp(join(tmpdir(), "init-secrets-"));
  try {
    const registry = makeRegistry({ random: seeded() });
    const ok1 = await run(
      ["init-secrets", "--dir", join(base, "one"), "--first-user", "a"],
      registry,
      { URSITOARE_PORT: "abc" },
    );
    assert.equal(ok1.code, 0);
    assert.ok(ok1.out.includes("first user a;"));
    const ok2 = await run(
      ["init-secrets", "--dir", join(base, "two"), "--first-user", "ana.m-x_y1"],
      makeRegistry({ random: seeded() }),
      { URSITOARE_PORT: "abc" },
    );
    assert.equal(ok2.code, 0);
    assert.ok(ok2.out.includes("first user ana.m-x_y1;"));

    const help = await run(["init-secrets", "--help"], registry);
    assert.equal(help.code, 0);
    assert.equal(help.err, "");
    assert.equal(
      help.out,
      "usage: node src/cli/main.ts init-secrets --dir <string> [--first-user <string>]\n" +
        "write the first-run secrets and the .env file\n" +
        "  --dir <string>  directory that receives .env and secrets/\n" +
        "  [--first-user <string>]  name of the first user, default owner\n",
    );
    assert.deepEqual(await readdir(base).then((l) => l.sort(), () => []), ["one", "two"]);
  } finally {
    await rm(base, { recursive: true, force: true });
  }

  assert.equal(initSecretsCommand.database, false);
  const built = (() => {
    try {
      return createInitSecretsCommand();
    } catch {
      return null;
    }
  })();
  assert.notEqual(built, null);
  assert.equal(initSecretsCommand.summary, "write the first-run secrets and the .env file");
  assert.equal(initSecretsCommand.summary, built?.summary);
  assert.deepEqual(initSecretsCommand.options, built?.options);
});
