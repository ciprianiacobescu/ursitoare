// Architecture test of the network rule: egress modules, process entry points, worker_threads and loader forms.
import assert from "node:assert/strict";
import { test } from "node:test";

import { checkNetwork } from "./rules.ts";
import { collectImports, snapshotOf } from "./sources.ts";

// Runs a call and returns its answer, or a marker when it throws, so a missing behaviour fails on the comparison.
function answer<T>(call: () => T): T | "THROWN" {
  try {
    return call();
  } catch {
    return "THROWN";
  }
}

const EGRESS_MESSAGE = "is allowed only in observability, identity and gateway; call through src/gateway";

function networkViolation(
  code: "ARCH_NETWORK_IMPORT" | "ARCH_NETWORK_CALL",
  file: string,
  line: number,
  name: string,
): { code: string; file: string; line: number; message: string } {
  return { code, file, line, message: `${name} ${EGRESS_MESSAGE}` };
}

test("C-8e07c9a6: network imports and calls outside egress modules are refused", () => {
  const snapshot = snapshotOf({
    "src/api/a.ts": 'import { request } from "node:https";\n',
    "src/tools/b.ts": 'import net from "net";\n',
    "src/llm/c.ts": "const r = await fetch(url);\n",
    "src/sandbox/d.ts": "new globalThis.WebSocket(u);\n",
    "src/main.ts": 'import u from "undici/lib/x.ts";\n',
    "src/eval/e.ts": 'await import("node:dns/promises");\n',
  });

  assert.deepEqual(answer(() => checkNetwork(snapshot)), [
    networkViolation("ARCH_NETWORK_IMPORT", "src/api/a.ts", 1, "node:https"),
    networkViolation("ARCH_NETWORK_IMPORT", "src/eval/e.ts", 1, "node:dns/promises"),
    networkViolation("ARCH_NETWORK_CALL", "src/llm/c.ts", 1, "fetch"),
    networkViolation("ARCH_NETWORK_IMPORT", "src/main.ts", 1, "undici/lib/x.ts"),
    networkViolation("ARCH_NETWORK_CALL", "src/sandbox/d.ts", 1, "WebSocket"),
    networkViolation("ARCH_NETWORK_IMPORT", "src/tools/b.ts", 1, "net"),
  ]);
});

test("C-bdf0820d: process and worker entry points are refused", () => {
  const snapshot = snapshotOf({
    "src/runs/x.ts": 'import { execFile } from "node:child_process";\n',
    "src/api/y.ts": 'import cluster from "cluster";\n',
    "src/api/w.ts": 'import { Worker } from "node:worker_threads";\n',
    "src/gateway/g.ts": 'import { Worker } from "worker_threads";\n',
    "src/sandbox/pool.ts": 'import { Worker } from "worker_threads";\n',
    "src/gateway/h.ts": 'import { spawn } from "node:child_process";\n',
  });

  assert.deepEqual(answer(() => checkNetwork(snapshot)), [
    {
      code: "ARCH_NETWORK_IMPORT",
      file: "src/api/w.ts",
      line: 1,
      message: "node:worker_threads is allowed only in src/sandbox",
    },
    networkViolation("ARCH_NETWORK_IMPORT", "src/api/y.ts", 1, "cluster"),
    {
      code: "ARCH_NETWORK_IMPORT",
      file: "src/gateway/g.ts",
      line: 1,
      message: "worker_threads is allowed only in src/sandbox",
    },
    networkViolation("ARCH_NETWORK_IMPORT", "src/runs/x.ts", 1, "node:child_process"),
  ]);
});

test("C-a2eef903: egress modules, type-only imports, client methods and test files pass", () => {
  const snapshot = snapshotOf({
    "src/gateway/a.ts": 'import { request } from "node:https";\n',
    "src/identity/b.ts": 'import net from "net";\n',
    "src/observability/c.ts": "const r = await fetch(url);\n",
    "src/gateway/d.ts": "new globalThis.WebSocket(u);\n",
    "src/identity/e.ts": 'import u from "undici/lib/x.ts";\n',
    "src/observability/f.ts": 'await import("node:dns/promises");\n',
    "src/api/a.ts":
      'import type { Server } from "node:http";\nimport { type Server as Other } from "node:http";\nconst x = client.fetch(url);\n',
    "src/api/a.test.ts": "const r = await fetch(url);\n",
  });

  assert.deepEqual(answer(() => checkNetwork(snapshot)), []);
});

test("C-a2eef903: a default import with all-type named specifiers is a value import", () => {
  const text = 'import https, { type Agent } from "node:https";\n';
  const refs = answer(() => collectImports({ path: "src/api/a.ts", text }));
  assert.deepEqual(
    answer(() =>
      refs === "THROWN" ? "THROWN" : refs.map((r) => [r.line, r.specifier, r.typeOnly]),
    ),
    [[1, "node:https", false]],
  );

  assert.deepEqual(answer(() => checkNetwork(snapshotOf({ "src/api/a.ts": text }))), [
    networkViolation("ARCH_NETWORK_IMPORT", "src/api/a.ts", 1, "node:https"),
  ]);
});

test("C-fa65851b: an import-equals declaration is a value import", () => {
  const snapshot = snapshotOf({
    "src/api/e.cts": 'import https = require("node:https");\n',
    "src/api/f.cts": 'import type Server = require("node:http");\n',
  });

  assert.deepEqual(answer(() => checkNetwork(snapshot)), [
    networkViolation("ARCH_NETWORK_IMPORT", "src/api/e.cts", 1, "node:https"),
  ]);
});

test("C-8fa501e4: every scanned extension is covered", () => {
  const extensions = ["ts", "mts", "cts", "tsx", "js", "mjs", "cjs"];
  const files: Record<string, string> = {};
  for (const extension of extensions) {
    files[`src/api/r.${extension}`] = 'const h = require("node:https");\n';
  }

  const expected = [...extensions]
    .sort()
    .map((extension) =>
      networkViolation("ARCH_NETWORK_IMPORT", `src/api/r.${extension}`, 1, "node:https"),
    );
  assert.deepEqual(answer(() => checkNetwork(snapshotOf(files))), expected);
});

test("C-f9b82661: the bootstrap placeholder fails the network rule", () => {
  const snapshot = snapshotOf({
    "src/main.ts":
      'import { createServer } from "node:http";\nconst port = Number(process.env.PORT);\n',
  });

  assert.deepEqual(answer(() => checkNetwork(snapshot)), [
    networkViolation("ARCH_NETWORK_IMPORT", "src/main.ts", 1, "node:http"),
  ]);
});
