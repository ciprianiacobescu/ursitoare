import assert from "node:assert/strict";
import { test } from "node:test";

import type pg from "pg";

import { appendAudit } from "../../audit/index.ts";
import type { Env, SecretReader } from "../../config/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { withTestDatabase } from "../../../test/support/pg.ts";
import type { TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { CliError } from "../errors.ts";
import type { CliOutput } from "../output.ts";
import { createCommandRegistry } from "../registry.ts";
import type { CliCommand, CommandRegistry } from "../registry.ts";
import type { CliDeps, OwnerConnection } from "../run.ts";
import { runCli } from "../run.ts";
import type { AdminSpec } from "./define.ts";
import { defineAdminCommand } from "./define.ts";

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
  actor: { kind: string; id: string };
  target: { kind: string; id: string } | null;
  payload: Record<string, unknown>;
}

async function readEvents(db: TestDatabase, ctx: TenantContext): Promise<AuditRow[]> {
  return withTenantTx(db.ownerPool, ctx, async (tx) => {
    const result = await tx.query<AuditRow>(
      "SELECT event_type, actor, target, payload FROM ursitoare.audit_event WHERE tenant_id = $1 ORDER BY seq",
      [ctx.tenantId],
    );
    return result.rows;
  });
}

function buildCommand(name: string, spec: AdminSpec): CliCommand {
  let command: CliCommand | undefined;
  assert.doesNotThrow(() => {
    command = defineAdminCommand(name, spec);
  }, "defineAdminCommand returns a command");
  assert.ok(command !== undefined, "defineAdminCommand returned a command");
  return command;
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
  connectOwner?: (endpoint: { url: string }) => OwnerConnection,
): CliDeps {
  return {
    env,
    stdout: stdout.output,
    stderr: stderr.output,
    registry,
    clock: fixedClock("2031-03-10T00:00:00.000Z"),
    ids: sequentialIds(1),
    readSecret: readSecretFor(db),
    connectOwner:
      connectOwner ?? (() => ({ pool: db.ownerPool, close: async () => undefined })),
  };
}

function demoSpec(onRun: AdminSpec["run"]): AdminSpec {
  return { summary: "Demo command", options: {}, run: onRun };
}

function appendTouched(
  tx: Parameters<AdminSpec["run"]>[0]["tx"],
  tenant: TenantContext,
  clock: Parameters<AdminSpec["run"]>[0]["clock"],
): Promise<unknown> {
  return appendAudit(
    tx,
    tenant,
    {
      eventType: "demo.touched",
      actor: { kind: "system", id: "demo" },
      payload: {},
    },
    { clock },
  );
}

function auditHeadFailingPool(pool: pg.Pool): pg.Pool {
  const rawQuery = (target: pg.Pool | pg.PoolClient): ((text: unknown, values?: unknown) => Promise<unknown>) =>
    target.query.bind(target) as (text: unknown, values?: unknown) => Promise<unknown>;
  const check = (text: unknown): void => {
    if (typeof text === "string" && text.includes("ursitoare.audit_head")) {
      throw new Error("audit head down");
    }
  };

  const wrapped = {
    query: async (text: unknown, values?: unknown): Promise<unknown> => {
      check(text);
      return rawQuery(pool)(text, values);
    },
    connect: async (): Promise<unknown> => {
      const client = await pool.connect();
      const raw = rawQuery(client);
      return {
        query: async (text: unknown, values?: unknown): Promise<unknown> => {
          check(text);
          return raw(text, values);
        },
        on: (event: "error", listener: () => void): void => {
          client.on(event, listener);
        },
        removeListener: (event: "error", listener: () => void): void => {
          client.removeListener(event, listener);
        },
        release: (destroy?: boolean): void => {
          client.release(destroy);
        },
      };
    },
  };
  return wrapped as unknown as pg.Pool;
}

test("C-4702f805 an admin command appends its event then the audit event and prints after the commit", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const registry = createCommandRegistry();
    const command = buildCommand(
      "admin demo",
      demoSpec(async (call) => {
        await appendTouched(call.tx, call.tenant, call.clock);
        return {
          lines: ["touched"],
          data: { touched: true, n: "a\u202eb\u009c" },
          audit: { count: 1 },
        };
      }),
    );
    registry.registerCommand("admin demo", command);

    const firstStdout = capture();
    const firstStderr = capture();
    const first = await runCli(
      ["admin", "demo", "--tenant", "tenant_a", "--operator", "ci"],
      depsFor(registry, ownerEnv(db), firstStdout, firstStderr, db),
    );
    assert.equal(first, 0);
    assert.equal(firstStdout.text(), "touched\n");
    assert.equal(firstStderr.text(), "");

    const secondStdout = capture();
    const secondStderr = capture();
    const second = await runCli(
      ["admin", "demo", "--tenant", "tenant_a"],
      depsFor(registry, ownerEnv(db, { USER: "alice" }), secondStdout, secondStderr, db),
    );
    assert.equal(second, 0);
    assert.equal(secondStdout.text(), "touched\n");
    assert.equal(secondStderr.text(), "");

    const thirdStdout = capture();
    const thirdStderr = capture();
    const third = await runCli(
      ["admin", "demo", "--tenant", "tenant_a"],
      depsFor(registry, ownerEnv(db), thirdStdout, thirdStderr, db),
    );
    assert.equal(third, 0);
    assert.equal(thirdStdout.text(), "touched\n");
    assert.equal(thirdStderr.text(), "");

    const jsonStdout = capture();
    const jsonStderr = capture();
    const jsonRun = await runCli(
      ["admin", "demo", "--tenant", "tenant_a", "--json"],
      depsFor(registry, ownerEnv(db), jsonStdout, jsonStderr, db),
    );
    assert.equal(jsonRun, 0);
    assert.equal(jsonStdout.text(), '{"touched":true,"n":"a\\u202eb\\u009c"}\n');
    assert.deepEqual(JSON.parse(jsonStdout.text()), {
      touched: true,
      n: "a\u202eb\u009c",
    });
    assert.equal(jsonStderr.text(), "");

    const events = await readEvents(db, a);
    assert.equal(events.length, 8, "each run appends its effect and its command event");
    const actors = ["operator:ci", "operator:alice", "operator:cli", "operator:cli"];
    for (let run = 0; run < 4; run += 1) {
      const effect = events[run * 2];
      const commandEvent = events[run * 2 + 1];
      assert.equal(effect?.event_type, "demo.touched");
      assert.equal(commandEvent?.event_type, "cli.command_run");
      assert.deepEqual(commandEvent?.actor, {
        kind: "system",
        id: actors[run],
      });
      assert.deepEqual(commandEvent?.target, { kind: "tenant", id: "tenant_a" });
      assert.deepEqual(commandEvent?.payload, {
        command: "admin demo",
        outcome: "ok",
        count: 1,
      });
    }
    assert.deepEqual(await readEvents(db, b), [], "the other tenant has no event");
  } finally {
    await db.close();
  }
});

test("C-8c557d34 a refusal or failure rolls the effect back and is audited in its own transaction", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const registry = createCommandRegistry();
    let failure: unknown = new CliError("CLI_NO_IDP", "no identity provider");
    const command = buildCommand(
      "admin demo",
      demoSpec(async (call) => {
        await appendTouched(call.tx, call.tenant, call.clock);
        throw failure;
      }),
    );
    registry.registerCommand("admin demo", command);

    const refusedStdout = capture();
    const refusedStderr = capture();
    const refused = await runCli(
      ["admin", "demo", "--tenant", "tenant_a"],
      depsFor(registry, ownerEnv(db), refusedStdout, refusedStderr, db),
    );
    assert.equal(refused, 1);
    assert.equal(refusedStdout.text(), "");
    assert.equal(refusedStderr.text(), "CLI_NO_IDP: no identity provider\n");

    failure = new Error("boom");
    const failedStdout = capture();
    const failedStderr = capture();
    const failed = await runCli(
      ["admin", "demo", "--tenant", "tenant_a"],
      depsFor(registry, ownerEnv(db), failedStdout, failedStderr, db),
    );
    assert.equal(failed, 1);
    assert.equal(failedStdout.text(), "");
    assert.equal(failedStderr.text(), "CLI_INTERNAL: command failed\n");

    const events = await readEvents(db, a);
    assert.deepEqual(
      events.map((event) => event.event_type),
      ["cli.command_run", "cli.command_run"],
      "the rolled-back effect leaves no event",
    );
    assert.deepEqual(events[0]?.payload, {
      command: "admin demo",
      outcome: "refused",
      code: "CLI_NO_IDP",
    });
    assert.deepEqual(events[1]?.payload, {
      command: "admin demo",
      outcome: "failed",
      code: "CLI_INTERNAL",
    });
  } finally {
    await db.close();
  }
});

test("C-0222fcc1 an audit store failure exits 1 with CLI_AUDIT_FAILED and leaves the chain empty", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const registry = createCommandRegistry();
    const command = buildCommand(
      "admin demo",
      demoSpec(async () => ({ lines: ["ok"], data: {}, audit: {} })),
    );
    registry.registerCommand("admin demo", command);

    const failingPool = auditHeadFailingPool(db.ownerPool);
    const stdout = capture();
    const stderr = capture();
    const code = await runCli(
      ["admin", "demo", "--tenant", "tenant_a"],
      depsFor(
        registry,
        ownerEnv(db),
        stdout,
        stderr,
        db,
        () => ({ pool: failingPool, close: async () => undefined }),
      ),
    );
    assert.equal(code, 1);
    assert.equal(stdout.text(), "");
    assert.equal(
      stderr.text(),
      "CLI_INTERNAL: command failed\nCLI_AUDIT_FAILED: audit event could not be written\n",
    );
    assert.deepEqual(await readEvents(db, a), [], "tenant_a's chain is empty");
    assert.deepEqual(await readEvents(db, b), [], "tenant_b's chain is empty");
  } finally {
    await db.close();
  }
});

test("C-691e0be0 several tenants without a choice are refused and reserved options are invalid", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const registry = createCommandRegistry();
    let runs = 0;
    const command = buildCommand(
      "admin demo",
      demoSpec(async () => {
        runs += 1;
        return { lines: ["touched"], data: {}, audit: {} };
      }),
    );
    registry.registerCommand("admin demo", command);

    const stdout = capture();
    const stderr = capture();
    const code = await runCli(
      ["admin", "demo"],
      depsFor(registry, ownerEnv(db), stdout, stderr, db),
    );
    assert.equal(code, 1);
    assert.equal(stdout.text(), "");
    assert.equal(
      stderr.text(),
      "CLI_TENANT_REQUIRED: several tenants exist; pass --tenant <id>\n",
    );
    assert.equal(runs, 0, "the command never runs without a tenant");
    assert.deepEqual(await readEvents(db, a), [], "tenant_a's chain stays empty");
    assert.deepEqual(await readEvents(db, b), [], "tenant_b's chain stays empty");

    for (const reserved of ["tenant", "operator", "json"]) {
      assert.throws(
        () =>
          defineAdminCommand("admin clash", {
            summary: "Clash",
            options: { [reserved]: { type: "string", summary: "Reserved" } },
            async run(): Promise<never> {
              throw new Error("unused");
            },
          }),
        { code: "CLI_INVALID_COMMAND" },
        `a spec option named ${reserved} is refused`,
      );
    }
  } finally {
    await db.close();
  }
});
