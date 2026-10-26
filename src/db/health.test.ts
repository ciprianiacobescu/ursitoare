import assert from "node:assert/strict";
import { test } from "node:test";

import type pg from "pg";

import { DbError, createDbHealthCheck } from "./index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";

interface RuntimeRow {
  migrated: boolean;
  rolsuper: boolean;
  rolbypassrls: boolean;
  owns_schema: boolean;
  owner_member: boolean;
  privileged_member: boolean;
}

type StubPool = Pick<pg.Pool, "query">;

function healthy(overrides: Partial<RuntimeRow> = {}): RuntimeRow {
  return {
    migrated: true,
    rolsuper: false,
    rolbypassrls: false,
    owns_schema: false,
    owner_member: false,
    privileged_member: false,
    ...overrides,
  };
}

function poolWith(answer: RuntimeRow | "reject" | "hang"): StubPool {
  const query = async (): Promise<{ rows: RuntimeRow[] }> => {
    if (answer === "reject") {
      throw new Error("the connection is gone");
    }
    if (answer === "hang") {
      return await new Promise<{ rows: RuntimeRow[] }>(() => undefined);
    }
    return { rows: [answer] };
  };
  return { query: query as unknown as StubPool["query"] };
}

function badOption(error: unknown): boolean {
  assert.ok(error instanceof DbError, "throws a DbError");
  assert.equal(error.code, "DB_INVALID");
  assert.equal(error.details.reason, "bad_option");
  return true;
}

test("C-ebfa9bed createDbHealthCheck reports ok only for a migrated unprivileged role", async () => {
  assert.equal(await createDbHealthCheck(poolWith(healthy()))(), "ok");

  const failing: Partial<RuntimeRow>[] = [
    { migrated: false },
    { rolsuper: true },
    { rolbypassrls: true },
    { owns_schema: true },
    { owner_member: true },
    { privileged_member: true },
  ];

  for (const override of failing) {
    assert.equal(
      await createDbHealthCheck(poolWith(healthy(override)))(),
      "fail",
      `a role with ${JSON.stringify(override)} is unhealthy`,
    );
  }
});

test("C-ebfa9bed createDbHealthCheck fails closed when the query rejects or times out", async () => {
  assert.equal(await createDbHealthCheck(poolWith("reject"))(), "fail");
  assert.equal(await createDbHealthCheck(poolWith("hang"), { timeoutMs: 10 })(), "fail");
});

test("C-ebfa9bed createDbHealthCheck refuses an invalid timeout before querying", () => {
  for (const timeoutMs of [0, 60001, 1.5]) {
    let calls = 0;
    const query = async (): Promise<{ rows: RuntimeRow[] }> => {
      calls += 1;
      return { rows: [healthy()] };
    };
    const pool = { query: query as unknown as StubPool["query"] };

    assert.throws(
      () => createDbHealthCheck(pool, { timeoutMs }),
      badOption,
      `timeoutMs ${String(timeoutMs)} is refused`,
    );
    assert.equal(calls, 0, "no query runs for an invalid timeout");
  }
});

test("C-ebfa9bed createDbHealthCheck reports ok for a migrated test database", async () => {
  const database = await withTestDatabase();

  try {
    const check = createDbHealthCheck(database.appPool);
    assert.equal(await check(), "ok");
  } finally {
    await database.close();
  }
});

test("C-ebfa9bed createDbHealthCheck reports fail for an unmigrated test database", async () => {
  const database = await withTestDatabase({ migrated: false });

  try {
    const check = createDbHealthCheck(database.appPool);
    assert.equal(await check(), "fail");
  } finally {
    await database.close();
  }
});

test("C-ebfa9bed createDbHealthCheck reports fail after the test database is closed", async () => {
  const database = await withTestDatabase();
  const check = createDbHealthCheck(database.appPool);

  await database.close();
  await database.close();

  assert.equal(await check(), "fail");
});
