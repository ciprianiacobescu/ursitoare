import assert from "node:assert/strict";
import { test } from "node:test";

import type { Env, SecretReader } from "../../config/index.ts";
import type { Clock, IdSource } from "../../core/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import { createServiceAccount, grantRole, upsertUserFromClaims } from "../../identity/index.ts";
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
import { listUsersCommand } from "./list-users.ts";

const ISS = "https://idp.example/realms/ursitoare";
const HOSTILE_NAME = "Eve\u001b[2Jx\ty\u202e";
const SAFE_NAME = "Eve?[2Jx?y?";

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

async function withUsers(db: TestDatabase): Promise<{
  a: TenantContext;
  b: TenantContext;
  alice: User;
  bob: User;
  robot: User;
  mallory: User;
}> {
  const { a, b } = await seedTwoTenants(db);
  const ids = sequentialIds(1);
  const clock: Clock = fixedClock("2031-03-10T00:00:00.000Z");
  const alice = await withTenantTx(db.ownerPool, a, (tx) =>
    upsertUserFromClaims(
      tx,
      a,
      { issuer: ISS, subject: "alice-sub", name: HOSTILE_NAME, email: "alice@example.test" },
      { ids, clock },
    ),
  );
  const bob = await withTenantTx(db.ownerPool, a, (tx) =>
    upsertUserFromClaims(tx, a, { issuer: ISS, subject: "bob-sub", name: "Bob B" }, { ids, clock }),
  );
  const robot = await withTenantTx(db.ownerPool, a, (tx) =>
    createServiceAccount(tx, a, { displayName: "robot", ownerUserId: alice.userId }, { ids, clock }),
  );
  const mallory = await withTenantTx(db.ownerPool, b, (tx) =>
    upsertUserFromClaims(tx, b, { issuer: ISS, subject: "mallory-sub", name: "Mallory M" }, { ids, clock }),
  );
  await withTenantTx(db.ownerPool, a, (tx) =>
    grantRole(tx, a, { userId: alice.userId, roleId: "author" }, { kind: "operator", name: "setup" }),
  );
  await withTenantTx(db.ownerPool, a, async (tx) => {
    await tx.query("INSERT INTO ursitoare.team (tenant_id, team_id) VALUES ($1, $2)", [
      a.tenantId,
      "finance",
    ]);
    await tx.query(
      "INSERT INTO ursitoare.membership (tenant_id, membership_id, user_id, team_id, source, source_issuer) VALUES ($1, 'mem_1', $2, $3, 'idp_claim', $4)",
      [a.tenantId, alice.userId, "finance", ISS],
    );
  });
  return { a, b, alice, bob, robot, mallory };
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
const idsOf = (): IdSource => sequentialIds(1000);

function registryOf(): CommandRegistry {
  const registry = createCommandRegistry();
  registry.registerCommand("admin list-users", listUsersCommand);
  return registry;
}

const robotLine = (robot: User): string => `${robot.userId}\tservice\tactive\t\t\trobot`;
const aliceLine = (alice: User): string =>
  `${alice.userId}\thuman\tactive\tauthor\tfinance\t${SAFE_NAME}`;
const bobLine = (bob: User): string => `${bob.userId}\thuman\tactive\t\t\tBob`;

test("C-7eeb7890 admin list-users prints the tenant users by id", async () => {
  const db = await withTestDatabase();
  try {
    const { alice, bob, robot, mallory } = await withUsers(db);
    const stdout = capture();
    const stderr = capture();
    const code = await runCli(
      ["admin", "list-users", "--tenant", "tenant_a"],
      depsFor(registryOf(), ownerEnv(db), stdout, stderr, db, clockOf(), idsOf()),
    ).then((value) => value, (error: unknown) => error);
    assert.equal(code, 0, "the unconditional listing succeeds");
    assert.equal(stderr.text(), "");
    assert.equal(
      stdout.text(),
      `${robotLine(robot)}\n${aliceLine(alice)}\n${bobLine(bob)}\n`,
      "the users are listed in user_id order with their kind, state, roles, teams and name",
    );
    assert.ok(!stdout.text().includes(mallory.userId), "the other tenant's user never appears");
  } finally {
    await db.close();
  }
});

test("C-7eeb7890 admin list-users pages through the users with limit and after", async () => {
  const db = await withTestDatabase();
  try {
    const { alice, bob, robot } = await withUsers(db);
    const firstStdout = capture();
    const firstStderr = capture();
    const first = await runCli(
      ["admin", "list-users", "--tenant", "tenant_a", "--limit", "2"],
      depsFor(registryOf(), ownerEnv(db), firstStdout, firstStderr, db, clockOf(), idsOf()),
    ).then((value) => value, (error: unknown) => error);
    assert.equal(first, 0, "the limited page succeeds");
    assert.equal(firstStderr.text(), "");
    assert.equal(
      firstStdout.text(),
      `${robotLine(robot)}\n${aliceLine(alice)}\nnext: ${alice.userId}\n`,
      "the first page holds two lines and names the next user",
    );

    const secondStdout = capture();
    const secondStderr = capture();
    const second = await runCli(
      ["admin", "list-users", "--tenant", "tenant_a", "--limit", "2", "--after", alice.userId],
      depsFor(registryOf(), ownerEnv(db), secondStdout, secondStderr, db, clockOf(), idsOf()),
    ).then((value) => value, (error: unknown) => error);
    assert.equal(second, 0, "the continuation page succeeds");
    assert.equal(secondStderr.text(), "");
    assert.equal(
      secondStdout.text(),
      `${bobLine(bob)}\n`,
      "the page after the second user holds the last user alone",
    );
  } finally {
    await db.close();
  }
});

test("C-7eeb7890 admin list-users prints the users as JSON", async () => {
  const db = await withTestDatabase();
  try {
    const { alice, bob, robot, mallory } = await withUsers(db);
    const stdout = capture();
    const stderr = capture();
    const code = await runCli(
      ["admin", "list-users", "--tenant", "tenant_a", "--json"],
      depsFor(registryOf(), ownerEnv(db), stdout, stderr, db, clockOf(), idsOf()),
    ).then((value) => value, (error: unknown) => error);
    assert.equal(code, 0, "the JSON listing succeeds");
    assert.equal(stderr.text(), "");
    const text = stdout.text();
    assert.ok(text.endsWith("\n"), "the JSON listing ends with a newline");
    assert.ok(!text.slice(0, -1).includes("\n"), "the JSON listing is one line");
    assert.ok(text.includes("\\u001b"), "the escape sequence for the control character is written");
    assert.ok(text.includes("\\u202e"), "the escape sequence for the override is written");
    assert.ok(!text.includes("\u001b"), "the raw control character is not written");
    assert.ok(!text.includes("\u202e"), "the raw override is not written");
    const parsed = JSON.parse(text.slice(0, -1)) as {
      users: Record<string, unknown>[];
      next: string | null;
    };
    assert.equal(parsed.next, null);
    assert.deepEqual(parsed.users, [
      {
        userId: robot.userId,
        kind: "service",
        state: "active",
        displayName: "robot",
        email: null,
        ownerUserId: alice.userId,
        roles: [],
        teams: [],
      },
      {
        userId: alice.userId,
        kind: "human",
        state: "active",
        displayName: HOSTILE_NAME,
        email: "alice@example.test",
        ownerUserId: null,
        roles: ["author"],
        teams: ["finance"],
      },
      {
        userId: bob.userId,
        kind: "human",
        state: "active",
        displayName: "Bob B",
        email: null,
        ownerUserId: null,
        roles: [],
        teams: [],
      },
    ]);
    assert.ok(!text.includes(mallory.userId), "the other tenant's user never appears");
  } finally {
    await db.close();
  }
});

test("C-8ac5d5a4 admin list-users prints no users for an empty tenant", async () => {
  const db = await withTestDatabase();
  try {
    const { b } = await seedTwoTenants(db);
    const stdout = capture();
    const stderr = capture();
    const code = await runCli(
      ["admin", "list-users", "--tenant", "tenant_b"],
      depsFor(registryOf(), ownerEnv(db), stdout, stderr, db, clockOf(), idsOf()),
    ).then((value) => value, (error: unknown) => error);
    assert.equal(code, 0, "an empty listing is not an error");
    assert.equal(stderr.text(), "");
    assert.equal(stdout.text(), "no users\n");
    const events = await readEvents(db, b);
    assert.deepEqual(events.map((event) => event.event_type), ["cli.command_run"]);
    assert.deepEqual(events[0]?.payload, {
      command: "admin list-users",
      outcome: "ok",
      count: 0,
    });
  } finally {
    await db.close();
  }
});

test("C-8ac5d5a4 admin list-users refuses a bad limit and a bad after", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const badLimitAbcStdout = capture();
    const badLimitAbcStderr = capture();
    const badLimitAbc = await runCli(
      ["admin", "list-users", "--tenant", "tenant_a", "--limit", "abc"],
      depsFor(registryOf(), ownerEnv(db), badLimitAbcStdout, badLimitAbcStderr, db, clockOf(), idsOf()),
    ).then((value) => value, (error: unknown) => error);
    assert.equal(badLimitAbc, 2);
    assert.equal(badLimitAbcStdout.text(), "");
    assert.equal(badLimitAbcStderr.text(), "CLI_USAGE: --limit must be an integer from 1 to 200\n");

    const badLimitZeroStdout = capture();
    const badLimitZeroStderr = capture();
    const badLimitZero = await runCli(
      ["admin", "list-users", "--tenant", "tenant_a", "--limit", "0"],
      depsFor(registryOf(), ownerEnv(db), badLimitZeroStdout, badLimitZeroStderr, db, clockOf(), idsOf()),
    ).then((value) => value, (error: unknown) => error);
    assert.equal(badLimitZero, 2);
    assert.equal(badLimitZeroStdout.text(), "");
    assert.equal(badLimitZeroStderr.text(), "CLI_USAGE: --limit must be an integer from 1 to 200\n");

    const badAfterStdout = capture();
    const badAfterStderr = capture();
    const badAfter = await runCli(
      ["admin", "list-users", "--tenant", "tenant_a", "--after", "bad id!"],
      depsFor(registryOf(), ownerEnv(db), badAfterStdout, badAfterStderr, db, clockOf(), idsOf()),
    ).then((value) => value, (error: unknown) => error);
    assert.equal(badAfter, 2);
    assert.equal(badAfterStdout.text(), "");
    assert.equal(badAfterStderr.text(), "CLI_USAGE: --after is not a valid user id\n");

    const events = await readEvents(db, a);
    assert.deepEqual(
      events.map((event) => event.payload),
      [
        { command: "admin list-users", outcome: "refused", code: "CLI_USAGE" },
        { command: "admin list-users", outcome: "refused", code: "CLI_USAGE" },
        { command: "admin list-users", outcome: "refused", code: "CLI_USAGE" },
      ],
      "each bad flag leaves one refused command event",
    );
  } finally {
    await db.close();
  }
});
