import assert from "node:assert/strict";
import { test } from "node:test";

import { surfaceDigest } from "./surface.ts";
import type { SurfaceTool, ToolSurface } from "./types.ts";

const D_HTTP = "sha256:0a3a2a70a4d1058c9bc26e72c4cd9452402d52c008a0a0fefe393fe698b45b2a";
const D_GET = "sha256:d35c5b23de3bcae18f23e25a77c5c1685add5c8e019bb8da93b9d5e9fa9fa156";
const D_MCP = "sha256:7e461eb01a248c26d9d458a27e4018dc579071f5f9c70c3e4401b2b4e021e526";
const D_CODE = "sha256:ca47766a9e363b72b7a9bdd8c301d900593cd1a63b310c0cb6eeb9a37a1c0513";
const D_FIX = "sha256:ddb45e2247602bfe59863275a523a86a4e98e1ffaec288a1216949391b5e492a";
const D_HINTS_TRUE =
  "sha256:b22045aa41bb8dc09c3dd402f83ffa20610a9f640c33cf6ad35d440fcb082d9c";
const D_HINTS_FALSE =
  "sha256:c97dd1c57a2fb394718cf51316d263847ba03f0507c8427972feca37bd1dac68";
const SMALL_DIGEST = "sha256:244a8eeaac0eaa92b0f9f37583383b828cfd1f4aaa3028ab7052e0d013ef2c0c";

function inputV(): SurfaceTool["input"] {
  return {
    type: "object",
    properties: { vendor_name: { type: "string" } },
    required: ["vendor_name"],
  };
}

function outputV(): SurfaceTool["output"] {
  return {
    type: "object",
    properties: { vendor_id: { type: "string" } },
    required: ["vendor_id"],
  };
}

function mcpText(): SurfaceTool["output"] {
  return {
    type: "object",
    properties: { text: { type: "string" } },
    required: ["text"],
    additionalProperties: false,
  };
}

function httpTool(over: Partial<SurfaceTool> = {}): SurfaceTool {
  return {
    name: "find_vendor",
    description: "Find a vendor by name.",
    effect: "read",
    input: inputV(),
    output: outputV(),
    untrusted_result: false,
    call: {
      kind: "http",
      method: "POST",
      path: "/vendors/find",
      params: [],
      body: true,
    },
    ...over,
  };
}

function getTool(over: Partial<SurfaceTool> = {}): SurfaceTool {
  return {
    name: "get_vendor",
    effect: "read",
    input: {
      type: "object",
      properties: {
        vendor_id: { type: "string" },
        expand: { type: "boolean" },
      },
      required: ["vendor_id"],
    },
    output: outputV(),
    untrusted_result: false,
    call: {
      kind: "http",
      method: "GET",
      path: "/vendors/{vendor_id}",
      params: [
        { name: "vendor_id", in: "path" },
        { name: "expand", in: "query" },
      ],
      body: false,
    },
    ...over,
  };
}

function mcpTool(over: Partial<SurfaceTool> = {}): SurfaceTool {
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
    call: {
      kind: "mcp",
      endpoint: "/mcp",
      name: "search.notes",
      protocolVersion: "2026-07-28",
      output: "text",
    },
    ...over,
  };
}

function codeTool(over: Partial<SurfaceTool> = {}): SurfaceTool {
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
    call: { kind: "code", source: "return { words: 3 };" },
    ...over,
  };
}

function fixTool(): SurfaceTool {
  return {
    name: "find_vendor",
    description: "Find a vendor by name.",
    effect: "read",
    input: inputV(),
    output: outputV(),
    untrusted_result: false,
    http: { method: "POST", path: "/vendors/find" },
  };
}

function digestOf(tool: SurfaceTool): string {
  return surfaceDigest({ tools: [tool] });
}

function smallSurface(): ToolSurface {
  const ping: SurfaceTool = {
    name: "ping",
    effect: "read",
    input: { type: "object" },
    output: { type: "object" },
    http: { method: "GET", path: "/ping" },
  };
  const echo: SurfaceTool = {
    name: "echo",
    description: "Echo.",
    effect: "read",
    input: { type: "object", properties: { q: { type: "string" } } },
    output: {
      type: "object",
      properties: { a: { type: "string" }, b: { type: "string" } },
    },
    untrusted_fields: ["b", "a"],
    data_class: "public",
    http: { method: "POST", path: "/echo" },
  };
  return { tools: [ping, echo] };
}

test("C-1a56fd0a: each call vector hashes to its expected digest and SMALL is kept", () => {
  assert.equal(digestOf(httpTool()), D_HTTP);

  const reorderedCall: SurfaceTool = httpTool({
    call: {
      body: true,
      params: [],
      path: "/vendors/find",
      method: "POST",
      kind: "http",
    },
  });
  assert.equal(digestOf(reorderedCall), D_HTTP);

  assert.equal(digestOf(getTool()), D_GET);
  assert.equal(digestOf(mcpTool()), D_MCP);
  assert.equal(digestOf(codeTool()), D_CODE);
  assert.equal(digestOf(fixTool()), D_FIX);

  const hintsTrue = mcpTool({
    call: {
      kind: "mcp",
      endpoint: "/mcp",
      name: "search.notes",
      protocolVersion: "2026-07-28",
      output: "text",
      hints: { readOnly: true },
    },
  });
  const hintsFalse = mcpTool({
    call: {
      kind: "mcp",
      endpoint: "/mcp",
      name: "search.notes",
      protocolVersion: "2026-07-28",
      output: "text",
      hints: { readOnly: false },
    },
  });
  assert.equal(digestOf(hintsTrue), D_HINTS_TRUE);
  assert.equal(digestOf(hintsFalse), D_HINTS_FALSE);
  assert.notEqual(digestOf(hintsTrue), digestOf(hintsFalse));
  assert.notEqual(digestOf(hintsTrue), D_MCP);
  assert.notEqual(digestOf(hintsFalse), D_MCP);

  assert.equal(surfaceDigest(smallSurface()), SMALL_DIGEST);
});

test("C-1a56fd0a: each call member changes the digest and the twelve are pairwise distinct", () => {
  const putMethod = httpTool({
    call: {
      kind: "http",
      method: "PUT",
      path: "/vendors/find",
      params: [],
      body: true,
    },
  });
  const swappedParams = getTool({
    call: {
      kind: "http",
      method: "GET",
      path: "/vendors/{vendor_id}",
      params: [
        { name: "expand", in: "query" },
        { name: "vendor_id", in: "path" },
      ],
      body: false,
    },
  });
  const rpcEndpoint = mcpTool({
    call: {
      kind: "mcp",
      endpoint: "/rpc",
      name: "search.notes",
      protocolVersion: "2026-07-28",
      output: "text",
    },
  });
  const structuredOutput = mcpTool({
    call: {
      kind: "mcp",
      endpoint: "/mcp",
      name: "search.notes",
      protocolVersion: "2026-07-28",
      output: "structured",
    },
  });
  const otherSource = codeTool({
    call: { kind: "code", source: "return { words: 4 };" },
  });
  const hintsTrue = mcpTool({
    call: {
      kind: "mcp",
      endpoint: "/mcp",
      name: "search.notes",
      protocolVersion: "2026-07-28",
      output: "text",
      hints: { readOnly: true },
    },
  });
  const hintsFalse = mcpTool({
    call: {
      kind: "mcp",
      endpoint: "/mcp",
      name: "search.notes",
      protocolVersion: "2026-07-28",
      output: "text",
      hints: { readOnly: false },
    },
  });

  const rows: readonly { readonly label: string; readonly tool: SurfaceTool }[] = [
    { label: "D1", tool: httpTool() },
    { label: "D2", tool: putMethod },
    { label: "D3", tool: getTool() },
    { label: "D4", tool: swappedParams },
    { label: "D5", tool: mcpTool() },
    { label: "D6", tool: rpcEndpoint },
    { label: "D7", tool: structuredOutput },
    { label: "D8", tool: codeTool() },
    { label: "D9", tool: otherSource },
    { label: "D10", tool: fixTool() },
    { label: "D11", tool: hintsTrue },
    { label: "D12", tool: hintsFalse },
  ];

  assert.equal(rows.length, 12);

  const digests = new Map<string, string>();
  for (const row of rows) {
    const digest = digestOf(row.tool);
    assert.equal(digests.has(digest), false, `${row.label} repeats ${digests.get(digest) ?? ""}`);
    digests.set(digest, row.label);
  }

  assert.equal(digests.size, 12);
  assert.notEqual(digestOf(putMethod), digestOf(httpTool()));
  assert.notEqual(digestOf(swappedParams), digestOf(getTool()));
  assert.notEqual(digestOf(rpcEndpoint), digestOf(mcpTool()));
  assert.notEqual(digestOf(structuredOutput), digestOf(mcpTool()));
  assert.notEqual(digestOf(otherSource), digestOf(codeTool()));
  assert.notEqual(digestOf(hintsTrue), digestOf(hintsFalse));
});
