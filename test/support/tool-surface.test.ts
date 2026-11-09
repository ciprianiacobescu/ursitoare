import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { surfaceDigest } from "../../src/tools/surface.ts";
import type { ToolSurface } from "../../src/tools/types.ts";
import { fixtureSurface } from "./tool-surface.ts";

const README = path.join(import.meta.dirname, "README.md");
const TOOL_SURFACE_ROW =
  "| `tool-surface.ts` | `add-tool-registry` | `fixtureSurface`: a tool surface built from test-catalogue blocks |";

const D_A = "sha256:347725d7d6171586139eba5892b32b2b2ff6b25a556e8cbb2bca57c0624db7d9";
const D_A_DEFAULT = "sha256:31e1d70af027715b9a8215e3a25a82f7bfbb33f21f5481d343c4bd8023e9883a";

const ERP_REFS = ["erp.lookup_vendor@1", "erp.create_payment@1"] as const;
const BOTH_FALSE = {
  "erp.lookup_vendor@1": false,
  "erp.create_payment@1": false,
} as const;

test("C-9e03eeea: fixtureSurface builds the two erp surfaces as D_A and D_A_DEFAULT", () => {
  assert.equal(typeof fixtureSurface, "function");

  assert.doesNotThrow(() => {
    const surface = fixtureSurface(ERP_REFS, { untrustedResult: BOTH_FALSE });
    assert.equal(surfaceDigest(surface), D_A);
  });

  assert.doesNotThrow(() => {
    const surface = fixtureSurface(ERP_REFS);
    assert.equal(surfaceDigest(surface), D_A_DEFAULT);
  });
});

test("C-9e03eeea: fixtureSurface names the four-ref tools and posts to their catalogue paths", () => {
  let surface: ToolSurface | undefined;
  assert.doesNotThrow(() => {
    surface = fixtureSurface([
      "invoices.get@1",
      "mail.read_inbox@1",
      "http.post@1",
      "crm.create_ticket@1",
    ]);
  });
  assert.ok(surface !== undefined, "the fixture surface was built");
  assert.deepEqual(
    surface.tools.map((tool) => ({ name: tool.name, effect: tool.effect, http: tool.http })),
    [
      { name: "get", effect: "read", http: { method: "POST", path: "/blocks/invoices.get@1" } },
      {
        name: "read_inbox",
        effect: "read",
        http: { method: "POST", path: "/blocks/mail.read_inbox@1" },
      },
      { name: "post", effect: "send", http: { method: "POST", path: "/blocks/http.post@1" } },
      {
        name: "create_ticket",
        effect: "write",
        http: { method: "POST", path: "/blocks/crm.create_ticket@1" },
      },
    ],
  );
});

test("C-9e03eeea: fixtureSurface refuses an unknown ref and a duplicate tool name", () => {
  assert.throws(() => fixtureSurface(["nope.x@1"]), {
    name: "Error",
    message: "unknown test block nope.x@1",
  });
  assert.throws(() => fixtureSurface(["invoices.get@1", "http.get@1"]), {
    name: "Error",
    message: "duplicate tool name get",
  });
});

test("C-9e03eeea: the support README names tool-surface.ts exactly once", () => {
  const text = readFileSync(README, "utf8");
  const rows = text.split("\n").filter((line) => line === TOOL_SURFACE_ROW);
  assert.equal(rows.length, 1, "exactly one tool-surface row");
});
