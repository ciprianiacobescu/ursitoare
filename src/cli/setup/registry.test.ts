import assert from "node:assert/strict";
import { test } from "node:test";

import { createDefaultRegistry } from "../builtin.ts";
import { cliMain } from "../main.ts";

test("C-2687097e the default registry lists thirteen commands", async () => {
  let out = "";
  let err = "";
  const code = await cliMain(["help"], {
    env: {},
    stdout: { write: (text) => void (out += text) },
    stderr: { write: (text) => void (err += text) },
  });
  assert.equal(code, 0);
  assert.equal(err, "");
  const lines = out.split("\n").filter((line) => line !== "");
  assert.equal(lines.length, 13);
  for (const expected of [
    "db-prepare  apply the schema migrations and the durable-execution schema",
    "db-roles  create the engine database and the two database roles",
    "flow test  run a flow offline against mocks",
    "init-secrets  write the first-run secrets and the .env file",
    "tenant-create  create a tenant with its review profile",
    "tenant-idp  register a tenant's identity provider",
    "tenant-sink  bind the audit sink tokens to a tenant",
  ]) {
    assert.ok(lines.includes(expected), `help carries: ${expected}`);
  }
  assert.deepEqual(
    createDefaultRegistry().list().map((entry) => entry.name),
    [
      "admin bootstrap-admin",
      "admin grant-role",
      "admin list-users",
      "admin revoke-role",
      "admin verify-audit",
      "db-prepare",
      "db-roles",
      "flow test",
      "flow validate",
      "init-secrets",
      "tenant-create",
      "tenant-idp",
      "tenant-sink",
    ],
  );
});
