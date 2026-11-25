/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  discoverBody,
  discoveryText,
  initialDraft,
  parseDiscovery,
  parseReviewTools,
  type DiscoverDraft,
  type ReviewTool,
} from "./review.ts";

const NOT_SET = Symbol("not set");

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
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

function findTool(hints?: Record<string, unknown>): Record<string, unknown> {
  return {
    name: "find_vendor",
    effect: "write",
    input: IO,
    output: IO,
    untrusted_result: true,
    unsafe_to_retry: true,
    call: mcp("find_vendor", "structured", hints),
  };
}

const FIND = findTool({ readOnly: true });
const LOG = {
  name: "log_note",
  effect: "write",
  input: IO,
  output: IO,
  untrusted_result: true,
  unsafe_to_retry: true,
  call: mcp("log_note", "text", { readOnly: false, idempotent: true }),
};
const FX = {
  name: "lookup_vendor",
  effect: "read",
  input: IO,
  output: IO,
  untrusted_result: false,
  http: { method: "POST", path: "/blocks/erp.lookup_vendor@1" },
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

test("C-7374d16f initialDraft reads the approved tools and keeps only server tools (I1)", () => {
  const surface = S({ ...FIND, effect: "read" }, LOG, FX);
  const tools = call(() => parseReviewTools(surface));
  assert.ok(tools !== null);
  assert.deepEqual(call(() => initialDraft(tools)), {
    effects: { find_vendor: "read", log_note: "" },
    names: {},
  });
});

test("C-7374d16f initialDraft keeps a name only when it differs and omits proto tools (I2)", () => {
  const tools: ReviewTool[] = [
    {
      name: "find_vendor",
      effect: "read",
      untrusted_result: true,
      unsafe_to_retry: true,
      call: "mcp find_vendor (2026-07-28)",
      hints: "read-only",
      serverName: "find_vendor",
    },
    {
      name: "note",
      effect: "write",
      untrusted_result: true,
      unsafe_to_retry: true,
      call: "mcp Log.Note (2026-07-28)",
      hints: "—",
      serverName: "Log.Note",
    },
    {
      name: "proto_tool",
      effect: "write",
      untrusted_result: true,
      unsafe_to_retry: true,
      call: "mcp __proto__ (2026-07-28)",
      hints: "—",
      serverName: "__proto__",
    },
  ];
  assert.deepEqual(call(() => initialDraft(tools)), {
    effects: { find_vendor: "read", "Log.Note": "" },
    names: { "Log.Note": "note" },
  });
});

test("C-7374d16f discoverBody builds the overlay body and omits proto entries (B1)", () => {
  assert.deepEqual(discoverBody({ effects: {} }), { tools: {} });
  assert.deepEqual(discoverBody({ effects: { find_vendor: "read", log_note: "" } }), {
    tools: { find_vendor: { effect: "read" } },
  });
  assert.deepEqual(
    discoverBody({
      effects: { find_vendor: "read", "Log.Note": "skip" },
      names: { find_vendor: "finder", "Log.Note": "x_note" },
    }),
    { tools: { find_vendor: { effect: "read", name: "finder" }, "Log.Note": { skip: true } } },
  );
  assert.deepEqual(
    discoverBody({ effects: {}, names: { "Find.Vendor": "find_vendor_2" } }),
    { tools: { "Find.Vendor": { name: "find_vendor_2" } } },
  );
  const draft: DiscoverDraft = {
    effects: { ["__proto__"]: "pay", b: "read" } as DiscoverDraft["effects"],
  };
  assert.deepEqual(discoverBody(draft), { tools: { b: { effect: "read" } } });
});

test("C-7374d16f discoverBody rejects bad keys, effects, names and too many entries (B2)", () => {
  assert.throws(() => discoverBody({ effects: { "has space": "read" } }), RangeError);
  assert.throws(() => discoverBody({ effects: { "": "read" } }), RangeError);
  assert.throws(() => discoverBody({ effects: { a: "admin" } as unknown as DiscoverDraft["effects"] }), RangeError);
  assert.throws(
    () => discoverBody({ effects: { a: "" }, names: { a: "Bad Name" } }),
    RangeError,
  );
  const tooMany = Object.fromEntries(
    Array.from({ length: 101 }, (_, i) => [`t${i}`, "read"]),
  ) as unknown as DiscoverDraft["effects"];
  assert.throws(() => discoverBody({ effects: tooMany }), RangeError);
  const ok = Object.fromEntries(
    Array.from({ length: 100 }, (_, i) => [`t${i}`, "read"]),
  ) as unknown as DiscoverDraft["effects"];
  assert.doesNotThrow(() => discoverBody({ effects: ok }));
});

test("C-7374d16f parseDiscovery reads a valid discovery answer (P1)", () => {
  assert.deepEqual(call(() => parseDiscovery(DR())), {
    protocolVersion: "2026-07-28",
    era: "modern",
    count: 2,
    excluded: [],
  });
  assert.deepEqual(
    call(() =>
      parseDiscovery(
        DR({
          era: "legacy",
          protocolVersion: "2025-11-25",
          excluded: [{ name: "route_ticket", reason: "x_mcp_header" }],
        }),
      ),
    ),
    {
      protocolVersion: "2025-11-25",
      era: "legacy",
      count: 2,
      excluded: [{ name: "route_ticket", reason: "x_mcp_header" }],
    },
  );
});

test("C-7374d16f parseDiscovery rejects malformed answers (P2)", () => {
  const cases: [string, unknown][] = [
    ["null", null],
    ["an array", []],
    ["no server", { era: "modern", protocolVersion: "2026-07-28", excluded: [] }],
    ["server that is a string", { server: "x", era: "modern", protocolVersion: "2026-07-28", excluded: [] }],
    ["more than 100 tools", DR({ server: { tools: Array.from({ length: 101 }, () => ti) } })],
    ["era dual", DR({ era: "dual" })],
    ["an old protocol version", DR({ protocolVersion: "2024-11-05" })],
    ["excluded that is not a list", DR({ excluded: {} })],
    ["an excluded entry without a name", DR({ excluded: [{ reason: "x" }] })],
    ["an excluded reason with a space", DR({ excluded: [{ name: "a", reason: "X Y" }] })],
    ["more than 1000 excluded entries", DR({ excluded: Array.from({ length: 1001 }, () => ({ name: "a", reason: "b" })) })],
  ];
  for (const [label, raw] of cases) {
    assert.equal(call(() => parseDiscovery(raw)), null, label);
  }
});

test("C-7374d16f discoveryText states the count, version and left-out tools (X1, X2, X4, X6)", () => {
  const d1 = call(() => parseDiscovery(DR()));
  assert.ok(d1 !== null);
  assert.equal(discoveryText(d1), "Discovered 2 tools over MCP 2026-07-28.");

  const d2 = call(() =>
    parseDiscovery(
      DR({
        server: { tools: [ti] },
        protocolVersion: "2025-11-25",
        excluded: [
          { name: "route_ticket", reason: "x_mcp_header" },
          { name: "has space\u0001", reason: "name_invalid" },
        ],
      }),
    ),
  );
  assert.ok(d2 !== null);
  assert.equal(
    discoveryText(d2),
    "Discovered 1 tools over MCP 2025-11-25. Left out: route_ticket (x_mcp_header), has space? (name_invalid)",
  );

  const d4 = call(() =>
    parseDiscovery(DR({ excluded: [{ name: "gone_tool", reason: "not_listed" }] })),
  );
  assert.ok(d4 !== null);
  assert.equal(discoveryText(d4), "Discovered 2 tools over MCP 2026-07-28. Left out: gone_tool (not_listed)");

  const d6 = call(() =>
    parseDiscovery(DR({ excluded: [{ name: "log_note", reason: "description" }] })),
  );
  assert.ok(d6 !== null);
  assert.equal(
    discoveryText(d6),
    "Discovered 2 tools over MCP 2026-07-28. Left out: log_note (description dropped, tool kept)",
  );
});

test("C-7374d16f discoveryText cuts a long neutralised name to 79 characters (X3)", () => {
  const d = call(() =>
    parseDiscovery(DR({ excluded: [{ name: "n".repeat(81), reason: "name_invalid" }] })),
  );
  assert.ok(d !== null);
  const text = discoveryText(d);
  assert.equal(text.length, 145);
  assert.equal(text, "Discovered 2 tools over MCP 2026-07-28. Left out: " + "n".repeat(79) + "…");
});

test("C-7374d16f discoveryText neutralises a bidi name (X5)", () => {
  const d = call(() =>
    parseDiscovery(DR({ excluded: [{ name: "a\u202eb", reason: "name_invalid" }] })),
  );
  assert.ok(d !== null);
  assert.equal(
    discoveryText(d),
    "Discovered 2 tools over MCP 2026-07-28. Left out: a?b (name_invalid)",
  );
});
