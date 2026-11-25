/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import type { ApiClient } from "../api/client.ts";
import { registerToolMessages, toolsErrorMessage } from "./messages.ts";
import {
  collidingNames,
  discoverTools,
  discoveryErrorText,
  loadServerReview,
} from "./review.ts";
import { parseToolServer } from "./servers.ts";

registerToolMessages();

const NOT_SET = Symbol("not set");

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

type Rec = [string, string, unknown?, unknown?];
type Answer = (method: string, path: string, body: unknown, opts: unknown) => unknown;

function fake(answer: Answer): { records: Rec[]; client: ApiClient } {
  const records: Rec[] = [];
  const log = (method: string, path: string, body: unknown, opts: unknown): unknown => {
    const rec: Rec = [method, path];
    if (body !== undefined || opts !== undefined) rec.push(body);
    if (opts !== undefined) rec.push(opts);
    records.push(rec);
    return answer(method, path, body, opts);
  };
  const client = {
    get: async (path: string, opts?: unknown) => log("get", path, undefined, opts),
    post: async (path: string, body?: unknown, opts?: unknown) => log("post", path, body, opts),
  } as unknown as ApiClient;
  return { records, client };
}

async function settled<T>(p: Promise<T>): Promise<T> {
  await assert.doesNotReject(p);
  return await p;
}

async function invalid(p: Promise<unknown>): Promise<void> {
  await assert.rejects(p, (e: unknown) => {
    assert.ok(e instanceof ApiRequestError);
    assert.equal(e.status, 200);
    assert.equal(e.code, "INVALID_RESPONSE");
    return true;
  });
}

const IO = { type: "object" };

function S(...tools: unknown[]): { tools: unknown[] } {
  return { tools };
}

function mcp(
  name: string,
  output: string,
  hints?: Record<string, unknown>,
): Record<string, unknown> {
  const spec: Record<string, unknown> = {
    kind: "mcp",
    endpoint: "/mcp",
    name,
    protocolVersion: "2026-07-28",
    output,
  };
  if (hints !== undefined) spec.hints = hints;
  return spec;
}

const FIND: Record<string, unknown> = {
  name: "find_vendor",
  effect: "write",
  input: IO,
  output: IO,
  untrusted_result: true,
  unsafe_to_retry: true,
  call: mcp("find_vendor", "structured", { readOnly: true }),
};
const LOG: Record<string, unknown> = {
  name: "log_note",
  effect: "write",
  input: IO,
  output: IO,
  untrusted_result: true,
  unsafe_to_retry: true,
  call: mcp("log_note", "text", { readOnly: false, idempotent: true }),
};

const ti = { name: "ti", effect: "write", ref: null };

function DR(o: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    server: { tools: [ti, ti] },
    era: "modern",
    protocolVersion: "2026-07-28",
    excluded: [],
    ...o,
  };
}

const PENDING = S(FIND, LOG);

const DETAIL: Record<string, unknown> = {
  id: "crm",
  adapter: "mcp",
  origin: "https://mcp.fake.test",
  local: false,
  state: "pending",
  registeredBy: "u_carol",
  registeredAt: "2026-11-09T10:00:00.000000Z",
  approvedDigest: null,
  pendingDigest: "sha256:" + "b".repeat(64),
  pendingSubmittedBy: "u_carol",
  tools: [
    { name: "find_vendor", effect: "write", ref: null },
    { name: "log_note", effect: "write", ref: null },
  ],
  approvedSurface: null,
  pendingSurface: PENDING,
};

function refusal(reason: string, extra: Record<string, unknown> = {}): ApiRequestError {
  return new ApiRequestError(422, "OPERATION_REFUSED", "the engine refused it", {
    details: { reason, ...extra },
  });
}

test("C-9ba9b0d3 discoverTools posts the body under the idempotency key and resolves the discovery K1", async () => {
  assert.equal(typeof discoverTools, "function");
  const answer = DR();
  const { records, client } = fake(() => answer);
  const got = await settled(discoverTools(client, "crm", { tools: {} }, "k-1"));
  assert.deepEqual(got, {
    protocolVersion: "2026-07-28",
    era: "modern",
    count: 2,
    excluded: [],
  });
  assert.deepEqual(records, [
    [
      "post",
      "/tool-servers/crm/discover",
      { tools: {} },
      { headers: { "Idempotency-Key": "k-1" } },
    ],
  ]);

  const ctl = new AbortController();
  const withSignal = fake(() => answer);
  await settled(discoverTools(withSignal.client, "crm", { tools: {} }, "k-2", ctl.signal));
  assert.deepEqual(withSignal.records, [
    [
      "post",
      "/tool-servers/crm/discover",
      { tools: {} },
      { headers: { "Idempotency-Key": "k-2" }, signal: ctl.signal },
    ],
  ]);
});

test("C-9ba9b0d3 discoverTools refuses a bad id key or body before a call and an unreadable answer K2", async () => {
  assert.equal(typeof discoverTools, "function");
  const none = fake(() => DR());
  const bad: [string, Promise<unknown>][] = [
    ["an id with an uppercase letter", discoverTools(none.client, "Crm", { tools: {} }, "k-1")],
    ["an id with a slash", discoverTools(none.client, "a/b", { tools: {} }, "k-1")],
    ["an empty key", discoverTools(none.client, "crm", { tools: {} }, "")],
    ["a blank key", discoverTools(none.client, "crm", { tools: {} }, "  ")],
    ["a body that is a list", discoverTools(none.client, "crm", [], "k-1")],
    ["a null body", discoverTools(none.client, "crm", null, "k-1")],
    ["a body without tools", discoverTools(none.client, "crm", {}, "k-1")],
    ["tools that are a list", discoverTools(none.client, "crm", { tools: [] }, "k-1")],
  ];
  for (const [label, promise] of bad) {
    await assert.rejects(promise, RangeError, label);
  }
  assert.deepEqual(none.records, [], "no request is made before the refusal");

  await invalid(discoverTools(fake(() => ({})).client, "crm", { tools: {} }, "k-1"));
  await invalid(
    discoverTools(fake(() => DR({ era: "dual" })).client, "crm", { tools: {} }, "k-1"),
  );

  const denial = new ApiRequestError(503, "EGRESS_UNAVAILABLE", "the engine refused it", {
    details: { reason: "gateway_unavailable" },
  });
  const thrown = fake(() => {
    throw denial;
  });
  await assert.rejects(
    discoverTools(thrown.client, "crm", { tools: {} }, "k-1"),
    (e: unknown) => e === denial,
  );
  assert.equal(thrown.records.length, 1);
});

test("C-9ba9b0d3 loadServerReview reads the detail once and keeps the raw surfaces K3", async () => {
  assert.equal(typeof loadServerReview, "function");
  const { records, client } = fake(() => DETAIL);
  const review = await settled(loadServerReview(client, "crm"));
  assert.deepEqual(records, [["get", "/tool-servers/crm"]]);
  const server = parseToolServer(DETAIL);
  assert.ok(server !== null);
  assert.deepEqual(review, { server, approved: null, pending: PENDING });
  assert.equal(review.server.tools.length, 2);
  assert.equal(review.server.tools[0]?.http, null);

  const noSurfaces: Record<string, unknown> = { ...DETAIL };
  delete noSurfaces["approvedSurface"];
  delete noSurfaces["pendingSurface"];
  const bare = await settled(loadServerReview(fake(() => noSurfaces).client, "crm"));
  assert.equal(bare.approved, null);
  assert.equal(bare.pending, null);

  await invalid(loadServerReview(fake(() => ({ id: 5 })).client, "crm"));
  const badId = fake(() => DETAIL);
  await assert.rejects(loadServerReview(badId.client, "a/b"), RangeError);
  assert.deepEqual(badId.records, []);
});

test("C-9ba9b0d3 discoveryErrorText words the credential discovery refusals E1 to E5", () => {
  assert.equal(typeof discoveryErrorText, "function");
  assert.equal(
    call(() => discoveryErrorText(refusal("credential_missing"))),
    "Store a credential for this server first. A server that needs no key still needs one: enter any text.",
  );
  assert.equal(
    call(() => discoveryErrorText(refusal("discovery_denied"))),
    "Policy refused the discovery request.",
  );
  assert.equal(
    call(() => discoveryErrorText(refusal("discovery_failed", { status: "500" }))),
    "The MCP server could not be reached, or it answered with an error.",
  );
  for (const status of ["401", "403"]) {
    assert.equal(
      call(() => discoveryErrorText(refusal("discovery_failed", { status }))),
      "The server refused the stored credential. Rotate it, then discover again.",
      status,
    );
  }
  assert.equal(
    call(() => discoveryErrorText(refusal("mcp_session_required"))),
    "The MCP server needs a stateful session, which Ursitoare does not support yet.",
  );
  assert.equal(
    call(() =>
      discoveryErrorText(
        refusal("no_tools", {
          excluded: [{ name: "route_ticket", reason: "x_mcp_header" }],
        }),
      ),
    ),
    "The MCP server lists no usable tools. Left out: route_ticket (x_mcp_header)",
  );
  assert.equal(
    call(() => discoveryErrorText(refusal("no_tools", { excluded: "x" }))),
    "The MCP server lists no usable tools.",
  );
});

test("C-9ba9b0d3 discoveryErrorText words egress refusals and collidingNames lists the names E6 to E8", () => {
  assert.equal(typeof discoveryErrorText, "function");
  assert.equal(typeof collidingNames, "function");
  const notConfigured = new ApiRequestError(503, "EGRESS_UNAVAILABLE", "unavailable", {
    details: { reason: "discovery_not_configured" },
  });
  assert.equal(
    call(() => discoveryErrorText(notConfigured)),
    "Discovery is not configured on this engine.",
  );
  const gatewayDown = new ApiRequestError(503, "EGRESS_UNAVAILABLE", "unavailable", {
    details: { reason: "gateway_unavailable" },
  });
  assert.equal(
    call(() => discoveryErrorText(gatewayDown)),
    "The egress gateway is unavailable. Try again.",
  );

  const collision = refusal("name_collision", { names: "find_vendor,Find.Vendor" });
  assert.equal(
    call(() => discoveryErrorText(collision)),
    "Two server tools get the same tool name (find_vendor,Find.Vendor): give one a tool name.",
  );
  assert.deepEqual(call(() => collidingNames(collision)), ["find_vendor", "Find.Vendor"]);
  assert.equal(
    call(() => discoveryErrorText(refusal("name_collision"))),
    "Two server tools get the same tool name: give one a tool name.",
  );
  assert.deepEqual(call(() => collidingNames(refusal("name_collision"))), []);
  assert.equal(
    call(() => discoveryErrorText(refusal("name_collision", { names: "a b" }))),
    "Two server tools get the same tool name: give one a tool name.",
  );
  assert.deepEqual(call(() => collidingNames(refusal("name_collision", { names: "a b" }))), []);
  assert.deepEqual(
    call(() =>
      collidingNames(
        refusal("no_tools", { excluded: [{ name: "route_ticket", reason: "x_mcp_header" }] }),
      ),
    ),
    [],
  );
  assert.deepEqual(call(() => collidingNames(new Error("boom"))), []);
});

test("C-9ba9b0d3 discoveryErrorText falls back to toolsErrorMessage for other failures E9", () => {
  assert.equal(typeof discoveryErrorText, "function");
  const denied = new ApiRequestError(403, "FORBIDDEN", "not allowed", {
    details: { decisionId: "dec_1" },
  });
  const errors: [string, unknown][] = [
    ["adapter_mismatch", refusal("adapter_mismatch")],
    ["protocol_unsupported", refusal("protocol_unsupported")],
    ["too_many_tools", refusal("too_many_tools")],
    ["a validation failure", new ApiRequestError(400, "VALIDATION_FAILED", "not valid")],
    ["a plain error", new Error("boom")],
    [
      "an authorization failure with an egress reason",
      new ApiRequestError(503, "AUTHZ_UNAVAILABLE", "unavailable", {
        details: { reason: "gateway_unavailable" },
      }),
    ],
    ["a forbidden answer with a decision id", denied],
  ];
  for (const [label, error] of errors) {
    assert.equal(call(() => discoveryErrorText(error)), toolsErrorMessage(error), label);
  }
  assert.equal(
    call(() => discoveryErrorText(denied)).endsWith(" Decision id: dec_1"),
    true,
    "the decision id reaches the admin",
  );
});
