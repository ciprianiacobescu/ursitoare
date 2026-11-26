/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_TRUST,
  carriedAfterEffect,
  carriedFields,
  storedTools,
  trustOf,
  type OverlayAdapter,
  type StoredTool,
} from "./trust.ts";

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

function H(method: string, path: string): Record<string, unknown> {
  return { kind: "http", method, path, params: [], body: false };
}

function M(name: string): Record<string, unknown> {
  return {
    kind: "mcp",
    endpoint: "/mcp",
    name,
    protocolVersion: "2026-07-28",
    output: "structured",
  };
}

function T(
  name: string,
  effect: string,
  callSpec: unknown,
  over?: Record<string, unknown>,
): Record<string, unknown> {
  const tool: Record<string, unknown> = {
    name,
    effect,
    input: IO,
    output: IO,
    call: callSpec,
  };
  if (over !== undefined) Object.assign(tool, over);
  return tool;
}

function S(...tools: unknown[]): { tools: unknown[] } {
  return { tools };
}

const PAY = T("create_payment", "pay", H("POST", "/v1/payments"), {
  untrusted_result: false,
  unsafe_to_retry: false,
  data_class: "private",
});
const GETV = T("get_vendor", "read", H("GET", "/v1/vendors/{id}"), {
  unsafe_to_retry: false,
  data_class: "public",
});
const LISTV = T("list_vendors", "read", H("GET", "/v1/vendors"), {
  untrusted_result: false,
  unsafe_to_retry: true,
});
const MAIL = T("send_mail", "send", H("POST", "/v1/mail"), {
  unsafe_to_retry: true,
});
const OA = S(PAY, GETV, LISTV, MAIL);

const FIND = T("find_vendor", "read", M("find_vendor"), {
  untrusted_result: false,
  data_class: "private",
});
const NOTE = T("note", "write", M("Log.Note"), { unsafe_to_retry: false });
const PLAIN = T("plain", "write", M("plain"));
const MS = S(FIND, NOTE, PLAIN);

function surfaceOf(surface: unknown): ReadonlyMap<string, StoredTool> {
  const map = call(() => storedTools(surface));
  assert.ok(map !== null, "a valid surface gives a map");
  return map;
}

function toolOf(map: ReadonlyMap<string, StoredTool>, key: string): StoredTool {
  const tool = map.get(key);
  assert.ok(tool !== undefined, `the surface holds ${key}`);
  return tool;
}

function carried(
  adapter: OverlayAdapter,
  stored: StoredTool | undefined,
  effect: string,
  derivedName: string | null,
) {
  return call(() => carriedFields(adapter, stored, { effect, derivedName }));
}

function afterEffect(
  adapter: OverlayAdapter,
  stored: ReadonlyMap<string, StoredTool> | null,
  lookup: string | null,
  effect: string,
  derivedName: string | null,
) {
  return call(() => carriedAfterEffect(adapter, stored, lookup, effect, derivedName));
}

test("C-03790492 storedTools reads the four OpenAPI tools in order with the engine defaults (ST1)", () => {
  const map = surfaceOf(OA);
  assert.deepEqual([...map.keys()], [
    "create_payment",
    "get_vendor",
    "list_vendors",
    "send_mail",
  ]);
  assert.deepEqual(toolOf(map, "create_payment"), {
    name: "create_payment",
    effect: "pay",
    untrusted_result: false,
    unsafe_to_retry: false,
    data_class: "private",
    serverName: null,
  });
  assert.deepEqual(toolOf(map, "get_vendor"), {
    name: "get_vendor",
    effect: "read",
    untrusted_result: true,
    unsafe_to_retry: false,
    data_class: "public",
    serverName: null,
  });
  assert.deepEqual(toolOf(map, "list_vendors"), {
    name: "list_vendors",
    effect: "read",
    untrusted_result: false,
    unsafe_to_retry: true,
    data_class: null,
    serverName: null,
  });
  assert.deepEqual(toolOf(map, "send_mail"), {
    name: "send_mail",
    effect: "send",
    untrusted_result: true,
    unsafe_to_retry: true,
    data_class: null,
    serverName: null,
  });
});

test("C-03790492 storedTools reads MCP tools with the server name (ST2)", () => {
  const map = surfaceOf(MS);
  assert.deepEqual([...map.keys()], ["find_vendor", "note", "plain"]);
  assert.deepEqual(toolOf(map, "find_vendor"), {
    name: "find_vendor",
    effect: "read",
    untrusted_result: false,
    unsafe_to_retry: null,
    data_class: "private",
    serverName: "find_vendor",
  });
  assert.deepEqual(toolOf(map, "note"), {
    name: "note",
    effect: "write",
    untrusted_result: true,
    unsafe_to_retry: false,
    data_class: null,
    serverName: "Log.Note",
  });
  assert.deepEqual(toolOf(map, "plain"), {
    name: "plain",
    effect: "write",
    untrusted_result: true,
    unsafe_to_retry: null,
    data_class: null,
    serverName: "plain",
  });
});

test("C-03790492 storedTools gives an empty map and refuses malformed surfaces (ST3, ST4, ST5)", () => {
  const empty = surfaceOf(S());
  assert.equal(empty.size, 0);

  const valid = T("ok", "read", H("GET", "/v1/ok"));
  const many = Array.from({ length: 101 }, (_, i) =>
    T(`t${i}`, "read", H("GET", `/v1/${i}`)),
  );
  const surfaces: [string, unknown][] = [
    ["null", null],
    ["an array", []],
    ["tools not a list", { tools: {} }],
    ["101 tools", { tools: many }],
    ["a null tool", S(null)],
    ["a name with a capital", S({ ...valid, name: "Bad" })],
    ["an effect outside the four", S({ ...valid, effect: "admin" })],
    ["duplicate names", S(PAY, PAY)],
    ["a non-boolean untrusted_result", S({ ...valid, untrusted_result: "no" })],
    ["a non-boolean unsafe_to_retry", S({ ...valid, unsafe_to_retry: 1 })],
    ["an unknown data class", S({ ...valid, data_class: "secret" })],
    ["a call that is a string", S({ ...valid, call: "x" })],
    ["an MCP call name with a space", S(T("ok2", "read", M("has space")))],
    [
      "an MCP call without a name",
      S(
        T("ok3", "read", {
          kind: "mcp",
          endpoint: "/mcp",
          protocolVersion: "2026-07-28",
          output: "structured",
        }),
      ),
    ],
  ];
  assert.equal(surfaces.length, 14);
  for (const [label, surface] of surfaces) {
    assert.equal(call(() => storedTools(surface)), null, label);
  }

  const bare = surfaceOf(S(T("bare", "read", null, { data_class: null })));
  assert.deepEqual(toolOf(bare, "bare"), {
    name: "bare",
    effect: "read",
    untrusted_result: true,
    unsafe_to_retry: null,
    data_class: null,
    serverName: null,
  });
});

test("C-03790492 trustOf gives DEFAULT_TRUST itself for an absent tool and the stored trust (TO1, TO2)", () => {
  const absent = call(() => trustOf(undefined));
  assert.equal(absent, DEFAULT_TRUST);
  assert.ok(Object.isFrozen(DEFAULT_TRUST), "DEFAULT_TRUST is frozen");
  assert.deepEqual(DEFAULT_TRUST, { trusted: false, dataClass: null });

  const map = surfaceOf(OA);
  assert.deepEqual(call(() => trustOf(toolOf(map, "create_payment"))), {
    trusted: true,
    dataClass: "private",
  });
  assert.deepEqual(call(() => trustOf(toolOf(map, "get_vendor"))), {
    trusted: false,
    dataClass: "public",
  });
  assert.deepEqual(call(() => trustOf(toolOf(map, "list_vendors"))), {
    trusted: true,
    dataClass: null,
  });
  assert.deepEqual(call(() => trustOf(toolOf(map, "send_mail"))), {
    trusted: false,
    dataClass: null,
  });
});

test("C-199d4e64 carriedFields carries a retry flag only when the OpenAPI effect is unchanged (CF1 to CF8)", () => {
  const st = surfaceOf(OA);
  assert.deepEqual(carried("openapi", toolOf(st, "create_payment"), "pay", "create_payment"), {
    unsafe_to_retry: false,
  });
  assert.deepEqual(carried("openapi", toolOf(st, "get_vendor"), "pay", "get_vendor"), {});
  assert.deepEqual(carried("openapi", toolOf(st, "create_payment"), "send", "create_payment"), {});
  assert.deepEqual(carried("openapi", toolOf(st, "get_vendor"), "read", "get_vendor"), {});
  assert.deepEqual(carried("openapi", toolOf(st, "list_vendors"), "read", "list_vendors"), {
    unsafe_to_retry: true,
  });
  assert.deepEqual(carried("openapi", toolOf(st, "send_mail"), "send", "send_mail"), {});
  assert.deepEqual(carried("openapi", toolOf(st, "send_mail"), "send", "mail_out"), {
    name: "send_mail",
  });
  assert.deepEqual(carried("openapi", undefined, "pay", "create_payment"), {});
});

test("C-199d4e64 carriedFields carries the MCP retry flag and a differing name (CF9 to CF14)", () => {
  const sm = surfaceOf(MS);
  assert.deepEqual(carried("mcp", toolOf(sm, "note"), "write", "note"), {
    unsafe_to_retry: false,
  });
  assert.deepEqual(carried("mcp", toolOf(sm, "note"), "send", "note"), {});
  assert.deepEqual(carried("mcp", toolOf(sm, "find_vendor"), "read", "find_vendor"), {});
  assert.deepEqual(carried("mcp", toolOf(sm, "plain"), "write", "plain"), {});

  const readTrue = surfaceOf(
    S(T("reader_true", "read", M("reader_true"), { unsafe_to_retry: true })),
  );
  assert.deepEqual(carried("mcp", toolOf(readTrue, "reader_true"), "read", "reader_true"), {});

  const readFalse = surfaceOf(
    S(T("reader_false", "read", M("reader_false"), { unsafe_to_retry: false })),
  );
  assert.deepEqual(carried("mcp", toolOf(readFalse, "reader_false"), "read", "reader_false"), {
    unsafe_to_retry: false,
  });
});

test("C-199d4e64 carriedAfterEffect treats Proposed as write and carries nothing for a changed effect (CA1 to CA10)", () => {
  const sm = surfaceOf(MS);
  const st = surfaceOf(OA);
  assert.deepEqual(afterEffect("mcp", sm, "Log.Note", "", null), {
    unsafe_to_retry: false,
  });
  assert.deepEqual(afterEffect("mcp", sm, "Log.Note", "send", null), {});
  assert.deepEqual(afterEffect("mcp", sm, "Log.Note", "write", null), {
    unsafe_to_retry: false,
  });
  assert.deepEqual(afterEffect("openapi", st, "create_payment", "pay", "create_payment"), {
    unsafe_to_retry: false,
  });
  assert.deepEqual(afterEffect("openapi", st, "create_payment", "send", "create_payment"), {});
  assert.deepEqual(afterEffect("openapi", st, "create_payment", "", "create_payment"), {});
  assert.deepEqual(afterEffect("openapi", null, "create_payment", "pay", "create_payment"), {});
  assert.deepEqual(afterEffect("mcp", sm, "nothing", "write", null), {});
  assert.deepEqual(afterEffect("openapi", st, null, "pay", "create_payment"), {});

  const finder = surfaceOf(
    S(T("finder", "read", M("Find.It"), { unsafe_to_retry: false })),
  );
  assert.deepEqual(afterEffect("mcp", finder, "Find.It", "", null), {});
});
