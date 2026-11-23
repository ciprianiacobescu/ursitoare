import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkSchema } from "../../interpreter/schema.ts";
import { checkAdapterSurface } from "../adapter-surface.ts";
import { MCP_TEXT_OUTPUT_SCHEMA } from "../calls.ts";
import type { McpCallSpec } from "../calls.ts";
import { ToolsError } from "../types.ts";
import type { SurfaceTool, ToolSurface } from "../types.ts";
import { mcpSurface } from "./surface.ts";
import type { McpExclusion, McpOverlay, McpOverlayEntry } from "./surface.ts";

const AT: { endpoint: string; protocolVersion: McpCallSpec["protocolVersion"] } = {
  endpoint: "/mcp",
  protocolVersion: "2026-07-28",
};

const EMPTY_OVERLAY: McpOverlay = { tools: {} };

interface SurfaceResult {
  surface: ToolSurface;
  excluded: { name: string; reason: McpExclusion }[];
}

function findInput(): Record<string, unknown> {
  return {
    type: "object",
    properties: { vendor_name: { type: "string", minLength: 1 } },
    required: ["vendor_name"],
    additionalProperties: false,
  };
}

function findOutput(): Record<string, unknown> {
  return {
    type: "object",
    properties: { vendor_id: { type: "string" }, status: { type: "string" } },
    required: ["vendor_id", "status"],
    additionalProperties: false,
  };
}

function findVendor(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "find_vendor",
    inputSchema: findInput(),
    outputSchema: findOutput(),
    annotations: { readOnlyHint: true },
    ...over,
  };
}

function logNote(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "log_note",
    inputSchema: {
      type: "object",
      properties: { note: { type: "string" } },
      required: ["note"],
    },
    annotations: { readOnlyHint: false, idempotentHint: true },
    ...over,
  };
}

const HDR_TOOL: Record<string, unknown> = {
  name: "route_ticket",
  description: "Route a ticket",
  inputSchema: {
    type: "object",
    properties: {
      region: { type: "string", "x-mcp-header": "Region" },
      ticket: { type: "string" },
    },
    required: ["region", "ticket"],
  },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
};

function objectTool(name: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  return { name, inputSchema: { type: "object" }, ...over };
}

function raw(
  tools: readonly unknown[],
  overlay: McpOverlay = EMPTY_OVERLAY,
  at = AT,
): SurfaceResult {
  const box: { value?: SurfaceResult } = {};
  assert.doesNotThrow(() => {
    box.value = mcpSurface(tools, at, overlay);
  });
  const value = box.value;
  assert.ok(value !== undefined, "mcpSurface returned a result");
  return value;
}

function surfaceOf(
  tools: readonly unknown[],
  overlay: McpOverlay = EMPTY_OVERLAY,
  at = AT,
): SurfaceResult {
  const result = raw(tools, overlay, at);
  assert.doesNotThrow(() => {
    checkAdapterSurface("mcp", result.surface);
  });
  return result;
}

function refusal(
  tools: readonly unknown[],
  overlay: McpOverlay = EMPTY_OVERLAY,
  at = AT,
): ToolsError {
  const box: { value?: unknown } = {};
  assert.throws(() => {
    try {
      mcpSurface(tools, at, overlay);
    } catch (error) {
      box.value = error;
      throw error;
    }
  });
  const error = box.value;
  assert.ok(error instanceof ToolsError, "expected a ToolsError");
  return error;
}

function toolOf(result: SurfaceResult, name: string): SurfaceTool {
  const found = result.surface.tools.find((tool) => tool.name === name);
  assert.ok(found !== undefined, `missing tool ${name}`);
  return found;
}

function namesOf(surface: ToolSurface): string[] {
  return surface.tools.map((tool) => tool.name);
}

function callOf(tool: SurfaceTool): McpCallSpec {
  const call = tool.call;
  assert.ok(call !== undefined && call.kind === "mcp", "the tool has an mcp call");
  return call;
}

function expectExcluded(
  error: ToolsError,
  reason: string,
  excluded: string,
): void {
  assert.equal(error.code, "TOOLS_REFUSED");
  assert.equal(error.details["reason"], reason);
  assert.equal(error.details["excluded"], excluded);
}

describe("mcpSurface hints and defaults", () => {
  it("C-4b2ad49a M1 a server hint never decides the effect or retry safety", () => {
    const result = surfaceOf([findVendor(), logNote()]);
    assert.deepEqual(result.excluded, []);
    assert.equal(result.surface.tools.length, 2);

    const find = toolOf(result, "find_vendor");
    assert.equal(find.effect, "write");
    assert.equal(find.untrusted_result, true);
    assert.equal(find.unsafe_to_retry, true);
    assert.deepEqual(find.input, findInput());
    assert.deepEqual(find.output, findOutput());
    const findCall = callOf(find);
    assert.equal(findCall.endpoint, "/mcp");
    assert.equal(findCall.name, "find_vendor");
    assert.equal(findCall.protocolVersion, "2026-07-28");
    assert.equal(findCall.output, "structured");
    assert.deepEqual(findCall.hints, { readOnly: true });

    const log = toolOf(result, "log_note");
    assert.equal(log.effect, "write");
    assert.equal(log.untrusted_result, true);
    assert.equal(log.unsafe_to_retry, true);
    assert.deepEqual(log.output, MCP_TEXT_OUTPUT_SCHEMA);
    const logCall = callOf(log);
    assert.equal(logCall.name, "log_note");
    assert.equal(logCall.output, "text");
    assert.deepEqual(logCall.hints, { readOnly: false, idempotent: true });
  });

  it("C-4b2ad49a M2 an overlay effect alone leaves retry safety set", () => {
    const result = surfaceOf([findVendor(), logNote()], {
      tools: { find_vendor: { effect: "read" } },
    });
    const find = toolOf(result, "find_vendor");
    assert.equal(find.effect, "read");
    assert.equal(find.untrusted_result, true);
    assert.equal(find.unsafe_to_retry, true);
    assert.deepEqual(callOf(find).hints, { readOnly: true });

    const log = toolOf(result, "log_note");
    assert.equal(log.effect, "write");
    assert.equal(log.untrusted_result, true);
    assert.equal(log.unsafe_to_retry, true);
  });

  it("C-4b2ad49a M3 an overlay replaces each member alone and keeps the server name in the call", () => {
    const result = surfaceOf([findVendor()], {
      tools: {
        find_vendor: {
          effect: "read",
          unsafe_to_retry: false,
          untrusted_result: false,
          name: "lookup_vendor",
          data_class: "private",
        },
      },
    });
    assert.deepEqual(namesOf(result.surface), ["lookup_vendor"]);
    const tool = toolOf(result, "lookup_vendor");
    assert.equal(tool.effect, "read");
    assert.equal(tool.untrusted_result, false);
    assert.equal(tool.unsafe_to_retry, false);
    assert.equal(tool.data_class, "private");
    const call = callOf(tool);
    assert.equal(call.name, "find_vendor");
    assert.deepEqual(call.hints, { readOnly: true });
  });
});

describe("mcpSurface left-out tools", () => {
  it("C-59806dca M4 and M5 a header tool is left out and a server with no tools is refused", () => {
    const result = surfaceOf([findVendor(), HDR_TOOL]);
    assert.deepEqual(namesOf(result.surface), ["find_vendor"]);
    assert.deepEqual(result.excluded, [
      { name: "route_ticket", reason: "x_mcp_header" },
    ]);

    const error = refusal([HDR_TOOL]);
    expectExcluded(
      error,
      "no_tools",
      '[{"name":"route_ticket","reason":"x_mcp_header"}]',
    );
  });

  it("C-59806dca M6 a listed name is neutralised and cut for the answer", () => {
    const tools: unknown[] = [
      findVendor(),
      { name: "has space", inputSchema: { type: "object" } },
      { name: "--", inputSchema: { type: "object" } },
      { name: 5, inputSchema: { type: "object" } },
      "x",
      { name: "é", inputSchema: { type: "object" } },
      { name: "a\u0000b", inputSchema: { type: "object" } },
      { name: "\ud800", inputSchema: { type: "object" } },
      { name: "x".repeat(300000), inputSchema: { type: "object" } },
    ];
    const result = surfaceOf(tools);
    assert.deepEqual(namesOf(result.surface), ["find_vendor"]);
    assert.deepEqual(result.excluded, [
      { name: "has space", reason: "name_invalid" },
      { name: "--", reason: "name_invalid" },
      { name: "", reason: "name_invalid" },
      { name: "", reason: "name_invalid" },
      { name: "?", reason: "name_invalid" },
      { name: "a?b", reason: "name_invalid" },
      { name: "?", reason: "name_invalid" },
      { name: "x".repeat(128), reason: "name_invalid" },
    ]);
  });

  it("C-59806dca M7 colliding tool names are refused and an overlay name resolves it", () => {
    const tools = [findVendor(), logNote({ name: "Find.Vendor" })];
    const error = refusal(tools);
    assert.equal(error.code, "TOOLS_REFUSED");
    assert.equal(error.details["reason"], "name_collision");
    assert.equal(error.details["names"], "find_vendor,Find.Vendor");

    const result = surfaceOf(tools, {
      tools: { "Find.Vendor": { name: "find_vendor_2" } },
    });
    assert.deepEqual(namesOf(result.surface).sort(), [
      "find_vendor",
      "find_vendor_2",
    ]);
    assert.deepEqual(result.excluded, []);
    assert.equal(callOf(toolOf(result, "find_vendor_2")).name, "Find.Vendor");
  });

  it("C-59806dca M9 a malformed overlay entry is refused by field", () => {
    const cases: { overlay: unknown; field: string; reason: string }[] = [
      {
        overlay: { tools: { find_vendor: { effect: "admin" } } },
        field: "tools/find_vendor/effect",
        reason: "bad_value",
      },
      {
        overlay: { tools: { find_vendor: { name: "Bad Name" } } },
        field: "tools/find_vendor/name",
        reason: "bad_value",
      },
      {
        overlay: { tools: { find_vendor: { hints: {} } } },
        field: "tools/find_vendor",
        reason: "unknown_property",
      },
    ];
    for (const entry of cases) {
      const error = refusal([findVendor()], entry.overlay as McpOverlay);
      assert.equal(error.code, "TOOLS_INVALID");
      assert.equal(error.details["field"], entry.field);
      assert.equal(error.details["reason"], entry.reason);
    }
    assert.deepEqual(namesOf(surfaceOf([findVendor()]).surface), ["find_vendor"]);
  });

  it("C-59806dca M10 and M17 too many tools are refused", () => {
    const hundred = Array.from({ length: 100 }, (_, index) =>
      objectTool(`t${index}`),
    );
    const result = surfaceOf(hundred);
    assert.equal(result.surface.tools.length, 100);
    assert.deepEqual(result.excluded, []);

    for (const count of [101, 1001]) {
      const tools = Array.from({ length: count }, (_, index) =>
        objectTool(`t${index}`),
      );
      const error = refusal(tools);
      assert.equal(error.code, "TOOLS_REFUSED");
      assert.equal(error.details["reason"], "too_many_tools");
    }
  });

  it("C-59806dca M10b an unlisted overlay entry is reported and its shape is checked first", () => {
    const result = surfaceOf([findVendor(), logNote()], {
      tools: {
        find_vendor: { effect: "read" },
        gone_tool: { effect: "read" },
      },
    });
    assert.equal(toolOf(result, "find_vendor").effect, "read");
    assert.equal(toolOf(result, "log_note").effect, "write");
    assert.deepEqual(result.excluded, [
      { name: "gone_tool", reason: "not_listed" },
    ]);

    const error = refusal([HDR_TOOL], { tools: { gone_tool: {} } });
    expectExcluded(
      error,
      "no_tools",
      '[{"name":"route_ticket","reason":"x_mcp_header"},{"name":"gone_tool","reason":"not_listed"}]',
    );

    const bad = refusal(
      [findVendor()],
      { tools: { gone_tool: { effect: "admin" } } } as unknown as McpOverlay,
    );
    assert.equal(bad.code, "TOOLS_INVALID");
    assert.equal(bad.details["field"], "tools/gone_tool/effect");
    assert.equal(bad.details["reason"], "bad_value");
  });

  it("C-59806dca M14 own names such as constructor and proto are valid tools", () => {
    const tools = [
      objectTool("constructor"),
      objectTool("toString"),
      objectTool("__proto__"),
    ];
    const result = surfaceOf(tools);
    assert.deepEqual(namesOf(result.surface).sort(), [
      "constructor",
      "proto",
      "to_string",
    ]);
    assert.ok(result.surface.tools.every((tool) => tool.effect === "write"));
    assert.deepEqual(result.excluded, []);

    const readEntry: McpOverlayEntry = { effect: "read" };
    const overlay: McpOverlay = { tools: { constructor: readEntry } };
    const withOverlay = surfaceOf(tools, overlay);
    assert.equal(toolOf(withOverlay, "constructor").effect, "read");
    assert.equal(toolOf(withOverlay, "to_string").effect, "write");
    assert.equal(toolOf(withOverlay, "proto").effect, "write");
  });

  it("C-59806dca M15 skipped tools are left out and skip must be true", () => {
    const tools = Array.from({ length: 150 }, (_, index) =>
      objectTool(`t${index}`),
    );
    const skipped: Record<string, { skip: true }> = {};
    for (let index = 100; index < 150; index += 1) {
      skipped[`t${index}`] = { skip: true };
    }
    const result = surfaceOf(tools, { tools: skipped });
    assert.equal(result.surface.tools.length, 100);
    assert.deepEqual(
      result.excluded,
      Array.from({ length: 50 }, (_, index) => ({
        name: `t${index + 100}`,
        reason: "skipped",
      })),
    );

    const error = refusal(
      tools,
      { tools: { a: { skip: false } } } as unknown as McpOverlay,
    );
    assert.equal(error.code, "TOOLS_INVALID");
    assert.equal(error.details["field"], "tools/a/skip");
    assert.equal(error.details["reason"], "bad_value");
  });

  it("C-59806dca M16 a bad description is dropped and reported while the tool stays", () => {
    const long = surfaceOf([logNote({ description: "d".repeat(2001) })]);
    assert.equal(long.surface.tools.length, 1);
    assert.equal(toolOf(long, "log_note").description, undefined);
    assert.deepEqual(long.excluded, [
      { name: "log_note", reason: "description" },
    ]);

    const malformed = surfaceOf([logNote({ description: "\ud800" })]);
    assert.equal(toolOf(malformed, "log_note").description, undefined);
    assert.deepEqual(malformed.excluded, [
      { name: "log_note", reason: "description" },
    ]);

    const ok = surfaceOf([findVendor({ description: "ok text" })]);
    assert.equal(toolOf(ok, "find_vendor").description, "ok text");
    assert.deepEqual(ok.excluded, []);

    const none = surfaceOf([findVendor({ description: null })]);
    assert.equal(toolOf(none, "find_vendor").description, undefined);
    assert.deepEqual(none.excluded, []);
  });
});

describe("mcpSurface schemas", () => {
  it("C-8557e582 M8 input schemas must be objects and output schemas must be object schemas", () => {
    const tools: unknown[] = [
      findVendor(),
      objectTool("a", { inputSchema: { type: "string" } }),
      { name: "b" },
      objectTool("c", {
        inputSchema: {
          $schema: "http://json-schema.org/draft-04/schema#",
          type: "object",
        },
      }),
      objectTool("d1", { outputSchema: { type: "string" } }),
      objectTool("d2", { outputSchema: {} }),
      objectTool("d3", { outputSchema: null }),
    ];
    const result = surfaceOf(tools);
    assert.deepEqual(namesOf(result.surface), ["find_vendor"]);
    assert.deepEqual(result.excluded, [
      { name: "a", reason: "schema_invalid" },
      { name: "b", reason: "schema_invalid" },
      { name: "c", reason: "schema_invalid" },
      { name: "d1", reason: "output_not_object" },
      { name: "d2", reason: "output_not_object" },
      { name: "d3", reason: "output_not_object" },
    ]);
  });

  it("C-8557e582 M11 the draft-07 and 2020-12 declarations are dropped to one surface", () => {
    const draft7 = "http://json-schema.org/draft-07/schema";
    const modern = "https://json-schema.org/draft/2020-12/schema";
    const variants = [
      findVendor({
        inputSchema: { ...findInput(), $schema: `${draft7}#` },
        outputSchema: { ...findOutput(), $schema: `${draft7}#` },
      }),
      findVendor({
        inputSchema: { ...findInput(), $schema: draft7 },
        outputSchema: { ...findOutput(), $schema: draft7 },
      }),
      findVendor({
        inputSchema: { ...findInput(), $schema: `${modern}#` },
        outputSchema: { ...findOutput(), $schema: modern },
      }),
      findVendor(),
    ];
    const baseline = JSON.stringify(surfaceOf([findVendor()]).surface);
    for (const tool of variants) {
      const result = surfaceOf([tool]);
      assert.equal(JSON.stringify(result.surface), baseline);
      const find = toolOf(result, "find_vendor");
      assert.equal(Object.hasOwn(find.input, "$schema"), false);
      assert.equal(Object.hasOwn(find.output, "$schema"), false);
      assert.deepEqual(find.input, findInput());
      assert.deepEqual(find.output, findOutput());
    }
  });

  it("C-8557e582 M12 tuple items, another schema declaration and a non-string one are invalid", () => {
    const cases: unknown[] = [
      findVendor({
        inputSchema: {
          $schema: "http://json-schema.org/draft-07/schema#",
          type: "object",
          properties: { t: { type: "array", items: [{ type: "string" }] } },
        },
      }),
      findVendor({
        outputSchema: {
          ...findOutput(),
          $schema: "https://json-schema.org/draft/2019-09/schema",
        },
      }),
      findVendor({ inputSchema: { ...findInput(), $schema: 7 } }),
    ];
    for (const tool of cases) {
      const error = refusal([tool]);
      expectExcluded(
        error,
        "no_tools",
        '[{"name":"find_vendor","reason":"schema_invalid"}]',
      );
    }
  });

  it("C-8557e582 M13 pattern id and anchor are dropped so the output compiles twice", () => {
    const tool = findVendor({
      inputSchema: {
        ...findInput(),
        properties: {
          vendor_name: { type: "string", minLength: 1, pattern: "^(a+)+$" },
        },
      },
      outputSchema: {
        ...findOutput(),
        $id: "https://mcp.fake.test/schemas/find_vendor",
        properties: {
          vendor_id: { type: "string", $anchor: "vendor" },
          status: { type: "string" },
        },
      },
    });
    const result = surfaceOf([tool]);
    const find = toolOf(result, "find_vendor");
    assert.deepEqual(find.input, findInput());
    assert.equal(Object.hasOwn(find.output, "$id"), false);
    assert.deepEqual(find.output, findOutput());
    assert.equal(checkSchema(find.output, {}).ok, true);
    assert.equal(checkSchema(find.output, {}).ok, true);
  });

  it("C-8557e582 M13 patternProperties refs dynamic refs and url_host are invalid", () => {
    const cases: unknown[] = [
      findVendor({
        inputSchema: {
          ...findInput(),
          patternProperties: { "^x": { type: "string" } },
        },
      }),
      findVendor({ inputSchema: { ...findInput(), $ref: "#/$defs/missing" } }),
      findVendor({
        inputSchema: { ...findInput(), $ref: "https://evil.example/s.json" },
      }),
      findVendor({ inputSchema: { ...findInput(), $ref: "#" } }),
      findVendor({ inputSchema: { ...findInput(), $dynamicRef: "#x" } }),
      findVendor({ inputSchema: { ...findInput(), $recursiveRef: "#" } }),
      findVendor({
        inputSchema: {
          ...findInput(),
          properties: {
            vendor_name: { type: "string" },
            url_host: { type: "string" },
          },
        },
      }),
    ];
    for (const tool of cases) {
      const error = refusal([tool]);
      expectExcluded(
        error,
        "no_tools",
        '[{"name":"find_vendor","reason":"schema_invalid"}]',
      );
    }
  });

  it("C-8557e582 M13 a resolvable ref a pattern named property and enum data stay", () => {
    const withRef = findVendor({
      inputSchema: {
        ...findInput(),
        $defs: { s: { type: "string" } },
        properties: { vendor_name: { $ref: "#/$defs/s" } },
      },
    });
    const refInput = toolOf(surfaceOf([withRef]), "find_vendor").input as Record<
      string,
      unknown
    >;
    assert.deepEqual(
      (refInput["properties"] as Record<string, unknown>)["vendor_name"],
      { $ref: "#/$defs/s" },
    );
    assert.deepEqual(refInput["$defs"], { s: { type: "string" } });

    const withPatternProperty = findVendor({
      inputSchema: {
        ...findInput(),
        properties: {
          vendor_name: { type: "string" },
          pattern: { type: "string" },
        },
      },
    });
    const patternInput = toolOf(
      surfaceOf([withPatternProperty]),
      "find_vendor",
    ).input as Record<string, unknown>;
    assert.deepEqual(
      (patternInput["properties"] as Record<string, unknown>)["pattern"],
      { type: "string" },
    );

    const withEnumData = findVendor({
      inputSchema: {
        ...findInput(),
        properties: {
          vendor_name: { type: "string" },
          choice: { enum: [{ pattern: "keep" }] },
        },
      },
    });
    const enumInput = toolOf(
      surfaceOf([withEnumData]),
      "find_vendor",
    ).input as Record<string, unknown>;
    assert.deepEqual(
      (enumInput["properties"] as Record<string, unknown>)["choice"],
      { enum: [{ pattern: "keep" }] },
    );

    const withNested = findVendor({
      inputSchema: {
        ...findInput(),
        properties: {
          vendor_name: { type: "string" },
          nested: {
            type: "object",
            properties: { url_host: { type: "string" } },
          },
        },
      },
    });
    const nestedInput = toolOf(
      surfaceOf([withNested]),
      "find_vendor",
    ).input as Record<string, unknown>;
    const nested = (nestedInput["properties"] as Record<string, unknown>)[
      "nested"
    ] as Record<string, unknown>;
    assert.deepEqual(
      (nested["properties"] as Record<string, unknown>)["url_host"],
      { type: "string" },
    );
  });
});
