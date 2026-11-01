import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import { listAuditEvents } from "../audit/index.ts";
import { canonicalizeFlow, contentHash, parseFlowText } from "../authoring/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine } from "../pdp/index.ts";
import { createFlow } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { readTestFlowText } from "../../test/support/catalogue/flows.ts";
import { seedFlowActors } from "../../test/support/flow-actors.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { registerFlowRoutes } from "./flow-routes.ts";
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-10-25T09:00:00Z";

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface Harness {
  db: TestDatabase;
  a: TenantContext;
  server: FastifyInstance;
  alice: Session;
  bob: Session;
}

interface ErrorBody {
  error: { code: string; details?: Record<string, unknown> };
}

interface SummaryBody {
  flowId: string;
  number: number;
  hash: string;
  state: string;
  surface: string;
  author: string;
  requestedBy: string | null;
  validatedAt: string | null;
  validationOk: boolean | null;
}

interface SaveBody {
  version: SummaryBody;
  created: boolean;
}

interface ListBody {
  items: SummaryBody[];
  next_cursor: string | null;
}

interface DetailBody extends SummaryBody {
  text: string;
  canonical: unknown;
  result: unknown;
}

const engineDirs: string[] = [];

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

function parsedDoc(text: string): Record<string, unknown> {
  const parsed = parseFlowText(text, "yaml");
  assert.ok(parsed.ok, "the test text parses");
  return parsed.doc as Record<string, unknown>;
}

function t1(): string {
  return readTestFlowText("rf-1-core");
}

function t1Json(): string {
  const doc = parsedDoc(t1());
  const reversed: Record<string, unknown> = {};
  for (const key of Object.keys(doc).reverse()) reversed[key] = doc[key];
  return JSON.stringify(reversed);
}

function t2Json(): string {
  return JSON.stringify({ ...parsedDoc(t1()), description: "second" });
}

async function createHarness(): Promise<Harness> {
  const db = await withTestDatabase();
  const { a } = await seedTwoTenants(db);
  const clock = fixedClock(NOW);
  await seedFlowActors(
    db,
    a,
    [
      { subject: "alice", roles: ["author"], teams: ["finance"] },
      { subject: "bob", roles: ["approver"], teams: ["finance"] },
    ],
    clock,
  );
  const alice = await createTestSession(db, a, "alice", clock);
  const bob = await createTestSession(db, a, "bob", clock);
  await withTenantTx(db.appPool, a, async (tx) => {
    for (const name of ["rf-1-core", "other"]) {
      await createFlow(
        tx,
        a,
        { name, ownerTeam: "finance" },
        { kind: "user", userId: alice.userId },
        { clock },
      );
    }
  });

  const srcDir = await mkdtemp(join(tmpdir(), "api-flow-versions-src-"));
  engineDirs.push(srcDir);
  const engine = await createPolicyEngine({
    srcDir,
    tenantPolicies: [
      { id: "t-all", layer: "tenant", text: '@id("t-all") permit (principal, action, resource);' },
    ],
    clock,
    ids: sequentialIds(200),
    logger: createLogger({ level: "silent", destination: silentDestination }),
  });
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
  installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
  registerFlowRoutes(server, {
    pool: db.appPool,
    clock,
    engineKey: { reveal: () => "k".repeat(64) },
  });
  return { db, a, server, alice, bob };
}

async function closeHarness(h: Harness): Promise<void> {
  await h.server.close();
  await h.db.close();
}

function save(
  h: Harness,
  flowId: string,
  payload: unknown,
  key?: string,
) {
  const headers: Record<string, string> = {
    cookie: h.alice.cookie,
    "x-csrf-token": h.alice.csrfToken,
  };
  if (key !== undefined) headers["idempotency-key"] = key;
  return h.server.inject({
    method: "POST",
    url: `/api/v1/flows/${flowId}/versions`,
    headers,
    payload: payload as never,
  });
}

function get(h: Harness, session: Session, url: string) {
  return h.server.inject({ method: "GET", url, headers: { cookie: session.cookie } });
}

test("C-a41d1eac versions are saved deduplicated numbered and read over HTTP", async () => {
  const h = await createHarness();
  try {
    const first = await save(h, "rf-1-core", { format: "yaml", text: t1() });
    assert.equal(first.statusCode, 201);
    const hash = contentHash(parsedDoc(t1()));
    const firstBody = first.json() as SaveBody;
    assert.equal(firstBody.created, true);
    assert.equal(firstBody.version.flowId, "rf-1-core");
    assert.equal(firstBody.version.number, 1);
    assert.equal(firstBody.version.hash, hash);
    assert.equal(firstBody.version.state, "draft");
    assert.equal(firstBody.version.surface, "yaml");
    assert.equal(firstBody.version.author, h.alice.userId);
    assert.equal(firstBody.version.requestedBy, null);
    assert.equal(firstBody.version.validatedAt, null);
    assert.equal(firstBody.version.validationOk, null);

    const again = await save(h, "rf-1-core", { format: "yaml", text: t1() });
    assert.equal(again.statusCode, 200);
    assert.deepEqual(again.json(), { version: firstBody.version, created: false });

    const twin = await save(h, "rf-1-core", { format: "json", text: t1Json() });
    assert.equal(twin.statusCode, 200);
    assert.deepEqual(twin.json(), { version: firstBody.version, created: false });

    const second = await save(h, "rf-1-core", { format: "json", text: t2Json() }, "s1");
    assert.equal(second.statusCode, 201);
    assert.equal((second.json() as SaveBody).version.number, 2);
    const replay = await save(h, "rf-1-core", { format: "json", text: t2Json() }, "s1");
    assert.equal(replay.statusCode, 201);
    assert.equal(replay.headers["idempotent-replayed"], "true");
    assert.deepEqual(replay.json(), second.json());

    const page1Res = await get(h, h.alice, "/api/v1/flows/rf-1-core/versions?limit=1");
    assert.equal(page1Res.statusCode, 200);
    const page1 = page1Res.json() as ListBody;
    assert.deepEqual(
      page1.items.map((item) => item.number),
      [2],
    );
    const cursor = page1.next_cursor ?? "";
    assert.equal(typeof page1.next_cursor, "string");
    const page2Res = await get(
      h,
      h.alice,
      `/api/v1/flows/rf-1-core/versions?limit=1&cursor=${encodeURIComponent(cursor)}`,
    );
    assert.equal(page2Res.statusCode, 200);
    assert.deepEqual(
      (page2Res.json() as ListBody).items.map((item) => item.number),
      [1],
    );
    const foreign = await get(
      h,
      h.alice,
      `/api/v1/flows/other/versions?cursor=${encodeURIComponent(cursor)}`,
    );
    assert.equal(foreign.statusCode, 400);
    assert.equal((foreign.json() as ErrorBody).error.code, "CURSOR_INVALID");

    const read = await get(h, h.alice, `/api/v1/flows/rf-1-core/versions/${hash}`);
    assert.equal(read.statusCode, 200);
    const detail = read.json() as DetailBody;
    assert.equal(detail.number, 1);
    assert.equal(detail.hash, hash);
    assert.equal(detail.state, "draft");
    assert.equal(detail.surface, "yaml");
    assert.equal(detail.author, h.alice.userId);
    assert.equal(detail.text, t1());
    assert.deepEqual(detail.canonical, canonicalizeFlow(parsedDoc(t1())));
    assert.equal(contentHash(detail.canonical), hash);
    assert.equal(detail.result, null);

    const wrongFlow = await get(h, h.alice, `/api/v1/flows/other/versions/${hash}`);
    assert.equal(wrongFlow.statusCode, 404);
    assert.equal((wrongFlow.json() as ErrorBody).error.code, "NOT_FOUND");

    const bobRead = await get(h, h.bob, `/api/v1/flows/rf-1-core/versions/${hash}`);
    assert.equal(bobRead.statusCode, 200);

    const flow = await get(h, h.alice, "/api/v1/flows/rf-1-core");
    const flowBody = flow.json() as { versionCount: number; latest: { number: number } };
    assert.equal(flowBody.versionCount, 2);
    assert.equal(flowBody.latest.number, 2);
  } finally {
    await closeHarness(h);
  }
});

test("C-042f1711 text that is not a flow document is refused over HTTP", async () => {
  const h = await createHarness();
  try {
    const refused = async (format: string, text: string) => {
      const res = await save(h, "rf-1-core", { format, text });
      assert.equal(res.statusCode, 422);
      const body = res.json() as ErrorBody;
      assert.equal(body.error.code, "FLOW_TEXT_INVALID");
      return body.error.details ?? {};
    };

    const yaml = await refused("yaml", "a: [1");
    assert.equal(yaml["reason"], "parse");
    assert.equal(yaml["code"], "FORMAT_YAML_SYNTAX");
    assert.equal(typeof yaml["message"], "string");
    assert.equal(typeof yaml["line"], "number");
    assert.equal(typeof yaml["column"], "number");

    const json = await refused("json", "{");
    assert.equal(json["reason"], "parse");
    assert.equal(json["code"], "FORMAT_JSON_SYNTAX");
    assert.equal(typeof json["message"], "string");

    assert.equal((await refused("yaml", "[1]"))["reason"], "not_object");
    assert.equal((await refused("yaml", "# only a comment"))["reason"], "not_object");

    const other = JSON.stringify({ ...parsedDoc(t1()), flow: "other" });
    assert.equal((await refused("json", other))["reason"], "name_mismatch");
    const withoutFlow = parsedDoc(t1());
    delete withoutFlow["flow"];
    assert.equal((await refused("json", JSON.stringify(withoutFlow)))["reason"], "name_mismatch");

    const nul = await refused("yaml", "# \u0000\n" + t1());
    assert.equal(nul["reason"], "parse");
    assert.equal(nul["code"], "FORMAT_NOT_JSON");

    const extra = await save(h, "rf-1-core", { format: "yaml", text: t1(), author: "mallory" });
    assert.equal(extra.statusCode, 400);
    assert.equal((extra.json() as ErrorBody).error.code, "VALIDATION_FAILED");

    const large = await save(h, "rf-1-core", { format: "yaml", text: "a".repeat(1_100_000) });
    assert.equal(large.statusCode, 413);
    assert.equal((large.json() as ErrorBody).error.code, "PAYLOAD_TOO_LARGE");

    const flow = await get(h, h.alice, "/api/v1/flows/rf-1-core");
    assert.equal((flow.json() as { versionCount: number }).versionCount, 0);
    const events = await listAuditEvents(h.db.appPool, h.a, {
      filter: { eventType: "flow.version_saved" },
      order: "asc",
      limit: 50,
    });
    assert.equal(events.length, 0);
  } finally {
    await closeHarness(h);
  }
});
