import assert from "node:assert/strict";
import { test } from "node:test";

import type { Env, SecretReader } from "../../config/index.ts";
import type { Clock, IdSource } from "../../core/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import { grantRole, loadMemberships, upsertUserFromClaims } from "../../identity/index.ts";
import type { User } from "../../identity/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { withTestDatabase } from "../../../test/support/pg.ts";
import type { TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import type { CliOutput } from "../output.ts";
import { createCommandRegistry } from "../registry.ts";
import type { CommandRegistry } from "../registry.ts";
import type { CliDeps, OwnerConnection } from "../run.ts";
import { runCli } from "../run.ts";
import { grantRoleCommand } from "./grant-role.ts";
import { revokeRoleCommand } from "./revoke-role.ts";

const ISS = "https://idp.example/realms/ursitoare";
const OPERATOR = "ops";

interface Captured {
  output: CliOutput;
  text(): string;
}

function capture(): Captured {
  let buffer = "";
  return {
    output: {
      write(text: string): void {
        buffer += text;
      },
    },
    text(): string {
      return buffer;
    },
  };
}

interface AuditRow {
  event_type: string;
  actor: unknown;
  payload: Unknown;
}

type Unknown = Record<string, unknown>;

async function readEvents(db: TestDatabase, ctx: TenantContext): Promise<AuditRow[]> {
  return withTenantTx(db.ownerPool, ctx, async (tx) => {
    const result = await tx.query<AuditRow>(
      "SELECT event_type, actor, payload FROM ursitoare.audit_event WHERE tenant_id = $1 ORDER BY seq",
      [ctx.tenantId],
    );
    return result.rows;
  });
}

async function membershipsOf(
  db: TestDatabase,
  ctx: TenantContext,
  userId: string,
): Promise<{ roles: string[]; teams: string[] }> {
  return withTenantTx(db.ownerPool, ctx, (tx) => loadMemberships(tx, ctx, userId));
}

async function createHuman(
  db: TestDatabase,
  ctx: TenantContext,
  subject: string,
): Promise<User> {
  return withTenantTx(db.ownerPool, ctx, (tx) =>
    upsertUserFromClaims(tx, ctx, { issuer: ISS, subject }),
  );
}

function ownerEnv(db: TestDatabase, extra: Env = {}): Env {
  return {
    URSITOARE_DATABASE_OWNER_URL: db.ownerEndpoint.url,
    URSITOARE_DATABASE_OWNER_PASSWORD_FILE: "/run/owner-pw",
    ...extra,
  };
}

function readSecretFor(db: TestDatabase): SecretReader {
  return (path) => {
    if (path === "/run/owner-pw") {
      return db.ownerEndpoint.password?.reveal() ?? "";
    }
    return "";
  };
}

function depsFor(
  registry: CommandRegistry,
  env: Env,
  stdout: Captured,
  stderr: Captured,
  db: TestDatabase,
  clock: Clock,
  ids: IdSource,
): CliDeps {
  const connectOwner = (_endpoint: Parameters<NonNullable<CliDeps["connectOwner"]>>[0]): OwnerConnection => ({
    pool: db.ownerPool,
    close: async () => undefined,
  });
  return {
    env,
    stdout: stdout.output,
    stderr: stderr.output,
    registry,
    clock,
    ids,
    readSecret: readSecretFor(db),
    connectOwner,
  };
}

const clockOf = (): Clock => fixedClock("2031-03-10T00:00:00.000Z");
const idsOf = (): IdSource => sequentialIds(1);

test("C-e9948ac3 admin grant-role grants to a human twice and runs as JSON", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const alice = await createHuman(db, a, "alice-cli");
    const registry = createCommandRegistry();
    registry.registerCommand("admin grant-role", grantRoleCommand);

    const args = ["--tenant", "tenant_a", "--user", alice.userId, "--role", "tenant_admin", "--operator", OPERATOR];

    const firstStdout = capture();
    const firstStderr = capture();
    const first = await runCli(
      ["admin", "grant-role", ...args],
      depsFor(registry, ownerEnv(db), firstStdout, firstStderr, db, clockOf(), idsOf()),
    );
    assert.equal(first, 0, "the first grant succeeds");
    assert.equal(firstStderr.text(), "");
    assert.equal(firstStdout.text(), `granted tenant_admin to ${alice.userId}\n`);

    const secondStdout = capture();
    const secondStderr = capture();
    const second = await runCli(
      ["admin", "grant-role", ...args],
      depsFor(registry, ownerEnv(db), secondStdout, secondStderr, db, clockOf(), idsOf()),
    );
    assert.equal(second, 0, "the second grant succeeds as a no-op");
    assert.equal(secondStdout.text(), `already held: tenant_admin for ${alice.userId}\n`);

    const jsonStdout = capture();
    const jsonStderr = capture();
    const json = await runCli(
      ["admin", "grant-role", ...args, "--json"],
      depsFor(registry, ownerEnv(db), jsonStdout, jsonStderr, db, clockOf(), idsOf()),
    );
    assert.equal(json, 0, "the JSON run succeeds");
    assert.equal(
      jsonStdout.text(),
      `{"result":"exists","userId":"${alice.userId}","roleId":"tenant_admin"}\n`,
    );

    assert.deepEqual(await membershipsOf(db, a, alice.userId), {
      roles: ["tenant_admin"],
      teams: [],
    });

    const events = await readEvents(db, a);
    assert.deepEqual(
      events.map((event) => event.event_type),
      [
        "identity.role_granted",
        "cli.command_run",
        "cli.command_run",
        "cli.command_run",
      ],
      "one identity event then one command event per run",
    );
    assert.deepEqual(events[0]?.actor, { kind: "system", id: `operator:${OPERATOR}` });
    assert.deepEqual(events[0]?.payload, { roleId: "tenant_admin", via: "operator" });
    assert.deepEqual(events[1]?.payload, {
      command: "admin grant-role",
      outcome: "ok",
      userId: alice.userId,
      roleId: "tenant_admin",
      result: "granted",
    });
    assert.deepEqual(events[2]?.payload, {
      command: "admin grant-role",
      outcome: "ok",
      userId: alice.userId,
      roleId: "tenant_admin",
      result: "exists",
    });
    assert.deepEqual(events[3]?.payload, {
      command: "admin grant-role",
      outcome: "ok",
      userId: alice.userId,
      roleId: "tenant_admin",
      result: "exists",
    });
    assert.deepEqual(
      (await readEvents(db, b)).filter((event) => event.event_type === "cli.command_run"),
      [],
      "the other tenant has no command event",
    );
  } finally {
    await db.close();
  }
});

test("C-a13f7327 admin grant-role and revoke-role refuse invalid input and stay isolated", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const alice = await createHuman(db, a, "alice-cli");
    const bob = await createHuman(db, b, "bob-cli");
    await withTenantTx(db.ownerPool, b, async (tx) => {
      await grantRole(tx, b, { userId: bob.userId, roleId: "author" }, { kind: "operator", name: "setup" });
    });
    const registry = createCommandRegistry();
    registry.registerCommand("admin grant-role", grantRoleCommand);
    registry.registerCommand("admin revoke-role", revokeRoleCommand);

    const ghostUserStdout = capture();
    const ghostUserStderr = capture();
    const ghostUser = await runCli(
      ["admin", "grant-role", "--tenant", "tenant_a", "--user", "usr_ghost", "--role", "author", "--operator", OPERATOR],
      depsFor(registry, ownerEnv(db), ghostUserStdout, ghostUserStderr, db, clockOf(), idsOf()),
    );
    assert.equal(ghostUser, 1, "an unknown user refuses");
    assert.ok(ghostUserStderr.text().startsWith("RBAC_NOT_FOUND: "), "the unknown user line names the code");
    assert.equal(ghostUserStdout.text(), "");

    const badRoleStdout = capture();
    const badRoleStderr = capture();
    const badRole = await runCli(
      ["admin", "grant-role", "--tenant", "tenant_a", "--user", alice.userId, "--role", "Bad Role", "--operator", OPERATOR],
      depsFor(registry, ownerEnv(db), badRoleStdout, badRoleStderr, db, clockOf(), idsOf()),
    );
    assert.equal(badRole, 1, "an invalid role name refuses");
    assert.ok(badRoleStderr.text().startsWith("RBAC_INVALID: "), "the invalid role line names the code");
    assert.equal(badRoleStdout.text(), "");

    const noUserStdout = capture();
    const noUserStderr = capture();
    const noUser = await runCli(
      ["admin", "revoke-role", "--tenant", "tenant_a", "--operator", OPERATOR],
      depsFor(registry, ownerEnv(db), noUserStdout, noUserStderr, db, clockOf(), idsOf()),
    );
    assert.equal(noUser, 2, "a missing user option is a usage error");
    assert.equal(noUserStderr.text(), "CLI_USAGE: missing required option --user\n");
    assert.equal(noUserStdout.text(), "");

    const noRoleStdout = capture();
    const noRoleStderr = capture();
    const noRole = await runCli(
      ["admin", "revoke-role", "--tenant", "tenant_a", "--user", alice.userId, "--operator", OPERATOR],
      depsFor(registry, ownerEnv(db), noRoleStdout, noRoleStderr, db, clockOf(), idsOf()),
    );
    assert.equal(noRole, 2, "a missing role option is a usage error");
    assert.equal(noRoleStderr.text(), "CLI_USAGE: missing required option --role\n");
    assert.equal(noRoleStdout.text(), "");

    const crossTenantStdout = capture();
    const crossTenantStderr = capture();
    const crossTenant = await runCli(
      ["admin", "grant-role", "--tenant", "tenant_a", "--user", bob.userId, "--role", "author", "--operator", OPERATOR],
      depsFor(registry, ownerEnv(db), crossTenantStdout, crossTenantStderr, db, clockOf(), idsOf()),
    );
    assert.equal(crossTenant, 1, "a user of another tenant is unknown here");
    assert.ok(crossTenantStderr.text().startsWith("RBAC_NOT_FOUND: "), "the cross tenant line names the code");

    const ghostRoleStdout = capture();
    const ghostRoleStderr = capture();
    const ghostRole = await runCli(
      ["admin", "grant-role", "--tenant", "tenant_a", "--user", alice.userId, "--role", "ghost", "--operator", OPERATOR],
      depsFor(registry, ownerEnv(db), ghostRoleStdout, ghostRoleStderr, db, clockOf(), idsOf()),
    );
    assert.equal(ghostRole, 1, "an unknown role refuses");
    assert.ok(ghostRoleStderr.text().startsWith("RBAC_NOT_FOUND: "), "the unknown role line names the code");

    const events = await readEvents(db, a);
    assert.deepEqual(
      events.map((event) => event.payload),
      [
        { command: "admin grant-role", outcome: "refused", code: "RBAC_NOT_FOUND" },
        { command: "admin grant-role", outcome: "refused", code: "RBAC_INVALID" },
        { command: "admin grant-role", outcome: "refused", code: "RBAC_NOT_FOUND" },
        { command: "admin grant-role", outcome: "refused", code: "RBAC_NOT_FOUND" },
      ],
      "each RBAC refusal leaves one refused command event",
    );

    assert.deepEqual(await membershipsOf(db, b, bob.userId), {
      roles: ["author"],
      teams: [],
    }, "bob of tenant_b still holds author");
  } finally {
    await db.close();
  }
});
