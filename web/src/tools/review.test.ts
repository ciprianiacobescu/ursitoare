/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { callRows, parseReviewTools, readNote, type ReviewTool } from "./review.ts";

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
const SRC = 'return { band: input.amount > 1000 ? "high" : "low" };';

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

const FX = {
  name: "lookup_vendor",
  effect: "read",
  input: IO,
  output: IO,
  untrusted_result: false,
  http: { method: "POST", path: "/blocks/erp.lookup_vendor@1" },
};
const HT = {
  name: "get_vendor",
  effect: "read",
  input: IO,
  output: IO,
  call: {
    kind: "http",
    method: "GET",
    path: "/vendors/{vendor_id}",
    params: [{ name: "vendor_id", in: "path" }],
    body: false,
  },
};
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
const CODE = {
  name: "risk_score",
  effect: "read",
  input: IO,
  output: IO,
  untrusted_result: false,
  call: { kind: "code", source: SRC },
};

function manyTools(n: number): unknown[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `t${i}`,
    effect: "read",
    http: { method: "GET", path: "/x" },
  }));
}

const R1 = S(FX, HT, FIND, LOG, CODE);

const R1_TOOLS: ReviewTool[] = [
  {
    name: "lookup_vendor",
    effect: "read",
    untrusted_result: false,
    unsafe_to_retry: false,
    call: "POST /blocks/erp.lookup_vendor@1",
    hints: "—",
    serverName: null,
  },
  {
    name: "get_vendor",
    effect: "read",
    untrusted_result: true,
    unsafe_to_retry: false,
    call: "GET /vendors/{vendor_id}",
    hints: "—",
    serverName: null,
  },
  {
    name: "find_vendor",
    effect: "write",
    untrusted_result: true,
    unsafe_to_retry: true,
    call: "mcp find_vendor (2026-07-28)",
    hints: "read-only",
    serverName: "find_vendor",
  },
  {
    name: "log_note",
    effect: "write",
    untrusted_result: true,
    unsafe_to_retry: true,
    call: "mcp log_note (2026-07-28)",
    hints: "not read-only, idempotent",
    serverName: "log_note",
  },
  {
    name: "risk_score",
    effect: "read",
    untrusted_result: false,
    unsafe_to_retry: false,
    call: "code (54 characters)",
    hints: "—",
    serverName: null,
  },
];

function hintsOf(surface: unknown): string {
  const tools = call(() => parseReviewTools(surface));
  assert.ok(tools !== null, "the surface is readable");
  assert.equal(tools.length, 1);
  const hints = tools[0]?.hints;
  assert.equal(typeof hints, "string");
  assert.ok(hints !== undefined);
  return hints;
}

test("C-7f5dc957 parseReviewTools reads each tool's call, flags, hints and server name in surface order", () => {
  const before = JSON.stringify(R1);
  assert.deepEqual(call(() => parseReviewTools(R1)), R1_TOOLS);
  assert.equal(JSON.stringify(R1), before, "the surface is not changed");
});

test("C-7f5dc957 parseReviewTools reads only the hints the server states, in order", () => {
  assert.equal(hintsOf(S(findTool())), "—");
  assert.equal(hintsOf(S(findTool({}))), "—");
  assert.equal(
    hintsOf(S(findTool({ readOnly: true, destructive: false, idempotent: true }))),
    "read-only, not destructive, idempotent",
  );
  assert.equal(hintsOf(S(findTool({ destructive: true }))), "destructive");
});

test("C-7f5dc957 parseReviewTools refuses each of the 15 malformed surfaces", () => {
  const malformed: [string, unknown][] = [
    ["null", null],
    ["an empty list", []],
    ["tools not a list", { tools: {} }],
    ["more than 100 tools", S(...manyTools(101))],
    ["a tool that is null", S(null)],
    ["a tool name with an uppercase letter", S({ ...FX, name: "Find" })],
    ["an effect outside the list", S({ ...FX, effect: "admin" })],
    ["two tools with the same name", S(FX, FX)],
    ["a tool with both http and call", S({ ...FX, call: mcp("find_vendor", "structured") })],
    ["a tool with neither http nor call", S({ name: "lonely", effect: "read" })],
    ["untrusted_result that is not a boolean", S({ ...FX, untrusted_result: "yes" })],
    ["a call kind outside the list", S({ name: "ftp_tool", effect: "read", call: { kind: "ftp" } })],
    [
      "a hint that is not a boolean",
      S({ ...findTool(), call: mcp("find_vendor", "structured", { readOnly: "yes" }) }),
    ],
    ["a description that is not a string", S({ ...FX, description: 5 })],
    ["a line feed in the http path", S({ ...FX, http: { method: "POST", path: "/a\nb" } })],
  ];
  for (const [label, surface] of malformed) {
    assert.equal(call(() => parseReviewTools(surface)), null, label);
  }
});

test("C-7f5dc957 callRows gives the name, call, effect, retry, result and hints of each tool", () => {
  const tools = call(() => parseReviewTools(R1));
  assert.ok(tools !== null, "the surface is readable");
  const rows = call(() => callRows(tools));
  assert.deepEqual(rows[2], {
    name: "find_vendor",
    call: "mcp find_vendor (2026-07-28)",
    effect: "write",
    retry: "unsafe to retry",
    result: "untrusted",
    hints: "read-only",
  });
  assert.deepEqual(rows[0], {
    name: "lookup_vendor",
    call: "POST /blocks/erp.lookup_vendor@1",
    effect: "read",
    retry: "safe to retry",
    result: "trusted",
    hints: "—",
  });
});

test("C-7f5dc957 readNote names the real read call when a tool is read, else is null", () => {
  const tools = call(() => parseReviewTools(R1));
  assert.ok(tools !== null, "the surface is readable");
  assert.equal(
    call(() => readNote(tools)),
    "Read tools are called for real, even in a dry run. Check that each one changes nothing.",
  );
  const writes = call(() => parseReviewTools(S(FIND, LOG)));
  assert.ok(writes !== null, "the surface is readable");
  assert.equal(call(() => readNote(writes)), null);
});
