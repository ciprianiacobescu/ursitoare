import assert from "node:assert/strict";
import { test } from "node:test";
import type { FastifyInstance, FastifyRequest } from "fastify";

import { sequentialIds } from "../core/index.ts";
import type { Clock } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import type { Principal } from "../identity/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import type { IdempotentResponse } from "./idempotency.ts";
import { respondIdempotent } from "./idempotency.ts";
import { buildServer } from "./server.ts";
import type { ServerDeps } from "./server.ts";

assert.equal(typeof respondIdempotent, "function");

const silentDestination: LogDestination = { write(): void {} };
const BASE_ISO = "2026-10-25T09:00:00Z";

function mutableClock(): Clock {
  const iso = BASE_ISO;
  return { now: () => new Date(Date.parse(iso)) };
}

function deps(): ServerDeps {
  return {
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  };
}

type MutableRequest = FastifyRequest & {
  principal?: Principal;
  tenant?: TenantContext;
};

function identityHook(tenant: TenantContext): (request: FastifyRequest) => Promise<void> {
  return async (request: FastifyRequest): Promise<void> => {
    const req = request as MutableRequest;
    req.principal = {
      tenantId: tenant.tenantId,
      userId: "u_1",
      kind: "human",
      roles: [],
      teams: [],
      actorChain: [],
    };
    req.tenant = tenant;
  };
}

function bareHook(): (request: FastifyRequest) => Promise<void> {
  return async (): Promise<void> => {};
}

interface Answer {
  status: number;
  body: Record<string, unknown>;
  replayedHeader: string | undefined;
}

async function injectWrite(
  server: FastifyInstance,
  url: string,
  body: unknown,
  key: string | null,
): Promise<Answer> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (key !== null) {
    headers["idempotency-key"] = key;
  }
  const response = await server.inject({
    method: "POST",
    url,
    headers,
    payload: JSON.stringify(body),
  });
  const replayed = response.headers["idempotent-replayed"];
  return {
    status: response.statusCode,
    body: response.json() as Record<string, unknown>,
    replayedHeader: typeof replayed === "string" ? replayed : undefined,
  };
}

interface Envelope {
  status: number;
  code: string;
  fields: { field: string }[] | undefined;
}

function envelopeOf(answer: Answer): Envelope {
  const error = answer.body.error as { code?: string; details?: { fields?: { field: string }[] } } | undefined;
  return {
    status: answer.status,
    code: error?.code ?? "",
    fields: error?.details?.fields,
  };
}

async function assertKeyTable(db: Awaited<ReturnType<typeof withTestDatabase>>, tenant: TenantContext): Promise<void> {
  const result = await withTenantTx(db.appPool, tenant, async (tx) => {
    return tx.query("SELECT to_regclass('ursitoare.idempotency_key') IS NOT NULL AS found");
  });
  const row = (result.rows[0] ?? {}) as { found?: boolean };
  assert.ok(row.found === true, "ursitoare.idempotency_key exists");
}

const WRITE_URL = "/writes";
const BARE_URL = "/bare";

test("C-e03cac86 a repeated create through the route replays and a changed body is refused", async (t) => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await assertKeyTable(db, a);
    const clock = mutableClock();
    const server = await buildServer(deps());
    t.after(async () => {
      await server.close();
    });

    const calls = { n: 0 };
    const fn = async (): Promise<IdempotentResponse> => {
      calls.n += 1;
      return { status: 201, body: { id: "f_" + calls.n } };
    };
    const handler = async (request: FastifyRequest, reply: Parameters<typeof respondIdempotent>[2]) => {
      return respondIdempotent({ pool: db.appPool, clock }, request, reply, fn);
    };
    server.post(WRITE_URL, { onRequest: identityHook(a) }, handler);
    await server.ready();

    const first = await injectWrite(server, WRITE_URL, { part: "a" }, "k1");
    assert.equal(first.status, 201, "the first create answers 201");
    assert.deepEqual(first.body, { id: "f_1" }, "the first create answers the written body");
    assert.ok(first.replayedHeader === undefined, "the first create carries no replay header");
    assert.equal(calls.n, 1, "the write ran once");

    const repeat = await injectWrite(server, WRITE_URL, { part: "a" }, "k1");
    assert.equal(repeat.status, 201, "the repeated create answers 201");
    assert.deepEqual(repeat.body, { id: "f_1" }, "the repeat answers the stored body");
    assert.equal(repeat.replayedHeader, "true", "the repeat marks the replay");
    assert.equal(calls.n, 1, "the stored write ran once in total");

    const changed = await injectWrite(server, WRITE_URL, { part: "b" }, "k1");
    const reused = envelopeOf(changed);
    assert.equal(reused.status, 422, "a changed body under the key refuses with 422");
    assert.equal(reused.code, "IDEMPOTENCY_KEY_REUSED", "a changed body under the key is key reuse");
    assert.equal(calls.n, 1, "the refused write did not run");

    const plainOne = await injectWrite(server, WRITE_URL, { part: "c" }, null);
    assert.equal(plainOne.status, 201, "the first unheadered write answers 201");
    assert.equal(plainOne.replayedHeader, undefined, "the unheadered write carries no replay header");

    const plainTwo = await injectWrite(server, WRITE_URL, { part: "c" }, null);
    assert.equal(plainTwo.status, 201, "the second unheadered write answers 201");
    assert.equal(plainTwo.replayedHeader, undefined, "the second unheadered write carries no replay header");
    assert.notDeepEqual(plainTwo.body, plainOne.body, "the unheadered writes store different bodies");
    assert.equal(calls.n, 3, "the two unheadered writes both ran");
  } finally {
    await db.close();
  }
});

test("C-5d258a1a an invalid key a blocked key and a missing principal each refuse", async (t) => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await assertKeyTable(db, a);
    const clock = mutableClock();
    const server = await buildServer(deps());
    t.after(async () => {
      await server.close();
    });

    const calls = { n: 0 };
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const writeFn = async (): Promise<IdempotentResponse> => {
      calls.n += 1;
      entered();
      await gate;
      return { status: 201, body: { id: "f_gate" } };
    };
    const barFn = async (): Promise<IdempotentResponse> => {
      calls.n += 1;
      return { status: 201, body: { id: "f_bare" } };
    };
    const writeHandler = async (request: FastifyRequest, reply: Parameters<typeof respondIdempotent>[2]) => {
      return respondIdempotent({ pool: db.appPool, clock }, request, reply, writeFn);
    };
    const bareHandler = async (request: FastifyRequest, reply: Parameters<typeof respondIdempotent>[2]) => {
      return respondIdempotent({ pool: db.appPool, clock }, request, reply, barFn);
    };
    server.post(WRITE_URL, { onRequest: identityHook(a) }, writeHandler);
    server.post(BARE_URL, { onRequest: bareHook() }, bareHandler);
    await server.ready();

    const invalid = envelopeOf(await injectWrite(server, WRITE_URL, { part: "x" }, "has space"));
    assert.equal(invalid.status, 400, "the invalid key refuses with 400");
    assert.equal(invalid.code, "VALIDATION_FAILED", "the invalid key refuses as VALIDATION_FAILED");
    assert.deepEqual(invalid.fields, [{ field: "headers/idempotency-key", message: "must be 1 to 128 visible ASCII characters" }], "the refusal names the header field");
    assert.equal(calls.n, 0, "the refused key starts no write");

    const blocked = injectWrite(server, WRITE_URL, { part: "y" }, "kg");
    await started;
    const concurrent = envelopeOf(await injectWrite(server, WRITE_URL, { part: "y" }, "kg"));
    assert.equal(concurrent.status, 409, "a repeat while the first is blocked refuses with 409");
    assert.equal(concurrent.code, "IDEMPOTENCY_IN_PROGRESS", "a blocked key is reported as in progress");
    assert.equal(calls.n, 1, "the blocked first write is the only one so far");

    release();
    const completed = await blocked;
    assert.equal(completed.status, 201, "the first call completes");
    assert.equal(calls.n, 1, "the second call never started its own fn");

    const unauthenticated = envelopeOf(await injectWrite(server, BARE_URL, { part: "z" }, null));
    assert.equal(unauthenticated.status, 500, "a request with no principal refuses with 500");
    assert.equal(unauthenticated.code, "INTERNAL", "a missing principal is an internal refusal");
    assert.equal(calls.n, 1, "the write without a principal never ran");
  } finally {
    await db.close();
  }
});
