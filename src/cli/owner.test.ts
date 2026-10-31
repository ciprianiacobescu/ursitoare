import assert from "node:assert/strict";
import { test } from "node:test";

import type pg from "pg";

import type { DatabaseEndpoint, Env, SecretReader } from "../config/index.ts";
import type { CliOutput } from "./output.ts";
import type { CliCommand, CommandRegistry } from "./registry.ts";
import { createCommandRegistry } from "./registry.ts";
import type { CliDeps, OwnerConnection } from "./run.ts";
import { runCli } from "./run.ts";
import { withTestDatabase } from "../../test/support/pg.ts";

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

function depsFor(
  registry: CommandRegistry,
  env: Env,
  stdout: Captured,
  stderr: Captured,
  connectOwner: (endpoint: DatabaseEndpoint) => OwnerConnection,
  readSecret: SecretReader,
): CliDeps {
  return {
    env,
    stdout: stdout.output,
    stderr: stderr.output,
    registry,
    connectOwner,
    readSecret,
  };
}

test("C-266f7983 a database command opens the owner connection, reads as ursitoare_owner and closes once", async () => {
  const db = await withTestDatabase();
  try {
    const registry = createCommandRegistry();
    let runs = 0;
    let fail = false;
    const probe: CliCommand = {
      summary: "Probe",
      options: {},
      database: true,
      async run(call): Promise<number> {
        runs += 1;
        assert.ok(call.owner !== null, "the command sees the owner connection");
        if (fail) {
          throw new Error("probe failed");
        }
        const result = await call.owner.pool.query<{ u: string }>("SELECT session_user AS u");
        call.stdout.write(`${result.rows[0]?.u ?? ""}\n`);
        return 0;
      },
    };
    registry.registerCommand("probe", probe);

    const env: Env = {
      URSITOARE_DATABASE_OWNER_URL: db.ownerEndpoint.url,
      URSITOARE_DATABASE_OWNER_PASSWORD_FILE: "/run/owner-pw",
    };
    const readSecret: SecretReader = (path) => {
      assert.equal(path, "/run/owner-pw");
      return db.ownerEndpoint.password?.reveal() ?? "";
    };
    const seen: string[] = [];
    let closes = 0;
    const connectOwner = (endpoint: DatabaseEndpoint): OwnerConnection => {
      seen.push(endpoint.url);
      return {
        pool: db.ownerPool,
        close: async () => {
          closes += 1;
        },
      };
    };

    const firstStdout = capture();
    const firstStderr = capture();
    const first = await runCli(
      ["probe"],
      depsFor(registry, env, firstStdout, firstStderr, connectOwner, readSecret),
    );
    assert.equal(first, 0);
    assert.equal(firstStdout.text(), "ursitoare_owner\n");
    assert.equal(firstStderr.text(), "");
    assert.deepEqual(seen, [db.ownerEndpoint.url]);
    assert.equal(closes, 1, "the connection is closed once after the run");

    fail = true;
    const secondStdout = capture();
    const secondStderr = capture();
    const second = await runCli(
      ["probe"],
      depsFor(registry, env, secondStdout, secondStderr, connectOwner, readSecret),
    );
    assert.equal(second, 1);
    assert.equal(secondStdout.text(), "");
    assert.equal(secondStderr.text(), "CLI_INTERNAL: command failed\n");
    assert.equal(closes, 2, "the connection is closed again even when the command throws");
    assert.equal(runs, 2);
  } finally {
    await db.close();
  }
});

test("C-58ad99e6 a top-level command skips configuration and connection, a database command loads it lazily", async () => {
  const registry = createCommandRegistry();
  let ownerSeen: unknown = "unset";
  registry.registerCommand("selftest", {
    summary: "Selftest",
    options: {},
    database: false,
    async run(call): Promise<number> {
      ownerSeen = call.owner;
      call.stdout.write("hello\n");
      return 0;
    },
  });

  let probeRuns = 0;
  registry.registerCommand("admin probe", {
    summary: "Probe",
    options: {},
    database: true,
    async run(): Promise<number> {
      probeRuns += 1;
      return 0;
    },
  });

  let connects = 0;
  const connectOwner = (): OwnerConnection => {
    connects += 1;
    throw new Error("must not connect");
  };
  const readSecret: SecretReader = () => "unused";
  const env: Env = { URSITOARE_PORT: "abc" };

  const firstStdout = capture();
  const firstStderr = capture();
  const first = await runCli(
    ["selftest"],
    depsFor(registry, env, firstStdout, firstStderr, connectOwner, readSecret),
  );
  assert.equal(first, 0);
  assert.equal(firstStdout.text(), "hello\n");
  assert.equal(firstStderr.text(), "");
  assert.equal(ownerSeen, null, "a top-level command sees no owner connection");
  assert.equal(connects, 0, "a top-level command never connects");
  assert.equal(probeRuns, 0);

  const secondStdout = capture();
  const secondStderr = capture();
  const second = await runCli(
    ["admin", "probe"],
    depsFor(registry, env, secondStdout, secondStderr, connectOwner, readSecret),
  );
  assert.equal(second, 1);
  assert.equal(secondStdout.text(), "");
  assert.equal(
    secondStderr.text(),
    "CLI_CONFIG_INVALID: URSITOARE_PORT: must be an integer from 1 to 65535\n",
  );
  assert.equal(connects, 0, "a bad configuration is refused before connecting");
  assert.equal(probeRuns, 0, "the command never runs");
});

test("C-0caf6f63 a database command refuses missing, empty, wrong-role and unreachable owner settings", async () => {
  const db = await withTestDatabase();
  try {
    const registry = createCommandRegistry();
    let runs = 0;
    registry.registerCommand("probe", {
      summary: "Probe",
      options: {},
      database: true,
      async run(): Promise<number> {
        runs += 1;
        return 0;
      },
    });

    const missingStdout = capture();
    const missingStderr = capture();
    let missingConnects = 0;
    const missing = await runCli(
      ["probe"],
      depsFor(
        registry,
        {},
        missingStdout,
        missingStderr,
        () => {
          missingConnects += 1;
          return { pool: db.ownerPool, close: async () => undefined };
        },
        () => "unused",
      ),
    );
    assert.equal(missing, 1);
    assert.equal(missingStdout.text(), "");
    assert.equal(
      missingStderr.text(),
      "CLI_OWNER_REQUIRED: set URSITOARE_DATABASE_OWNER_URL and URSITOARE_DATABASE_OWNER_PASSWORD_FILE for this command\n",
    );
    assert.equal(missingConnects, 0, "no endpoint means no connection");

    let emptyConnects = 0;
    const emptyStdout = capture();
    const emptyStderr = capture();
    const empty = await runCli(
      ["probe"],
      depsFor(
        registry,
        {
          URSITOARE_DATABASE_OWNER_URL: db.ownerEndpoint.url,
          URSITOARE_DATABASE_OWNER_PASSWORD_FILE: "/run/owner-pw",
        },
        emptyStdout,
        emptyStderr,
        () => {
          emptyConnects += 1;
          return { pool: db.ownerPool, close: async () => undefined };
        },
        () => "",
      ),
    );
    assert.equal(empty, 1);
    assert.equal(emptyStdout.text(), "");
    assert.equal(
      emptyStderr.text(),
      "CLI_CONFIG_INVALID: URSITOARE_DATABASE_OWNER_PASSWORD_FILE: file is missing, unreadable or empty\n",
    );
    assert.equal(emptyConnects, 0, "an empty secret is refused before connecting");

    let wrongConnects = 0;
    let wrongCloses = 0;
    const wrongStdout = capture();
    const wrongStderr = capture();
    const wrongRole = await runCli(
      ["probe"],
      depsFor(
        registry,
        {
          URSITOARE_DATABASE_OWNER_URL: db.appEndpoint.url,
          URSITOARE_DATABASE_OWNER_PASSWORD_FILE: "/run/app-pw",
        },
        wrongStdout,
        wrongStderr,
        () => {
          wrongConnects += 1;
          return {
            pool: db.appPool,
            close: async () => {
              wrongCloses += 1;
            },
          };
        },
        () => db.appEndpoint.password?.reveal() ?? "",
      ),
    );
    assert.equal(wrongRole, 1);
    assert.equal(wrongStdout.text(), "");
    assert.equal(
      wrongStderr.text(),
      "CLI_OWNER_ROLE_INVALID: the owner variables must name the ursitoare_owner role\n",
    );
    assert.equal(wrongConnects, 1);
    assert.equal(wrongCloses, 1, "the wrong-role connection is closed once");

    const failingPool = {
      query: async () => {
        throw new Error("connect ECONNREFUSED pw-secret-xyz");
      },
    } as unknown as pg.Pool;
    let unreachableConnects = 0;
    let unreachableCloses = 0;
    const unreachableStdout = capture();
    const unreachableStderr = capture();
    const unreachable = await runCli(
      ["probe"],
      depsFor(
        registry,
        {
          URSITOARE_DATABASE_OWNER_URL: db.ownerEndpoint.url,
          URSITOARE_DATABASE_OWNER_PASSWORD_FILE: "/run/owner-pw",
        },
        unreachableStdout,
        unreachableStderr,
        () => {
          unreachableConnects += 1;
          return {
            pool: failingPool,
            close: async () => {
              unreachableCloses += 1;
            },
          };
        },
        () => db.ownerEndpoint.password?.reveal() ?? "",
      ),
    );
    assert.equal(unreachable, 1);
    assert.equal(unreachableStdout.text(), "");
    assert.equal(
      unreachableStderr.text(),
      "CLI_DATABASE_UNAVAILABLE: the database is unreachable with the owner credentials\n",
    );
    assert.equal(unreachableConnects, 1);
    assert.equal(unreachableCloses, 1, "the unreachable connection is closed once");
    assert.doesNotMatch(unreachableStdout.text() + unreachableStderr.text(), /pw-secret-xyz/);
    assert.doesNotMatch(unreachableStdout.text() + unreachableStderr.text(), /ECONNREFUSED/);
    assert.equal(runs, 0, "a refused owner connection never runs the command");
  } finally {
    await db.close();
  }
});
