import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const README = path.join(import.meta.dirname, "..", "README.md");

const ROW =
  "| `fake-mcp/` | `add-fake-mcp` | An MCP server (2026-07-28 and the older handshake, with or without a session; recorded requests, failure and surface knobs, JSON or SSE answers), reached through the fake proxy as `mcp.fake.test`; e2e part `55-mcp` |";

test("C-24cbda4b the README holds one fake-mcp row owned by add-fake-mcp", () => {
  const lines = readFileSync(README, "utf8").split("\n");
  const rows = lines.filter((line) => line.startsWith("| `fake-mcp/` | `add-fake-mcp` |"));
  assert.equal(rows.length, 1, "exactly one fake-mcp row names add-fake-mcp");
  assert.equal(rows[0], ROW);
  assert.equal(
    lines.some((line) => line.includes("| `fake-mcp/` | `add-mcp-client` |")),
    false,
    "no row still names add-mcp-client",
  );
});
