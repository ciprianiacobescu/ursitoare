import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { createDefaultRegistry } from "./builtin.ts";
import { cliMain } from "./main.ts";

async function run(argv: string[]): Promise<{ code: number; out: string; err: string }> {
  let out = "";
  let err = "";
  const code = await cliMain(argv, {
    env: {},
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

test("C-2687097e the default registry lists init-secrets and runs it", async () => {
  const names = createDefaultRegistry().list().map((entry) => entry.name);
  assert.deepEqual(
    names,
    [
      "admin bootstrap-admin",
      "admin grant-role",
      "admin list-users",
      "admin revoke-role",
      "admin verify-audit",
      "flow test",
      "flow validate",
      "init-secrets",
    ],
    "the default registry holds the eight commands and no other",
  );

  const help = await run(["help"]);
  assert.equal(help.code, 0);
  assert.equal(help.err, "");
  assert.ok(
    help.out.split("\n").includes("init-secrets  write the first-run secrets and the .env file"),
    "help carries the init-secrets line",
  );

  const missing = await run(["init-secrets"]);
  assert.equal(missing.code, 2);
  assert.equal(missing.out, "");
  assert.equal(missing.err, "CLI_USAGE: missing required option --dir\n");

  const root = await mkdtemp(join(tmpdir(), "init-secrets-registry-"));
  try {
    const dir = join(root, "deploy");
    const done = await run(["init-secrets", "--dir", dir]);
    assert.equal(done.code, 0);
    assert.equal(done.err, "");
    const lines = done.out.split("\n").filter((line) => line !== "");
    assert.equal(lines.length, 17, "16 wrote lines and the first user line");
    assert.equal(
      lines[16],
      "first user owner; the one-time password is in secrets/first_user_password",
    );
    const envStat = await stat(join(dir, ".env"));
    assert.ok(envStat.isFile());
    assert.equal(envStat.mode & 0o777, 0o600);
    const env = await readFile(join(dir, ".env"), "utf8");
    assert.equal(env.split("\n").filter((line) => line !== "").length, 6);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
