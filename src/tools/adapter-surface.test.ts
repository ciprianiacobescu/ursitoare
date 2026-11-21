import assert from "node:assert/strict";
import { test } from "node:test";

import { kitSurface } from "../../test/support/adapter-kit.ts";
import {
  ADAPTER_CALL_KINDS,
  CODE_BLOCK_ORIGIN,
  MAX_CODE_SOURCE_CHARS,
  MAX_SURFACE_CHARS,
  checkAdapterSurface,
} from "./adapter-surface.ts";
import { MCP_TEXT_OUTPUT_SCHEMA } from "./calls.ts";
import { ToolsError } from "./types.ts";
import type { ToolAdapter } from "./types.ts";

function inputV(): Record<string, unknown> {
  return {
    type: "object",
    properties: { vendor_name: { type: "string" } },
    required: ["vendor_name"],
  };
}

function outputV(): Record<string, unknown> {
  return {
    type: "object",
    properties: { vendor_id: { type: "string" } },
    required: ["vendor_id"],
  };
}

function mcpText(): Record<string, unknown> {
  return {
    type: "object",
    properties: { text: { type: "string" } },
    required: ["text"],
    additionalProperties: false,
  };
}

function httpCall(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    kind: "http",
    method: "POST",
    path: "/vendors/find",
    params: [],
    body: true,
    ...over,
  };
}

function mcpCall(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    kind: "mcp",
    endpoint: "/mcp",
    name: "search.notes",
    protocolVersion: "2026-07-28",
    output: "text",
    ...over,
  };
}

function codeCall(over: Record<string, unknown> = {}): Record<string, unknown> {
  return { kind: "code", source: "return { words: 3 };", ...over };
}

function tHttp(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "find_vendor",
    description: "Find a vendor by name.",
    effect: "read",
    input: inputV(),
    output: outputV(),
    untrusted_result: false,
    call: httpCall(),
    ...over,
  };
}

function tGet(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "get_vendor",
    effect: "read",
    input: {
      type: "object",
      properties: { vendor_id: { type: "string" }, expand: { type: "boolean" } },
      required: ["vendor_id"],
    },
    output: outputV(),
    untrusted_result: false,
    call: httpCall({
      method: "GET",
      path: "/vendors/{vendor_id}",
      params: [
        { name: "vendor_id", in: "path" },
        { name: "expand", in: "query" },
      ],
      body: false,
    }),
    ...over,
  };
}

function tMcp(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "search_notes",
    description: "Search the notes.",
    effect: "write",
    input: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    output: mcpText(),
    untrusted_result: true,
    unsafe_to_retry: true,
    call: mcpCall(),
    ...over,
  };
}

function tCode(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "word_count",
    description: "Count the words.",
    effect: "read",
    input: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
    output: {
      type: "object",
      properties: { words: { type: "integer" } },
      required: ["words"],
    },
    untrusted_result: false,
    call: codeCall(),
    ...over,
  };
}

function withoutCall(tool: Record<string, unknown>): Record<string, unknown> {
  const { call: _call, ...rest } = tool;
  return rest;
}

function withoutUntrustedResult(tool: Record<string, unknown>): Record<string, unknown> {
  const { untrusted_result: _untrusted, ...rest } = tool;
  return rest;
}

function fix(): Record<string, unknown> {
  return {
    ...withoutCall(tHttp()),
    http: { method: "POST", path: "/vendors/find" },
  };
}

function surfaceOf(tool: Record<string, unknown>): Record<string, unknown> {
  return { tools: [tool] };
}

function expectAccepted(adapter: ToolAdapter, surface: unknown): void {
  assert.doesNotThrow(() => {
    assert.equal(checkAdapterSurface(adapter, surface), surface);
  });
}

function expectInvalid(
  adapter: ToolAdapter,
  surface: unknown,
  field: string,
  reason: string,
): void {
  assert.throws(
    () => checkAdapterSurface(adapter, surface),
    (error: unknown) => {
      if (!(error instanceof ToolsError)) return false;
      return (
        error.code === "TOOLS_INVALID" &&
        error.details["field"] === field &&
        error.details["reason"] === reason
      );
    },
    `${field} ${reason}`,
  );
}

test("C-fcf2be72: accepted surfaces come back as the same object", () => {
  for (const [kind, adapter] of [
    ["http", "http_openapi"],
    ["mcp", "mcp"],
    ["code", "code_block"],
  ] as const) {
    assert.doesNotThrow(() => {
      const surface = kitSurface(kind);
      assert.equal(checkAdapterSurface(adapter, surface), surface);
    }, `kitSurface(${kind})`);
  }

  const accepted: readonly [ToolAdapter, Record<string, unknown>][] = [
    ["http_openapi", surfaceOf(tGet())],
    [
      "mcp",
      surfaceOf(tMcp({ output: outputV(), call: mcpCall({ output: "structured" }) })),
    ],
    ["mcp", surfaceOf(tMcp({ call: mcpCall({ hints: { readOnly: true } }) }))],
    [
      "code_block",
      surfaceOf(tCode({ call: codeCall({ source: "a".repeat(65536) }) })),
    ],
    [
      "http_openapi",
      surfaceOf(
        tHttp({
          input: {
            type: "object",
            properties: { pattern: { type: "string" }, vendor_name: { type: "string" } },
            required: ["vendor_name"],
          },
        }),
      ),
    ],
    [
      "http_openapi",
      surfaceOf(
        tHttp({
          input: {
            type: "object",
            properties: {
              vendor_name: {
                type: "object",
                enum: [{ pattern: "x" }],
                default: { pattern: "x" },
              },
            },
            required: ["vendor_name"],
            "x-ui": { pattern: "x" },
          },
        }),
      ),
    ],
    [
      "code_block",
      surfaceOf(
        tCode({
          input: {
            type: "object",
            properties: { text: { type: "string", pattern: "^a" } },
            required: ["text"],
          },
        }),
      ),
    ],
    ["fixture", surfaceOf(fix())],
  ];

  for (const [adapter, surface] of accepted) {
    expectAccepted(adapter, surface);
  }
});

test("C-fcf2be72: each refused tool names its field and reason", () => {
  expectInvalid("fixture", surfaceOf(tHttp()), "tools/0", "unknown_property");
  expectInvalid("http_openapi", surfaceOf(fix()), "tools/0/http", "unknown_property");
  expectInvalid(
    "http_openapi",
    surfaceOf(withoutCall(tHttp())),
    "tools/0/call",
    "not_object",
  );

  expectInvalid(
    "http_openapi",
    surfaceOf(tHttp({ call: mcpCall() })),
    "tools/0/call/kind",
    "kind_mismatch",
  );
  expectInvalid(
    "mcp",
    surfaceOf(tMcp({ call: httpCall() })),
    "tools/0/call/kind",
    "kind_mismatch",
  );
  expectInvalid(
    "code_block",
    surfaceOf(tCode({ call: httpCall() })),
    "tools/0/call/kind",
    "kind_mismatch",
  );

  expectInvalid(
    "http_openapi",
    surfaceOf(tHttp({ call: httpCall({ extra: 1 }) })),
    "tools/0/call/extra",
    "unknown_property",
  );
  expectInvalid(
    "http_openapi",
    surfaceOf(tHttp({ call: httpCall({ method: "TRACE" }) })),
    "tools/0/call/method",
    "bad_value",
  );
  expectInvalid(
    "http_openapi",
    surfaceOf(tHttp({ call: httpCall({ path: "/vendors/find?x=1" }) })),
    "tools/0/call/path",
    "bad_value",
  );

  expectInvalid(
    "http_openapi",
    surfaceOf(tHttp({ call: httpCall({ path: "/vendors/{vendor_id}" }) })),
    "tools/0/call/path",
    "placeholder",
  );
  expectInvalid(
    "http_openapi",
    surfaceOf(
      tGet({
        call: httpCall({
          method: "GET",
          path: "/vendors",
          params: [
            { name: "vendor_id", in: "path" },
            { name: "expand", in: "query" },
          ],
          body: false,
        }),
      }),
    ),
    "tools/0/call/path",
    "placeholder",
  );

  expectInvalid(
    "http_openapi",
    surfaceOf(
      tGet({
        call: httpCall({
          method: "GET",
          path: "/vendors/{vendor_id}",
          params: [
            { name: "vendor_id", in: "path" },
            { name: "ghost", in: "query" },
          ],
          body: false,
        }),
      }),
    ),
    "tools/0/call/params",
    "param_unknown",
  );
  expectInvalid(
    "http_openapi",
    surfaceOf(
      tGet({
        call: httpCall({
          method: "GET",
          path: "/vendors/{vendor_id}",
          params: [
            { name: "vendor_id", in: "path" },
            { name: "expand", in: "header" },
          ],
          body: false,
        }),
      }),
    ),
    "tools/0/call/params",
    "bad_value",
  );

  expectInvalid(
    "http_openapi",
    surfaceOf(
      tGet({
        input: {
          type: "object",
          properties: { vendor_id: { type: "number" }, expand: { type: "boolean" } },
          required: ["vendor_id"],
        },
      }),
    ),
    "tools/0/call/params",
    "param_type",
  );

  expectInvalid(
    "http_openapi",
    surfaceOf(
      tGet({
        call: httpCall({
          method: "GET",
          path: "/vendors/{vendor_id}",
          params: [
            { name: "vendor_id", in: "path" },
            { name: "expand", in: "query" },
          ],
          body: true,
        }),
      }),
    ),
    "tools/0/call/body",
    "body_method",
  );
  expectInvalid(
    "http_openapi",
    surfaceOf(tHttp({ call: httpCall({ body: false }) })),
    "tools/0/call/body",
    "property_unsent",
  );

  expectInvalid(
    "mcp",
    surfaceOf(tMcp({ call: mcpCall({ endpoint: "/mcp?x=1" }) })),
    "tools/0/call/endpoint",
    "bad_value",
  );
  expectInvalid(
    "mcp",
    surfaceOf(tMcp({ call: mcpCall({ name: "bad name" }) })),
    "tools/0/call/name",
    "bad_value",
  );
  expectInvalid(
    "mcp",
    surfaceOf(tMcp({ call: mcpCall({ protocolVersion: "2024-11-05" }) })),
    "tools/0/call/protocolVersion",
    "bad_value",
  );

  expectInvalid(
    "mcp",
    surfaceOf(tMcp({ output: outputV(), call: mcpCall({ output: "text" }) })),
    "tools/0/call/output",
    "text_output",
  );

  expectInvalid(
    "code_block",
    surfaceOf(tCode({ call: codeCall({ source: "" }) })),
    "tools/0/call/source",
    "bad_value",
  );
  expectInvalid(
    "code_block",
    surfaceOf(tCode({ call: codeCall({ source: "a".repeat(65537) }) })),
    "tools/0/call/source",
    "bad_value",
  );
  expectInvalid(
    "code_block",
    surfaceOf(tCode({ call: codeCall({ source: "a\u0000b" }) })),
    "tools/0/call/source",
    "bad_value",
  );
  expectInvalid(
    "code_block",
    surfaceOf(tCode({ call: codeCall({ source: "\ud800" }) })),
    "tools/0/call/source",
    "bad_value",
  );

  expectInvalid(
    "code_block",
    surfaceOf(tCode({ effect: "write" })),
    "tools/0/effect",
    "effect_not_read",
  );
  expectInvalid(
    "code_block",
    surfaceOf(withoutUntrustedResult(tCode())),
    "tools/0/untrusted_result",
    "untrusted_result",
  );
  expectInvalid(
    "code_block",
    surfaceOf(tCode({ untrusted_result: true })),
    "tools/0/untrusted_result",
    "untrusted_result",
  );

  expectInvalid("http_openapi", { tools: [] }, "tools", "size");
  expectInvalid(
    "http_openapi",
    surfaceOf(tHttp({ name: "Find-Vendor" })),
    "tools/0/name",
    "bad_value",
  );
  expectInvalid("http_openapi", { tools: [tHttp(), tHttp()] }, "tools/1/name", "duplicate");
  expectInvalid(
    "http_openapi",
    surfaceOf(tHttp({ input: { type: "nope" } })),
    "tools/0/input",
    "schema_invalid",
  );
});

test("C-fcf2be72: a surface over the size limit is refused and the one below it is accepted", () => {
  function manyCode(count: number): Record<string, unknown> {
    return {
      tools: Array.from({ length: count }, (_, index) =>
        tCode({
          name: `code_${String(index).padStart(2, "0")}`,
          call: codeCall({ source: "a".repeat(65536) }),
        }),
      ),
    };
  }

  expectAccepted("code_block", manyCode(15));
  expectInvalid("code_block", manyCode(16), "surface", "size");
});

test("C-fcf2be72: hints are an object of booleans and only on mcp calls", () => {
  expectInvalid(
    "mcp",
    surfaceOf(tMcp({ call: mcpCall({ hints: { readOnly: "yes" } }) })),
    "tools/0/call/hints",
    "bad_value",
  );
  expectInvalid(
    "mcp",
    surfaceOf(tMcp({ call: mcpCall({ hints: { extra: true } }) })),
    "tools/0/call/hints",
    "unknown_property",
  );
  expectInvalid(
    "mcp",
    surfaceOf(tMcp({ call: mcpCall({ hints: 1 }) })),
    "tools/0/call/hints",
    "not_object",
  );
  expectInvalid(
    "http_openapi",
    surfaceOf(tHttp({ call: httpCall({ hints: { readOnly: true } }) })),
    "tools/0/call/hints",
    "unknown_property",
  );
  expectInvalid(
    "code_block",
    surfaceOf(tCode({ call: codeCall({ hints: { readOnly: true } }) })),
    "tools/0/call/hints",
    "unknown_property",
  );
});

test("C-fcf2be72: a pattern in a schema position is refused but pattern data is accepted", () => {
  expectInvalid(
    "http_openapi",
    surfaceOf(
      tHttp({
        input: {
          type: "object",
          properties: { vendor_name: { type: "string", pattern: "^(a+)+$" } },
          required: ["vendor_name"],
        },
      }),
    ),
    "tools/0/input",
    "pattern",
  );
  expectInvalid(
    "mcp",
    surfaceOf(
      tMcp({
        call: mcpCall({ output: "structured" }),
        output: { type: "object", patternProperties: { "^a": { type: "string" } } },
      }),
    ),
    "tools/0/output",
    "pattern",
  );
  expectInvalid(
    "http_openapi",
    surfaceOf(
      tHttp({
        input: {
          type: "object",
          allOf: [{ properties: { vendor_name: { type: "string", pattern: "x" } } }],
        },
      }),
    ),
    "tools/0/input",
    "pattern",
  );
  expectInvalid(
    "http_openapi",
    surfaceOf(
      tHttp({ input: { type: "array", items: { type: "string", pattern: "x" } } }),
    ),
    "tools/0/input",
    "pattern",
  );

  expectAccepted(
    "http_openapi",
    surfaceOf(
      tHttp({
        input: {
          type: "object",
          properties: {
            vendor_name: {
              type: "object",
              enum: [{ pattern: "x" }],
              default: { pattern: "x" },
            },
          },
          required: ["vendor_name"],
          "x-ui": { pattern: "x" },
        },
      }),
    ),
  );
  expectAccepted(
    "code_block",
    surfaceOf(
      tCode({
        input: {
          type: "object",
          properties: { text: { type: "string", pattern: "^a" } },
          required: ["text"],
        },
      }),
    ),
  );
});

test("C-fcf2be72: the surface itself is an object with a bounded tools array", () => {
  expectInvalid("http_openapi", null, "tools", "not_object");
  expectInvalid("http_openapi", { tools: [], x: 1 }, "surface", "unknown_property");
  expectInvalid("http_openapi", { tools: {} }, "tools", "not_array");
  expectInvalid(
    "http_openapi",
    {
      tools: Array.from({ length: 101 }, (_, index) =>
        tHttp({ name: `tool_${String(index).padStart(3, "0")}` }),
      ),
    },
    "tools",
    "size",
  );
});

test("C-fcf2be72: the five constants carry their fixed values", () => {
  assert.equal(CODE_BLOCK_ORIGIN, "sandbox");
  assert.deepEqual(ADAPTER_CALL_KINDS, {
    http_openapi: "http",
    mcp: "mcp",
    code_block: "code",
  });
  assert.equal(MAX_SURFACE_CHARS, 1048576);
  assert.equal(MAX_CODE_SOURCE_CHARS, 65536);
  assert.deepEqual(MCP_TEXT_OUTPUT_SCHEMA, {
    type: "object",
    properties: { text: { type: "string" } },
    required: ["text"],
    additionalProperties: false,
  });
});
