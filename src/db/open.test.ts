import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";

import { openDatabase, type Database, type EndpointLike, type OpenDeps } from "./index.ts";
import {
  freePort,
  readTestCluster,
  withTestDatabase,
  type TestCluster,
} from "../../test/support/pg.ts";

type Check = () => Promise<"ok" | "fail">;
type Config = { database: { app: EndpointLike | null; owner: EndpointLike | null } };

interface Harness {
  deps: OpenDeps;
  registered: string[];
  checks: Map<string, Check>;
  warns: { obj: object; msg: string }[];
  sleeps: number[];
}

function harness(extra: Partial<OpenDeps> = {}): Harness {
  const registered: string[] = [];
  const checks = new Map<string, Check>();
  const warns: { obj: object; msg: string }[] = [];
  const sleeps: number[] = [];
  const deps: OpenDeps = {
    health: {
      registerHealthCheck: (name, check) => {
        registered.push(name);
        checks.set(name, check);
      },
    },
    logger: {
      warn: (obj, msg) => {
        warns.push({ obj, msg });
      },
    },
    ...extra,
  };
  return { deps, registered, checks, warns, sleeps };
}

async function attempt(
  config: Config,
  deps: OpenDeps,
): Promise<{ value: Database | null | undefined; error: unknown }> {
  try {
    return { value: await openDatabase(config, deps), error: undefined };
  } catch (error) {
    return { value: undefined, error };
  }
}

function codeOf(error: unknown): unknown {
  return (error as { code?: unknown } | undefined)?.code;
}

function detailsOf(error: unknown): Record<string, unknown> {
  return (error as { details?: Record<string, unknown> } | undefined)?.details ?? {};
}

function appOnly(app: EndpointLike): Config {
  return { database: { app, owner: null } };
}

function advancing(h: Harness, start = 1_000_000, onFirst?: () => Promise<void>) {
  let now = start;
  return {
    clock: { now: () => new Date(now) },
    sleep: async (ms: number) => {
      h.sleeps.push(ms);
      now += ms;
      if (h.sleeps.length === 1 && onFirst !== undefined) {
        await onFirst();
      }
    },
  };
}

const EXTRA_PASSWORD = "open-test-pw";
const LATE_PASSWORD = "late-super-pw";

let cluster: TestCluster | undefined;
let adminPool: pg.Pool | undefined;
const createdRoles: string[] = [];

function shared(): TestCluster {
  if (cluster === undefined) {
    throw new Error("cluster not read");
  }
  return cluster;
}

function admin(): pg.Pool {
  if (adminPool === undefined) {
    throw new Error("admin pool not open");
  }
  return adminPool;
}

before(() => {
  cluster = readTestCluster();
  adminPool = new pg.Pool({ connectionString: cluster.adminUrl, max: 2 });
});

after(async () => {
  if (adminPool === undefined) {
    return;
  }
  for (const role of createdRoles.slice().reverse()) {
    await adminPool.query(`DROP ROLE IF EXISTS "${role}"`);
  }
  await adminPool.end();
});

function uniqueRole(prefix: string): string {
  const name = `${prefix}_${randomBytes(6).toString("hex")}`;
  createdRoles.push(name);
  return name;
}

function loginEndpoint(role: string, database: string): EndpointLike {
  const c = shared();
  return {
    url: `postgres://${role}@${c.host}:${c.port}/${database}`,
    password: { reveal: () => EXTRA_PASSWORD },
  };
}

async function createLogin(role: string, attributes: string): Promise<void> {
  await admin().query(`CREATE ROLE "${role}" LOGIN ${attributes} PASSWORD '${EXTRA_PASSWORD}'`);
}

test("C-1f0e219e openDatabase returns null for no endpoint and warns once for an owner alone", async () => {
  const none = harness();
  const first = await attempt({ database: { app: null, owner: null } }, none.deps);
  assert.equal(first.error, undefined);
  assert.equal(first.value, null);
  assert.deepEqual(none.registered, []);
  assert.deepEqual(none.warns, []);

  const db = await withTestDatabase();
  try {
    const ownerOnly = harness();
    const second = await attempt(
      { database: { app: null, owner: db.ownerEndpoint } },
      ownerOnly.deps,
    );
    assert.equal(second.error, undefined);
    assert.equal(second.value, null);
    assert.deepEqual(ownerOnly.registered, []);
    assert.equal(ownerOnly.warns.length, 1);
    assert.deepEqual(ownerOnly.warns[0]?.obj, { code: "DB_INVALID", reason: "owner_without_app" });
    assert.equal(
      ownerOnly.warns[0]?.msg,
      "URSITOARE_DATABASE_OWNER_URL is set without URSITOARE_DATABASE_URL; database disabled",
    );
  } finally {
    await db.close();
  }
});

test("C-869163e0 openDatabase registers db once, ok, then fail after close twice", async () => {
  const db = await withTestDatabase();
  const h = harness();
  try {
    const result = await attempt(appOnly(db.appEndpoint), h.deps);
    assert.equal(result.error, undefined);
    const database = result.value;
    assert.ok(database, "a Database is returned");
    assert.deepEqual(h.registered, ["db"]);
    assert.deepEqual(h.warns, []);
    const check = h.checks.get("db");
    assert.ok(check);
    assert.equal(await check(), "ok");
    await database.close();
    await database.close();
    assert.equal(await check(), "fail");
  } finally {
    await db.close();
  }
});

test("C-7454acfb openDatabase on an unmigrated database registers db, fails it and warns once", async () => {
  const db = await withTestDatabase({ migrated: false });
  const h = harness();
  try {
    const result = await attempt(appOnly(db.appEndpoint), h.deps);
    assert.equal(result.error, undefined);
    const database = result.value;
    assert.ok(database, "a Database is returned");
    try {
      assert.deepEqual(h.registered, ["db"]);
      assert.equal(await h.checks.get("db")?.(), "fail");
      assert.equal(h.warns.length, 1);
      assert.deepEqual(h.warns[0]?.obj, { code: "DB_UNAVAILABLE", reason: "not_migrated" });
      assert.equal(h.warns[0]?.msg, "database is not migrated; run the migrations");
    } finally {
      await database.close();
    }
  } finally {
    await db.close();
  }
});

test("C-32617fd8 openDatabase fails closed on a closed port after one sleep of the remaining time", async () => {
  const port = await freePort();
  const h = harness();
  const time = advancing(h);
  const result = await attempt(
    appOnly({
      url: `postgres://u@127.0.0.1:${port}/d`,
      password: { reveal: () => "pw-closed" },
    }),
    { ...h.deps, openTimeoutMs: 50, sleep: time.sleep, clock: time.clock },
  );
  assert.equal(codeOf(result.error), "DB_UNAVAILABLE");
  assert.equal(detailsOf(result.error).reason, "ECONNREFUSED");
  assert.doesNotMatch(String((result.error as Error).message), /pw-closed/);
  assert.deepEqual(h.sleeps, [50]);
  assert.deepEqual(h.registered, []);
  assert.deepEqual(h.warns, []);
});

test("C-faf8f8a6 openDatabase refuses a superuser whose cluster starts during the first sleep", async () => {
  const port = await freePort();
  const dataDir = await mkdtemp(join(tmpdir(), "ursitoare-late-"));
  const embedded = new EmbeddedPostgres({
    databaseDir: dataDir,
    port,
    user: "postgres",
    password: LATE_PASSWORD,
    authMethod: "scram-sha-256",
    persistent: false,
    postgresFlags: [
      "-c",
      "fsync=off",
      "-c",
      "synchronous_commit=off",
      "-c",
      "full_page_writes=off",
      "-c",
      "max_connections=300",
      "-c",
      "listen_addresses=127.0.0.1",
    ],
    onLog: () => undefined,
    onError: () => undefined,
  });
  const h = harness();
  let started = false;
  const time = advancing(h, 1_000_000, async () => {
    await embedded.initialise();
    await embedded.start();
    started = true;
  });
  try {
    const result = await attempt(
      appOnly({
        url: `postgres://postgres@127.0.0.1:${port}/postgres`,
        password: { reveal: () => LATE_PASSWORD },
      }),
      { ...h.deps, openTimeoutMs: 60000, sleep: time.sleep, clock: time.clock },
    );
    assert.equal(codeOf(result.error), "DB_ROLE_UNSAFE");
    assert.equal(detailsOf(result.error).reason, "superuser");
    assert.equal(h.sleeps.length, 1);
    assert.deepEqual(h.registered, []);
  } finally {
    if (started) {
      await embedded.stop();
    }
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("C-69717e99 openDatabase refuses every privileged app endpoint and registers nothing", async () => {
  const db = await withTestDatabase();
  const bypassLogin = uniqueRole("open_bypass");
  const ownerMember = uniqueRole("open_ownmem");
  const privMember = uniqueRole("open_privmem");
  const bypassGroup = uniqueRole("open_bypassgrp");
  try {
    await createLogin(bypassLogin, "BYPASSRLS");
    await createLogin(ownerMember, "");
    await admin().query(`GRANT ursitoare_owner TO "${ownerMember}"`);
    await admin().query(`CREATE ROLE "${bypassGroup}" NOLOGIN BYPASSRLS`);
    await createLogin(privMember, "");
    await admin().query(`GRANT "${bypassGroup}" TO "${privMember}"`);

    const cases: [string, EndpointLike][] = [
      [
        "superuser",
        {
          url: shared().adminUrl.replace(/\/postgres$/, `/${db.name}`),
          password: null,
        },
      ],
      ["bypassrls", loginEndpoint(bypassLogin, db.name)],
      ["owns_schema", db.ownerEndpoint],
      ["owner_member", loginEndpoint(ownerMember, db.name)],
      ["privileged_member", loginEndpoint(privMember, db.name)],
    ];
    for (const [reason, endpoint] of cases) {
      const h = harness();
      const result = await attempt(appOnly(endpoint), h.deps);
      assert.equal(codeOf(result.error), "DB_ROLE_UNSAFE", reason);
      assert.equal(detailsOf(result.error).reason, reason);
      assert.deepEqual(h.registered, [], reason);
    }
  } finally {
    await db.close();
  }
});

test("C-32617fd8 openDatabase rejects a bad openTimeoutMs and a bad scheme without sleeping", async () => {
  const db = await withTestDatabase();
  try {
    const h = harness();
    const time = advancing(h);
    const badTimeout = await attempt(appOnly(db.appEndpoint), {
      ...h.deps,
      openTimeoutMs: -1,
      sleep: time.sleep,
      clock: time.clock,
    });
    assert.equal(codeOf(badTimeout.error), "DB_INVALID");
    assert.equal(detailsOf(badTimeout.error).reason, "bad_option");

    const badScheme = await attempt(appOnly({ url: "mysql://u@h/d", password: null }), {
      ...h.deps,
      sleep: time.sleep,
      clock: time.clock,
    });
    assert.equal(codeOf(badScheme.error), "DB_INVALID");
    assert.equal(detailsOf(badScheme.error).reason, "bad_scheme");
    assert.deepEqual(h.sleeps, []);
    assert.deepEqual(h.registered, []);
  } finally {
    await db.close();
  }
});
