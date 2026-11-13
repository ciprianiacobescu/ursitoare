/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import type { ApiClient } from "../api/client.ts";
import { confirmGrantById, loadToolRefs, postGrant, revokeGrantById } from "./grants.ts";
import type { GrantDraft } from "./grants.ts";
import { deployPolicy, loadPolicy, validatePolicy } from "./policies.ts";
import { approveToolSurface, loadToolServer } from "./servers.ts";

type Rec = [string, string, unknown?, unknown?];
type Answer = (path: string, opts: unknown) => unknown;

function fake(answer: Answer): { records: Rec[]; client: ApiClient } {
  const records: Rec[] = [];
  const log = (method: string, path: string, body: unknown, opts: unknown): unknown => {
    const rec: Rec = [method, path];
    if (body !== undefined || opts !== undefined) rec.push(body);
    if (opts !== undefined) rec.push(opts);
    records.push(rec);
    return answer(path, opts);
  };
  const client = {
    get: async (path: string, opts?: unknown) => log("get", path, undefined, opts),
    post: async (path: string, body?: unknown, opts?: unknown) => log("post", path, body, opts),
    delete: async (path: string, opts?: unknown) => log("delete", path, undefined, opts),
  } as unknown as ApiClient;
  return { records, client };
}

async function settled<T>(p: Promise<T>): Promise<T> {
  await assert.doesNotReject(p);
  return await p;
}

const DP = "sha256:" + "0123456789ab" + "c".repeat(52);
const DA = "sha256:" + "fedcba987654" + "d".repeat(52);
const IO = { type: "object" };
const SURF = {
  tools: [
    {
      name: "lookup_vendor",
      effect: "read",
      input: IO,
      output: IO,
      untrusted_result: false,
      http: { method: "POST", path: "/blocks/erp.lookup_vendor@1" },
    },
    {
      name: "create_payment",
      effect: "pay",
      input: IO,
      output: IO,
      unsafe_to_retry: true,
      http: { method: "POST", path: "/blocks/erp.create_payment@1" },
    },
  ],
};
const TOOLS = [
  { name: "lookup_vendor", effect: "read", ref: null },
  { name: "create_payment", effect: "pay", ref: null },
];
const RAW = {
  id: "acme",
  adapter: "fixture",
  origin: "https://tools.fake.test",
  local: false,
  state: "pending",
  registeredBy: "u_carol",
  registeredAt: "2026-11-06T10:00:00.000000Z",
  approvedDigest: null,
  pendingDigest: DP,
  pendingSubmittedBy: "u_carol",
  tools: TOOLS,
  approvedSurface: null,
  pendingSurface: SURF,
};
const ACCEPTED = {
  ...RAW,
  state: "approved",
  approvedDigest: DA,
  pendingDigest: null,
  pendingSubmittedBy: null,
  pendingSurface: undefined,
  approvedSurface: undefined,
  tools: [
    { name: "lookup_vendor", effect: "read", ref: "acme.lookup_vendor@1" },
    { name: "create_payment", effect: "pay", ref: "acme.create_payment@1" },
  ],
};
const GREC = {
  id: "grant_1",
  subject: { kind: "role", role: "author" },
  tool: "acme.create_payment@1",
  scope: { kind: "node", flowId: "pay-run", nodeId: "pay" },
  args: [],
  state: "active",
};
const DRAFT: GrantDraft = {
  subjectKind: "user",
  subject: "u_bob",
  tool: "acme.lookup_vendor@1",
  scopeKind: "any_step",
  flowId: "",
  nodeId: "",
};
const V = "599ac6e140250949aa9104d2e02c0da35508a8ec6227aa6cd452187caf2efdd8";
const SRC = "forbid (principal, action, resource) when { false };";
const PREC = { tenantId: "tenant_a", version: V, source: SRC, grantIds: ["grant_1"] };
const KEY = { headers: { "Idempotency-Key": "k-1" } };

async function invalid(p: Promise<unknown>): Promise<void> {
  await assert.rejects(p, (e: unknown) => {
    assert.ok(e instanceof ApiRequestError);
    assert.equal(e.status, 200);
    assert.equal(e.code, "INVALID_RESPONSE");
    return true;
  });
}

test("C-78ea404d loadToolServer gets the server and reads the view", async () => {
  const { records, client } = fake(() => RAW);
  const view = await settled(loadToolServer(client, "acme"));
  assert.deepEqual(records, [["get", "/tool-servers/acme"]]);
  assert.equal(view.id, "acme");
  assert.equal(view.pendingSubmittedBy, "u_carol");
  assert.equal(view.tools[1]?.unsafe_to_retry, true);
});

test("C-78ea404d loadToolServer passes the signal and refuses what it cannot read", async () => {
  const ctl = new AbortController();
  const withSignal = fake(() => RAW);
  await settled(loadToolServer(withSignal.client, "acme", ctl.signal));
  assert.deepEqual(withSignal.records, [
    ["get", "/tool-servers/acme", undefined, { signal: ctl.signal }],
  ]);
  await invalid(loadToolServer(fake(() => ({ id: 5 })).client, "acme"));
  const none = fake(() => RAW);
  await assert.rejects(loadToolServer(none.client, "a/b"), RangeError);
  assert.deepEqual(none.records, []);
});

test("C-78ea404d approveToolSurface posts the digest and reads the server", async () => {
  const { records, client } = fake(() => ({ server: ACCEPTED, blocks: ["acme.lookup_vendor@1"] }));
  const body = { digest: DP, selfApproval: false };
  const view = await settled(approveToolSurface(client, "acme", body));
  assert.deepEqual(records, [["post", "/tool-servers/acme/surface/approve", body]]);
  assert.equal(view.state, "approved");
  assert.equal(view.approvedDigest, DA);
  assert.equal(view.tools[0]?.ref, "acme.lookup_vendor@1");
});

test("C-78ea404d approveToolSurface refuses an answer without a server and a bad id", async () => {
  const body = { digest: DP, selfApproval: false };
  await invalid(approveToolSurface(fake(() => ({ blocks: [] })).client, "acme", body));
  const none = fake(() => ({}));
  await assert.rejects(approveToolSurface(none.client, "a/b", body), RangeError);
  assert.deepEqual(none.records, []);
});

test("C-78ea404d postGrant posts the body under the key and returns the id", async () => {
  const { records, client } = fake(() => GREC);
  const id = await settled(postGrant(client, DRAFT, "k-1"));
  assert.equal(id, "grant_1");
  assert.deepEqual(records, [
    [
      "post",
      "/grants",
      {
        subject: { kind: "user", userId: "u_bob" },
        tool: "acme.lookup_vendor@1",
        scope: { kind: "any_step" },
        args: [],
      },
      KEY,
    ],
  ]);
});

test("C-78ea404d postGrant refuses a bad draft, a blank key and unreadable answers", async () => {
  const none = fake(() => GREC);
  await assert.rejects(postGrant(none.client, { ...DRAFT, subject: "" }, "k-1"), RangeError);
  await assert.rejects(postGrant(none.client, DRAFT, ""), RangeError);
  assert.deepEqual(none.records, []);
  await invalid(postGrant(fake(() => ({ id: 5 })).client, DRAFT, "k-1"));
  await invalid(postGrant(fake(() => ({ id: "g1" })).client, DRAFT, "k-1"));
});

test("C-78ea404d confirmGrantById posts an empty body and resolves with nothing", async () => {
  const { records, client } = fake(() => GREC);
  const out = await settled(confirmGrantById(client, "grant_1"));
  assert.equal(out, undefined);
  assert.deepEqual(records, [["post", "/grants/grant_1/confirm", {}]]);
  await invalid(confirmGrantById(fake(() => ({ id: 5 })).client, "grant_1"));
  await invalid(confirmGrantById(fake(() => ({ id: "g1" })).client, "grant_1"));
  const none = fake(() => GREC);
  await assert.rejects(confirmGrantById(none.client, "g/1"), RangeError);
  assert.deepEqual(none.records, []);
});

test("C-78ea404d revokeGrantById deletes the grant and resolves with nothing", async () => {
  const { records, client } = fake(() => ({ ...GREC, state: "revoked" }));
  const out = await settled(revokeGrantById(client, "grant_1"));
  assert.equal(out, undefined);
  assert.deepEqual(records, [["delete", "/grants/grant_1"]]);
  await invalid(revokeGrantById(fake(() => ({ id: 5 })).client, "grant_1"));
  await invalid(revokeGrantById(fake(() => ({ id: "g1" })).client, "grant_1"));
  const none = fake(() => GREC);
  await assert.rejects(revokeGrantById(none.client, "g/1"), RangeError);
  assert.deepEqual(none.records, []);
});

function blk(ref: unknown, bound: unknown): unknown {
  return {
    ref,
    def: { effect: "read" },
    bound,
    contentHash: "sha256:" + "a".repeat(64),
    importedAt: "2026-11-06T10:00:00.000000Z",
  };
}

function cursorOf(opts: unknown): unknown {
  return (opts as { query?: { cursor?: unknown } } | undefined)?.query?.cursor;
}

test("C-78ea404d loadToolRefs returns the bound refs over two requests", async () => {
  const { records, client } = fake((_path, opts) =>
    cursorOf(opts) === "c1"
      ? { items: [blk("acme.create_payment@1", true)], next_cursor: null }
      : {
          items: [blk("acme.lookup_vendor@1", true), blk("erp.lookup_vendor@1", false)],
          next_cursor: "c1",
        },
  );
  const refs = await settled(loadToolRefs(client));
  assert.deepEqual(refs, ["acme.lookup_vendor@1", "acme.create_payment@1"]);
  assert.equal(records.length, 2);
  assert.deepEqual(records[0], ["get", "/blocks", undefined, { query: { limit: 100 } }]);
  assert.deepEqual(records[1], [
    "get",
    "/blocks",
    undefined,
    { query: { limit: 100, cursor: "c1" } },
  ]);
});

test("C-78ea404d loadToolRefs stops after ten pages without failing", async () => {
  let n = 0;
  const { records, client } = fake(() => {
    n += 1;
    return { items: [blk(`acme.t${n}@1`, true)], next_cursor: `c${n}` };
  });
  const refs = await settled(loadToolRefs(client));
  assert.equal(records.length, 10);
  assert.equal(cursorOf(records[9]?.[3]), "c9");
  assert.equal(refs.length, 10);
  assert.equal(refs[0], "acme.t1@1");
  assert.equal(refs[9], "acme.t10@1");
});

test("C-78ea404d loadToolRefs refuses an unreadable item", async () => {
  await invalid(
    loadToolRefs(fake(() => ({ items: [blk(5, true)], next_cursor: null })).client),
  );
  await invalid(
    loadToolRefs(fake(() => ({ items: [blk("acme.t@1", "yes")], next_cursor: null })).client),
  );
});

test("C-78ea404d loadPolicy gets the view and refuses an unreadable answer", async () => {
  const { records, client } = fake(() => ({ current: PREC, pendingGrants: 2 }));
  const view = await settled(loadPolicy(client));
  assert.deepEqual(records, [["get", "/policies"]]);
  assert.deepEqual(view, { version: V, source: SRC, pendingGrants: 2 });
  await invalid(loadPolicy(fake(() => ({})).client));
});

test("C-78ea404d validatePolicy posts the source and returns ok and problems", async () => {
  const problem = { stage: "parse", ids: [], message: "unexpected end of input" };
  const { records, client } = fake(() => ({ ok: false, policySetVersion: null, problems: [problem] }));
  const out = await settled(validatePolicy(client, SRC));
  assert.deepEqual(records, [["post", "/policies/validate", { source: SRC }]]);
  assert.deepEqual(out, { ok: false, problems: [problem] });
  await invalid(validatePolicy(fake(() => ({ ok: "yes", problems: [] })).client, SRC));
  await invalid(validatePolicy(fake(() => ({ ok: true })).client, SRC));
  await invalid(
    validatePolicy(
      fake(() => ({ ok: false, problems: [{ stage: "parse", ids: [] }] })).client,
      SRC,
    ),
  );
});

test("C-78ea404d deployPolicy posts the source under the key and returns the version", async () => {
  const { records, client } = fake(() => PREC);
  const version = await settled(deployPolicy(client, SRC, "k-1"));
  assert.equal(version, V);
  assert.deepEqual(records, [["post", "/policies/deploy", { source: SRC }, KEY]]);
  await invalid(deployPolicy(fake(() => ({ version: "x" })).client, SRC, "k-1"));
  const none = fake(() => PREC);
  await assert.rejects(deployPolicy(none.client, SRC, ""), RangeError);
  assert.deepEqual(none.records, []);
});
