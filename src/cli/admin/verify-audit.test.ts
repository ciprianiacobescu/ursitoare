import assert from "node:assert/strict";
import { test } from "node:test";

import { anchorHead, appendAuditCommitted } from "../../audit/index.ts";
import type { Env, SecretReader } from "../../config/index.ts";
import type { Clock, IdSource } from "../../core/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import type { CliOutput } from "../output.ts";
import { createCommandRegistry, type CommandRegistry } from "../registry.ts";
import { runCli, type CliDeps, type OwnerConnection } from "../run.ts";
import { verifyAuditCommand } from "./verify-audit.ts";

// The engine key of design § Test plan: built from parts at run time.
const ENGINE_KEY = "ab".repeat(32);
const COMMAND = ["admin", "verify-audit"] as const;

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

type Unknown = Record<string, unknown>;

interface AuditRow {
  event_type: string;
  actor: unknown;
  payload: Unknown;
}

async function readEvents(db: TestDatabase, ctx: TenantContext): Promise<AuditRow[]> {
  return withTenantTx(db.ownerPool, ctx, async (tx) => {
    const result = await tx.query<AuditRow>(
      "SELECT event_type, actor, payload FROM ursitoare.audit_event WHERE tenant_id = $1 ORDER BY seq",
      [ctx.tenantId],
    );
    return result.rows;
  });
}

function ownerEnv(db: TestDatabase, extra: Env = {}): Env {
  return {
    URSITOARE_DATABASE_OWNER_URL: db.ownerEndpoint.url,
    URSITOARE_DATABASE_OWNER_PASSWORD_FILE: "/run/owner-pw",
    ...extra,
  };
}

// The owner variables of design § Test plan, with the engine key named in a file.
function engineKeyEnv(db: TestDatabase): Env {
  return ownerEnv(db, { URSITOARE_ENGINE_KEY_FILE: "/run/engine-key" });
}

function readSecretFor(db: TestDatabase): SecretReader {
  return (path) => {
    if (path === "/run/owner-pw") {
      return db.ownerEndpoint.password?.reveal() ?? "";
    }
    if (path === "/run/engine-key") {
      return ENGINE_KEY;
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

async function seedEvents(db: TestDatabase, ctx: TenantContext, n: number): Promise<void> {
  for (let i = 1; i <= n; i++) {
    const at = fixedClock(`2031-03-10T00:00:${String(i).padStart(2, "0")}.000Z`);
    await assert.doesNotReject(async () => {
      await appendAuditCommitted(
        db.ownerPool,
        ctx,
        {
          eventType: "demo.touched",
          actor: { kind: "system", id: "op:seed" },
          target: { kind: "tenant", id: ctx.tenantId },
          payload: { n: i, leaf: "x" },
        },
        { clock: at },
      );
    });
  }
}

// The owner, with the tenant set, switches the named triggers off, runs the statement, switches them on
// (`tamper` as in src/audit/verify.test.ts).
async function tamper(
  db: TestDatabase,
  tenantId: string,
  sql: string,
  params: unknown[] = [],
  triggers: string[] = ["audit_event_append_only"],
): Promise<void> {
  const client = await db.ownerPool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    for (const t of triggers) {
      await client.query(`ALTER TABLE ursitoare.audit_event DISABLE TRIGGER ${t}`);
    }
    await client.query(sql, params);
    for (const t of triggers) {
      await client.query(`ALTER TABLE ursitoare.audit_event ENABLE TRIGGER ${t}`);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

test("C-30dfd9af admin verify-audit checks an intact chain and counts its anchors", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await seedEvents(db, a, 3);
    await assert.doesNotReject(async () => {
      await anchorHead(db.ownerPool, a, { reveal: () => ENGINE_KEY });
    });

    const registry = createCommandRegistry();
    registry.registerCommand("admin verify-audit", verifyAuditCommand);
    const env = engineKeyEnv(db);
    const run = (stdout: Captured, stderr: Captured, extra: readonly string[] = []): Promise<number> =>
      runCli(
        [...COMMAND, "--tenant", "tenant_a", ...extra],
        depsFor(registry, env, stdout, stderr, db, clockOf(), idsOf()),
      );

    const firstStdout = capture();
    const firstStderr = capture();
    const first = await run(firstStdout, firstStderr);
    assert.equal(first, 0, "the first check of an intact chain succeeds");
    assert.equal(firstStderr.text(), "");
    assert.equal(firstStdout.text(), "chain ok: 3 events checked\nanchors: 1 checked\n");

    const secondStdout = capture();
    const secondStderr = capture();
    const second = await run(secondStdout, secondStderr);
    assert.equal(second, 0, "the second check of an intact chain succeeds");
    assert.equal(secondStdout.text(), "chain ok: 4 events checked\nanchors: 1 checked\n");

    const jsonStdout = capture();
    const jsonStderr = capture();
    const third = await run(jsonStdout, jsonStderr, ["--json"]);
    assert.equal(third, 0, "the JSON check of an intact chain succeeds");
    assert.equal(
      jsonStdout.text(),
      '{"ok":true,"checked":5,"firstBadSeq":null,"reason":null,"anchorsChecked":true,"anchorsVerified":1}\n',
    );

    const eventsA = await readEvents(db, a);
    assert.equal(eventsA.length, 6, "three seeded events and one command event per check");
    assert.equal(eventsA[3]?.event_type, "cli.command_run");
    assert.deepEqual(eventsA[3]?.payload, {
      command: "admin verify-audit",
      outcome: "ok",
      ok: true,
      checked: 3,
      anchorsChecked: true,
      anchorsVerified: 1,
      firstBadSeq: null,
      reason: null,
    });
    assert.deepEqual(eventsA[4]?.payload, {
      command: "admin verify-audit",
      outcome: "ok",
      ok: true,
      checked: 4,
      anchorsChecked: true,
      anchorsVerified: 1,
      firstBadSeq: null,
      reason: null,
    });
    assert.deepEqual(eventsA[5]?.payload, {
      command: "admin verify-audit",
      outcome: "ok",
      ok: true,
      checked: 5,
      anchorsChecked: true,
      anchorsVerified: 1,
      firstBadSeq: null,
      reason: null,
    });

    const otherStdout = capture();
    const otherStderr = capture();
    const opi = await runCli(
      ["admin", "verify-audit", "--tenant", "tenant_b"],
      depsFor(registry, env, otherStdout, otherStderr, db, clockOf(), idsOf()),
    );
    assert.equal(opi, 0, "a check of an empty tenant succeeds");
    assert.equal(otherStdout.text(), "chain ok: 0 events checked\nanchors: none recorded yet\n");

    const eventsB = await readEvents(db, b);
    assert.equal(eventsB.length, 1, "tenant_b holds only its own command event");
    assert.deepEqual(eventsB[0]?.payload, {
      command: "admin verify-audit",
      outcome: "ok",
      ok: true,
      checked: 0,
      anchorsChecked: false,
      anchorsVerified: 0,
      firstBadSeq: null,
      reason: null,
    });
  } finally {
    await db.close();
  }
});

test("C-049c428b admin verify-audit reports a broken chain at its seq and exits 3", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedEvents(db, a, 3);
    await assert.doesNotReject(async () => {
      await tamper(
        db,
        a.tenantId,
        "UPDATE ursitoare.audit_event SET event_type = 'role.revoked' WHERE seq = 2",
        [],
        ["audit_event_append_only", "audit_event_head_match"],
      );
    });

    const registry = createCommandRegistry();
    registry.registerCommand("admin verify-audit", verifyAuditCommand);
    const env = engineKeyEnv(db);

    const firstStdout = capture();
    const firstStderr = capture();
    const first = await runCli(
      [...COMMAND, "--tenant", "tenant_a"],
      depsFor(registry, env, firstStdout, firstStderr, db, clockOf(), idsOf()),
    );
    assert.equal(first, 3, "a broken chain exits 3");
    assert.equal(firstStderr.text(), "");
    assert.equal(firstStdout.text(), "chain broken at seq 2: hash\nchecked: 1\n");

    const secondStdout = capture();
    const secondStderr = capture();
    const second = await runCli(
      ["admin", "verify-audit", "--tenant", "tenant_a"],
      depsFor(registry, env, secondStdout, secondStderr, db, clockOf(), idsOf()),
    );
    assert.equal(second, 3, "the second check of a broken chain also exits 3");
    assert.equal(secondStdout.text(), "chain broken at seq 2: hash\nchecked: 1\n");

    const eventsA = await readEvents(db, a);
    assert.equal(eventsA.length, 5, "three seeded events and one command event per check");
    assert.deepEqual(eventsA[3]?.payload, {
      command: "admin verify-audit",
      outcome: "ok",
      ok: false,
      checked: 1,
      firstBadSeq: "2",
      reason: "hash",
      anchorsChecked: false,
      anchorsVerified: 0,
    });
    assert.deepEqual(eventsA[4]?.payload, {
      command: "admin verify-audit",
      outcome: "ok",
      ok: false,
      checked: 1,
      firstBadSeq: "2",
      reason: "hash",
      anchorsChecked: false,
      anchorsVerified: 0,
    });
  } finally {
    await db.close();
  }
});

test("C-7683a50f admin verify-audit needs the engine key unless --no-anchors is passed", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await seedEvents(db, a, 3);
    const registry = createCommandRegistry();
    registry.registerCommand("admin verify-audit", verifyAuditCommand);
    const env = ownerEnv(db);

    const firstStdout = capture();
    const firstStderr = capture();
    const first = await runCli(
      [...COMMAND, "--tenant", "tenant_a"],
      depsFor(registry, env, firstStdout, firstStderr, db, clockOf(), idsOf()),
    );
    assert.equal(first, 1, "without the engine key the check refuses");
    assert.equal(firstStdout.text(), "");
    assert.equal(
      firstStderr.text(),
      "CLI_ENGINE_KEY_REQUIRED: set URSITOARE_ENGINE_KEY_FILE, or pass --no-anchors to check hashes only\n",
    );

    const secondStdout = capture();
    const secondStderr = capture();
    const second = await runCli(
      ["admin", "verify-audit", "--tenant", "tenant_a", "--no-anchors"],
      depsFor(registry, env, secondStdout, secondStderr, db, clockOf(), idsOf()),
    );
    assert.equal(second, 0, "a hash-only check succeeds");
    assert.equal(secondStdout.text(), "chain ok: 4 events checked\nanchors: not checked\n");

    const eventsA = await readEvents(db, a);
    assert.equal(eventsA.length, 5, "three seeded events and one command event per run");
    assert.deepEqual(eventsA[3]?.payload, {
      command: "admin verify-audit",
      outcome: "refused",
      code: "CLI_ENGINE_KEY_REQUIRED",
    });
    assert.deepEqual(eventsA[4]?.payload, {
      command: "admin verify-audit",
      outcome: "ok",
      ok: true,
      checked: 4,
      firstBadSeq: null,
      reason: null,
      anchorsChecked: false,
      anchorsVerified: 0,
    });
  } finally {
    await db.close();
  }
});
