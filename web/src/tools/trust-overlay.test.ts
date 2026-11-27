/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import type { OperationRowView } from "./register.ts";
import {
  DEFAULT_TRUST,
  carriedAfterEffect,
  discoverSettings,
  overlayEntry,
  prefillTrust,
  storedTools,
  type Carried,
  type DataClass,
  type StoredTool,
  type ToolTrust,
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

const OPS: readonly OperationRowView[] = [
  {
    operationId: "createPayment",
    name: "create_payment",
    method: "POST",
    path: "/v1/payments",
    excluded: null,
  },
  {
    operationId: "getVendor",
    name: "get_vendor",
    method: "GET",
    path: "/v1/vendors/{id}",
    excluded: null,
  },
  {
    operationId: "listVendors",
    name: "list_vendors",
    method: "GET",
    path: "/v1/vendors",
    excluded: null,
  },
  {
    operationId: "sendMail",
    name: "send_mail",
    method: "POST",
    path: "/v1/mail",
    excluded: null,
  },
  {
    operationId: "newOp",
    name: "new_op",
    method: "GET",
    path: "/v1/new",
    excluded: null,
  },
  {
    operationId: "exportVendors",
    name: "export_vendors",
    method: "PUT",
    path: "/v1/export",
    excluded: "method_unsupported",
  },
  {
    operationId: null,
    name: "no_id",
    method: "GET",
    path: "/v1/no-id",
    excluded: "no_operation_id",
  },
  {
    operationId: "noName",
    name: null,
    method: "GET",
    path: "/v1/no-name",
    excluded: null,
  },
];

function surfaceOf(surface: unknown): ReadonlyMap<string, StoredTool> {
  const map = call(() => storedTools(surface));
  assert.ok(map !== null, "a valid surface gives a map");
  return map;
}

function trust(
  trusted: boolean,
  dataClass: DataClass | null,
): ToolTrust {
  return { trusted, dataClass };
}

test("C-75b3f1d2 overlayEntry keeps only non-default members in order (OE1 to OE7)", () => {
  assert.deepEqual(call(() => overlayEntry("openapi", "pay", DEFAULT_TRUST, {})), {
    effect: "pay",
  });
  assert.deepEqual(call(() => overlayEntry("mcp", null, DEFAULT_TRUST, {})), {});
  assert.deepEqual(
    call(() => overlayEntry("openapi", "read", trust(true, "public"), {})),
    { effect: "read", untrusted_result: false, data_class: "public" },
  );
  const oe4 = call(() =>
    overlayEntry("openapi", "pay", trust(true, "private"), {
      name: "pay_it",
      unsafe_to_retry: false,
    }),
  );
  assert.deepEqual(oe4, {
    effect: "pay",
    name: "pay_it",
    untrusted_result: false,
    unsafe_to_retry: false,
    data_class: "private",
  });
  assert.deepEqual(Object.keys(oe4), [
    "effect",
    "name",
    "untrusted_result",
    "unsafe_to_retry",
    "data_class",
  ]);
  assert.deepEqual(
    call(() =>
      overlayEntry("mcp", null, trust(true, "private"), { unsafe_to_retry: false }),
    ),
    { untrusted_result: false, unsafe_to_retry: false, data_class: "private" },
  );
  assert.deepEqual(call(() => overlayEntry("mcp", null, DEFAULT_TRUST, { name: "finder" })), {
    name: "finder",
  });

  assert.throws(() => overlayEntry("openapi", null, DEFAULT_TRUST, {}), RangeError);
  assert.throws(() => overlayEntry("openapi", "admin", DEFAULT_TRUST, {}), RangeError);
  assert.throws(
    () =>
      overlayEntry("openapi", "read", {
        trusted: false,
        dataClass: "secret" as unknown as DataClass,
      }, {}),
    RangeError,
  );
  assert.throws(
    () => overlayEntry("openapi", "read", DEFAULT_TRUST, { name: "Bad Name" }),
    RangeError,
  );
});

test("C-75b3f1d2 prefillTrust pairs stored tools with operations (PF1, PF5, PF6, PF7)", () => {
  const st = surfaceOf(OA);
  const pf1 = call(() => prefillTrust(st, OPS));
  assert.deepEqual(pf1.trust, {
    createPayment: trust(true, "private"),
    getVendor: trust(false, "public"),
    listVendors: trust(true, null),
  });
  assert.deepEqual(pf1.carried, {
    createPayment: { unsafe_to_retry: false },
    listVendors: { unsafe_to_retry: true },
  });
  assert.deepEqual(Object.keys(pf1.trust).sort(), [
    "createPayment",
    "getVendor",
    "listVendors",
  ]);
  assert.deepEqual(Object.keys(pf1.carried).sort(), ["createPayment", "listVendors"]);

  assert.deepEqual(call(() => prefillTrust(new Map(), OPS)), { trust: {}, carried: {} });
  assert.deepEqual(call(() => prefillTrust(null, OPS)), { trust: {}, carried: {} });

  const renamed = surfaceOf(
    S(
      T("pay_it", "pay", H("POST", "/v1/payments"), {
        untrusted_result: false,
        data_class: "private",
      }),
    ),
  );
  assert.deepEqual(call(() => prefillTrust(renamed, OPS)), { trust: {}, carried: {} });
});

test("C-75b3f1d2 prefilled entries carry only non-default values (PF2, PF3, PF4)", () => {
  const st = surfaceOf(OA);
  const prefill = call(() => prefillTrust(st, OPS));
  const entryFor = (operationId: string, effect: string): Record<string, string | boolean> =>
    call(() =>
      overlayEntry(
        "openapi",
        effect,
        prefill.trust[operationId] ?? DEFAULT_TRUST,
        prefill.carried[operationId] ?? {},
      ),
    );

  assert.deepEqual(entryFor("createPayment", "pay"), {
    effect: "pay",
    untrusted_result: false,
    unsafe_to_retry: false,
    data_class: "private",
  });
  assert.deepEqual(entryFor("getVendor", "read"), {
    effect: "read",
    data_class: "public",
  });
  assert.deepEqual(entryFor("listVendors", "read"), {
    effect: "read",
    untrusted_result: false,
    unsafe_to_retry: true,
  });
  assert.deepEqual(entryFor("sendMail", "send"), { effect: "send" });

  const payCarried: Carried = call(() =>
    carriedAfterEffect("openapi", st, "get_vendor", "pay", "get_vendor"),
  );
  assert.deepEqual(payCarried, {});
  assert.deepEqual(
    call(() =>
      overlayEntry(
        "openapi",
        "pay",
        prefill.trust["getVendor"] ?? DEFAULT_TRUST,
        payCarried,
      ),
    ),
    { effect: "pay", data_class: "public" },
  );

  const sendCarried: Carried = call(() =>
    carriedAfterEffect("openapi", st, "create_payment", "send", "create_payment"),
  );
  assert.deepEqual(sendCarried, {});
  assert.deepEqual(
    call(() =>
      overlayEntry(
        "openapi",
        "send",
        prefill.trust["createPayment"] ?? DEFAULT_TRUST,
        sendCarried,
      ),
    ),
    { effect: "send", untrusted_result: false, data_class: "private" },
  );
});

test("C-75b3f1d2 discoverSettings reads the server tool names (DS1 to DS3)", () => {
  const sm = surfaceOf(MS);
  assert.deepEqual(call(() => discoverSettings(sm)), {
    trust: { find_vendor: trust(true, "private") },
    carried: { "Log.Note": { unsafe_to_retry: false } },
  });

  assert.deepEqual(call(() => discoverSettings(new Map())), { trust: {}, carried: {} });
  assert.deepEqual(call(() => discoverSettings(null)), { trust: {}, carried: {} });

  const proto = surfaceOf(
    S(T("proto_tool", "read", M("__proto__"), { untrusted_result: false })),
  );
  assert.deepEqual(call(() => discoverSettings(proto)), { trust: {}, carried: {} });
});
