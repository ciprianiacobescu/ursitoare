/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import type { ApiClient } from "../api/client.ts";
import { registerToolMessages } from "./messages.ts";
import {
  codeDraftOf,
  loadCodeDraft,
  parsePreview,
  prefillEffects,
  previewOperations,
  registerServer,
  registrationFormErrors,
  replaceServer,
  type CodeDraft,
  type OperationRowView,
  type RegistrationRequest,
} from "./register.ts";

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
    put: async (path: string, body?: unknown, opts?: unknown) => log("put", path, body, opts),
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

const DOC = { openapi: "3.0.3", paths: {} };
const IO = { type: "object" };
const IO_TEXT = "{\n  \"type\": \"object\"\n}";

const OP1 = {
  operationId: "createPayment",
  method: "POST",
  path: "/payments",
  name: "create_payment",
  excluded: null,
};
const OP2 = {
  operationId: "exportVendors",
  method: "HEAD",
  path: "/export",
  name: "export_vendors",
  excluded: "method_unsupported",
};
const OP3 = {
  operationId: null,
  method: "GET",
  path: "/ping",
  name: null,
  excluded: "no_operation_id",
};
const PV = { version: "3.0", basePath: "/v1", operations: [OP1, OP2, OP3] };
const PV_VIEW: { basePath: string; operations: OperationRowView[] } = {
  basePath: "/v1",
  operations: [
    {
      operationId: "createPayment",
      name: "create_payment",
      method: "POST",
      path: "/payments",
      excluded: null,
    },
    {
      operationId: "exportVendors",
      name: "export_vendors",
      method: "HEAD",
      path: "/export",
      excluded: "method_unsupported",
    },
    {
      operationId: null,
      name: null,
      method: "GET",
      path: "/ping",
      excluded: "no_operation_id",
    },
  ],
};

test("C-a4971512 parsePreview reads the operations without the version and refuses malformed previews", () => {
  const before = JSON.stringify(PV);
  assert.deepEqual(call(() => parsePreview(PV)), PV_VIEW);
  assert.equal(JSON.stringify(PV), before, "the preview answer is not changed");

  const malformed: [string, unknown][] = [
    ["not an object", null],
    ["unknown version", { ...PV, version: "2.0" }],
    ["base path without a slash", { ...PV, basePath: "v1" }],
    ["operations not a list", { ...PV, operations: "x" }],
    ["method lowercase", { ...PV, operations: [{ ...OP1, method: "get" }] }],
    ["path without a slash", { ...PV, operations: [{ ...OP1, path: "ping" }] }],
    ["empty operation id", { ...PV, operations: [{ ...OP1, operationId: "" }] }],
    ["name not a string", { ...PV, operations: [{ ...OP1, name: 5 }] }],
    ["unknown exclusion", { ...PV, operations: [{ ...OP1, excluded: "weird" }] }],
  ];
  for (const [label, raw] of malformed) {
    assert.equal(call(() => parsePreview(raw)), null, label);
  }
});

const PREQ: Extract<RegistrationRequest, { ok: true }> = {
  ok: true,
  path: "/tool-registrations/openapi/preview",
  body: { origin: "https://tools.fake.test", local: false, document: DOC },
};

test("C-a4971512 previewOperations posts the preview and refuses another path and an unreadable answer", async () => {
  const ctl = new AbortController();
  const withSignal = fake(() => PV);
  const view = await settled(previewOperations(withSignal.client, PREQ, ctl.signal));
  assert.deepEqual(view, PV_VIEW);
  assert.deepEqual(withSignal.records, [
    ["post", PREQ.path, PREQ.body, { signal: ctl.signal }],
  ]);

  const none = fake(() => PV);
  await assert.rejects(
    previewOperations(none.client, { ...PREQ, path: "/tool-registrations/mcp" }),
    RangeError,
  );
  assert.deepEqual(none.records, []);

  await invalid(previewOperations(fake(() => ({})).client, PREQ));
});

const MREQ: Extract<RegistrationRequest, { ok: true }> = {
  ok: true,
  path: "/tool-registrations/mcp",
  body: { id: "crm", url: "https://mcp.fake.test/mcp", local: false },
};
const OREQ: Extract<RegistrationRequest, { ok: true }> = {
  ok: true,
  path: "/tool-registrations/openapi",
  body: { id: "ledger", origin: "https://tools.fake.test", local: false, document: DOC },
};
const CREQ: Extract<RegistrationRequest, { ok: true }> = {
  ok: true,
  path: "/tool-registrations/code",
  body: { id: "snips", tools: [] },
};
const KEY = { headers: { "Idempotency-Key": "k-1" } };

test("C-a4971512 registerServer posts under the key and reads the id from the server for MCP", async () => {
  const mcp = fake(() => ({ server: { id: "crm" }, endpoint: "/mcp" }));
  assert.deepEqual(await settled(registerServer(mcp.client, MREQ, "k-1")), { id: "crm" });
  assert.deepEqual(mcp.records, [["post", MREQ.path, MREQ.body, KEY]]);

  const openapi = fake(() => ({ id: "ledger" }));
  assert.deepEqual(await settled(registerServer(openapi.client, OREQ, "k-1")), { id: "ledger" });
  assert.deepEqual(openapi.records, [["post", OREQ.path, OREQ.body, KEY]]);

  const code = fake(() => ({ id: "snips" }));
  assert.deepEqual(await settled(registerServer(code.client, CREQ, "k-1")), { id: "snips" });
  assert.deepEqual(code.records, [["post", CREQ.path, CREQ.body, KEY]]);
});

test("C-a4971512 registerServer refuses unreadable answers a blank key and another path", async () => {
  await invalid(registerServer(fake(() => ({ id: "crm" })).client, MREQ, "k-1"));
  await invalid(registerServer(fake(() => ({ server: { id: "ledger" } })).client, OREQ, "k-1"));
  await invalid(registerServer(fake(() => ({ id: "Bad Id" })).client, OREQ, "k-1"));
  await invalid(registerServer(fake(() => 5).client, OREQ, "k-1"));

  const none = fake(() => ({ server: { id: "crm" } }));
  for (const key of ["", "  "]) {
    await assert.rejects(registerServer(none.client, MREQ, key), RangeError, key);
  }
  await assert.rejects(
    registerServer(none.client, { ok: true, path: "/tool-servers", body: {} }, "k-1"),
    RangeError,
  );
  assert.deepEqual(none.records, []);
});

const R1: Extract<RegistrationRequest, { ok: true }> = {
  ok: true,
  path: "/tool-servers/ledger/openapi",
  body: {
    document: DOC,
    overlay: { operations: { createPayment: { effect: "pay" } } },
  },
};

test("C-a4971512 replaceServer puts a replacement and refuses an unreadable answer and a registration request", async () => {
  const put = fake(() => ({ id: "ledger" }));
  assert.deepEqual(await settled(replaceServer(put.client, R1)), { id: "ledger" });
  assert.deepEqual(put.records, [["put", R1.path, R1.body]]);

  await invalid(replaceServer(fake(() => 5).client, R1));

  const none = fake(() => ({ id: "ledger" }));
  await assert.rejects(replaceServer(none.client, MREQ), RangeError);
  assert.deepEqual(none.records, []);
});

test("C-a4971512 prefillEffects maps each non-excluded operation to its tool effect", () => {
  const tools = [
    { name: "create_payment", effect: "pay" },
    { name: "list_vendors", effect: "read" },
    { name: "gone", effect: "write" },
  ];
  const listVendors: OperationRowView = {
    operationId: "listVendors",
    name: "list_vendors",
    method: "GET",
    path: "/vendors",
    excluded: null,
  };
  const operations = [...PV_VIEW.operations, listVendors];
  assert.deepEqual(call(() => prefillEffects(tools, operations)), {
    createPayment: "pay",
    listVendors: "read",
  });
  assert.deepEqual(call(() => prefillEffects([], operations)), {});
});

const SOURCE = "return { words: 1 };";
const TOOL = {
  name: "word_count",
  description: "Counts words.",
  effect: "read",
  input: IO,
  output: IO,
  call: { kind: "code", source: SOURCE },
};
const S1 = { tools: [TOOL] };
const CODE_DRAFT: CodeDraft = {
  id: "snips",
  name: "word_count",
  description: "Counts words.",
  inputText: IO_TEXT,
  outputText: IO_TEXT,
  source: SOURCE,
};

test("C-a4971512 codeDraftOf reads one code tool and refuses any other surface", () => {
  assert.deepEqual(call(() => codeDraftOf("snips", S1)), CODE_DRAFT);
  assert.equal(
    call(() => codeDraftOf("snips", { tools: [TOOL, { ...TOOL, name: "other" }] })),
    null,
    "two tools",
  );
  assert.equal(call(() => codeDraftOf("snips", { tools: [] })), null, "no tools");
  assert.equal(
    call(() => codeDraftOf("snips", { tools: [{ ...TOOL, call: { kind: "mcp" } }] })),
    null,
    "not a code tool",
  );
  assert.equal(call(() => codeDraftOf("snips", 5)), null, "not a surface");
});

test("C-a4971512 loadCodeDraft reads the server and prefers the pending surface", async () => {
  const approved = fake(() => ({ approvedSurface: S1, pendingSurface: null }));
  assert.deepEqual(await settled(loadCodeDraft(approved.client, "snips")), CODE_DRAFT);
  assert.deepEqual(approved.records, [["get", "/tool-servers/snips"]]);

  const S2 = { tools: [{ ...TOOL, call: { kind: "code", source: "return 2;" } }] };
  const pending = fake(() => ({ approvedSurface: S1, pendingSurface: S2 }));
  assert.deepEqual(await settled(loadCodeDraft(pending.client, "snips")), {
    ...CODE_DRAFT,
    source: "return 2;",
  });
});

function validation(fields: { field: string; message: string }[]): ApiRequestError {
  return new ApiRequestError(400, "VALIDATION_FAILED", "m", { details: { fields } });
}

const LOOPBACK = "This address is the engine itself; use the server's network address.";

test("C-a4971512 registrationFormErrors maps the conflict and the named validation fields", () => {
  assert.deepEqual(
    call(() => registrationFormErrors("mcp", new ApiRequestError(409, "ALREADY_EXISTS", "m"))),
    { id: "A tool server with this id already exists." },
  );
  assert.deepEqual(
    call(() =>
      registrationFormErrors(
        "mcp",
        validation([
          { field: "body/url", message: "loopback" },
          { field: "body/id", message: "m" },
        ]),
      ),
    ),
    { url: LOOPBACK, id: "m" },
  );
  assert.deepEqual(
    call(() =>
      registrationFormErrors(
        "code",
        validation([
          { field: "body/tools/0/source", message: "code source does not parse (line 2): Unexpected token" },
          { field: "body/tools/1/name", message: "m" },
        ]),
      ),
    ),
    { source: "code source does not parse (line 2): Unexpected token", name: "m" },
  );
});

test("C-a4971512 registrationFormErrors puts an unknown field and a forbidden answer on the form", () => {
  assert.deepEqual(
    call(() =>
      registrationFormErrors(
        "openapi",
        validation([{ field: "body/overlay/operations/ghost", message: "unknown_operation" }]),
      ),
    ),
    {
      $form:
        "Some of the information is not valid. Check it and try again. body/overlay/operations/ghost: unknown_operation",
    },
  );
  assert.deepEqual(
    call(() =>
      registrationFormErrors(
        "mcp",
        new ApiRequestError(403, "FORBIDDEN", "m", { details: { decisionId: "dec_1" } }),
      ),
    ),
    {
      $form:
        "You are not allowed to do this. If you think you should be, give the decision id to an administrator. Decision id: dec_1",
    },
  );
});

const REGISTER_REASONS: Readonly<Record<string, string>> = {
  path: "Remove the query, fragment or text after the path.",
  query: "Remove the query; store a key as a credential.",
  credentials: "Remove the user name and password; store the key as a credential.",
  loopback: "This address is the engine itself; use the server's network address.",
  localhost: "This address is the engine itself; use the server's network address.",
  private: 'Tick "Local network server" for a private address.',
  link_local: 'Tick "Local network server" for a private address.',
  metadata: "This address is reserved.",
  service_name: "This address is reserved.",
  server_mismatch: "The document's `servers` URL must be this origin or a path.",
  openapi_version: "Only OpenAPI 3.0 and 3.1 JSON documents are supported.",
  operation_excluded: "This operation cannot become a tool (see the Effect column).",
  name_collision: "Two operations get the same tool name; skip one.",
  size: "The tools are too large; skip the operations you do not need.",
};

test("C-a4971512 registrationFormErrors reads every engine reason and the payload text", () => {
  for (const [reason, text] of Object.entries(REGISTER_REASONS)) {
    assert.deepEqual(
      call(() =>
        registrationFormErrors("mcp", validation([{ field: "body/url", message: reason }])),
      ),
      { url: text },
      reason,
    );
  }
  assert.deepEqual(
    call(() => registrationFormErrors("mcp", validation([{ field: "body/url", message: "ipv6" }]))),
    { url: "ipv6" },
  );
  assert.deepEqual(
    call(() =>
      registrationFormErrors("openapi", new ApiRequestError(413, "PAYLOAD_TOO_LARGE", "m")),
    ),
    {
      document:
        "The document is over 1 MiB. Remove the paths you do not need, then preview again.",
    },
  );
});
