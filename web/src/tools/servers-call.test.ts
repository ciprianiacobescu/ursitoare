/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { cursorPageFetcher } from "../kit/data/page-fetcher.ts";
import { parseToolServer, toolRows } from "./servers.ts";

const IO = { type: "object" };

function server(
  id: string,
  adapter: string,
  origin: string,
  tool: { name: string; effect: string },
  pendingSurface?: unknown,
): Record<string, unknown> {
  return {
    id,
    adapter,
    origin,
    local: false,
    state: "pending",
    registeredBy: "u_carol",
    registeredAt: "2026-11-09T10:00:00.000000Z",
    approvedDigest: null,
    pendingDigest: "sha256:" + "b".repeat(64),
    pendingSubmittedBy: "u_carol",
    tools: [{ name: tool.name, effect: tool.effect, ref: null }],
    approvedSurface: null,
    ...(pendingSurface === undefined ? {} : { pendingSurface }),
  };
}

function mcpTool(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "find_vendor",
    effect: "write",
    input: IO,
    output: IO,
    untrusted_result: true,
    unsafe_to_retry: true,
    call: {
      kind: "mcp",
      endpoint: "/mcp",
      name: "find_vendor",
      protocolVersion: "2026-07-28",
      output: "structured",
      hints: { readOnly: true },
    },
    ...extra,
  };
}

const S_FIX = server("acme", "fixture", "https://tools.fake.test", {
  name: "lookup_vendor",
  effect: "read",
});
const S_MCP = server(
  "crm",
  "mcp",
  "https://mcp.fake.test",
  { name: "find_vendor", effect: "write" },
  { tools: [mcpTool()] },
);
const S_CODE = server(
  "snips",
  "code_block",
  "sandbox",
  { name: "word_count", effect: "read" },
  {
    tools: [
      {
        name: "word_count",
        effect: "read",
        input: IO,
        output: IO,
        untrusted_result: false,
        unsafe_to_retry: false,
        call: { kind: "code", source: "return {};" + " ".repeat(65526) },
      },
    ],
  },
);

test("C-0f038efb parseToolServer reads a tool with a call and no http as http null", () => {
  const mcp = parseToolServer(S_MCP);
  assert.ok(mcp !== null);
  assert.deepEqual(mcp.tools, [
    {
      name: "find_vendor",
      effect: "write",
      ref: null,
      untrusted_result: true,
      unsafe_to_retry: true,
      http: null,
    },
  ]);
  assert.deepEqual(toolRows(mcp).map((r) => r.call), ["—"]);
  const code = parseToolServer(S_CODE);
  assert.ok(code !== null);
  assert.deepEqual(code.tools, [
    {
      name: "word_count",
      effect: "read",
      ref: null,
      untrusted_result: false,
      unsafe_to_retry: false,
      http: null,
    },
  ]);
  assert.deepEqual(toolRows(code).map((r) => r.call), ["—"]);
});

test("C-0f038efb parseToolServer refuses a present http that is not a method and path", () => {
  const bad = server(
    "crm",
    "mcp",
    "https://mcp.fake.test",
    { name: "find_vendor", effect: "write" },
    { tools: [mcpTool({ http: { method: "POST" } })] },
  );
  assert.equal(parseToolServer(bad), null);
});

test("C-0f038efb cursorPageFetcher lists servers of every adapter", async () => {
  const client = {
    get: (): Promise<never> =>
      Promise.resolve({ items: [S_FIX, S_MCP, S_CODE], next_cursor: null } as never),
  };
  const fetchPage = cursorPageFetcher(client, "/tool-servers", { parseItem: parseToolServer });
  const page = await fetchPage({
    cursor: null,
    limit: 50,
    signal: new AbortController().signal,
  });
  assert.deepEqual(
    page.items.map((s) => s.id),
    ["acme", "crm", "snips"],
  );
  assert.equal(page.next_cursor, null);
});
