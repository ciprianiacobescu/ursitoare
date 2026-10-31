import assert from "node:assert/strict";
import { test } from "node:test";

import type { Env, SecretReader } from "../../config/index.ts";
import type { Clock, IdSource } from "../../core/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import { grantRole, loadMemberships, provisionTenantIdp, setGroupMapping, syncMemberships, upsertUserFromClaims } from "../../identity/index.ts";
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
import { revokeRoleCommand } from "./revoke-role.ts";

const ISS = "https://idp.example/realms/ursitoare";
const GROUP = "authors";
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

test("C-e5dc7461 admin revoke-role revokes directly granted and refuses an identity-provider role", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });
    const alice = await withTenantTx(db.ownerPool, a, async (tx) => {
      const user = await upsertUserFromClaims(tx, a, { issuer: ISS, subject: "alice-cli" });
      await setGroupMapping(tx, a, { issuer: ISS, group: GROUP, roleId: "author" }, { kind: "operator", name: "setup" });
      await grantRole(tx, a, { userId: user.userId, roleId: "tenant_admin" }, { kind: "operator", name: "setup" });
      await syncMemberships(tx, a, user.userId, { issuer: ISS, groups: [GROUP] });
      return user;
    });

    const registry = createCommandRegistry();
    registry.registerCommand("admin revoke-role", revokeRoleCommand);

    const args = ["--tenant", "tenant_a", "--user", alice.userId, "--role", "tenant_admin", "--operator", OPERATOR];

    const firstStdout = capture();
    const firstStderr = capture();
    const first = await runCli(
      ["admin", "revoke-role", ...args],
      depsFor(registry, ownerEnv(db), firstStdout, firstStderr, db, clockOf(), idsOf()),
    );
    assert.equal(first, 0, "the direct grant is revoked");
    assert.equal(firstStderr.text(), "");
    assert.equal(firstStdout.text(), `revoked tenant_admin from ${alice.userId}\n`);

    const jsonStdout = capture();
    const jsonStderr = capture();
    const json = await runCli(
      ["admin", "revoke-role", ...args, "--json"],
      depsFor(registry, ownerEnv(db), jsonStdout, jsonStderr, db, clockOf(), idsOf()),
    );
    assert.equal(json, 0, "the JSON run reports the grant as absent");
    assert.equal(
      jsonStdout.text(),
      `{"result":"absent","userId":"${alice.userId}","roleId":"tenant_admin"}\n`,
    );

    const authorStdout = capture();
    const authorStderr = capture();
    const author = await runCli(
      ["admin", "revoke-role", "--tenant", "tenant_a", "--user", alice.userId, "--role", "author", "--operator", OPERATOR],
      depsFor(registry, ownerEnv(db), authorStdout, authorStderr, db, clockOf(), idsOf()),
    );
    assert.equal(author, 0, "revoking an identity-provider held role reports not held");
    assert.equal(authorStderr.text(), "");
    assert.equal(authorStdout.text(), `not held: author for ${alice.userId}\n`);

    assert.deepEqual(await membershipsOf(db, a, alice.userId), {
      roles: ["author"],
      teams: [],
    });

    const events = await readEvents(db, a);
    assert.deepEqual(
      events.map((event) => event.event_type),
      [
        "identity.group_mapped",
        "identity.role_granted",
        "identity.memberships_synced",
        "identity.role_revoked",
        "cli.command_run",
        "cli.command_run",
        "cli.command_run",
      ],
      "the setup events, one revoke event and one command event per run",
    );
    assert.deepEqual(events[3]?.actor, { kind: "system", id: `operator:${OPERATOR}` });
    assert.deepEqual(events[4]?.payload, {
      command: "admin revoke-role",
      outcome: "ok",
      userId: alice.userId,
      roleId: "tenant_admin",
      result: "revoked",
    });
    assert.deepEqual(events[5]?.payload, {
      command: "admin revoke-role",
      outcome: "ok",
      userId: alice.userId,
      roleId: "tenant_admin",
      result: "absent",
    });
    assert.deepEqual(events[6]?.payload, {
      command: "admin revoke-role",
      outcome: "ok",
      userId: alice.userId,
      roleId: "author",
      result: "absent",
    });
  } finally {
    await db.close();
  }
});
