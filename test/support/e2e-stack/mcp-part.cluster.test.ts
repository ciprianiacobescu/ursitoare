import assert from "node:assert/strict";
import net from "node:net";
import { test } from "node:test";

import { startCrashCluster } from "../crash/cluster.ts";
import type { FakeMcp } from "../fake-mcp/index.ts";

import { discoverParts } from "./discover.ts";
import type { E2eStackPart, PartContext, PartHandle } from "./part.ts";

function connectionRefused(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = net.connect(port, "127.0.0.1");
    socket.once("connect", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", (error: NodeJS.ErrnoException) => {
      socket.destroy();
      resolve(error.code === "ECONNREFUSED");
    });
  });
}

function wrappingMcp(part: E2eStackPart, capture: (origin: string) => void): E2eStackPart {
  return {
    ...part,
    start: async (ctx: PartContext): Promise<PartHandle> => {
      const handle = await part.start(ctx);
      const api = handle.api as { mcp?: FakeMcp } | undefined;
      const origin = api?.mcp?.origin;
      if (origin !== undefined) {
        capture(origin);
      }
      return handle;
    },
  };
}

test("C-24cbda4b P5 the mcp part runs in a crash cluster and its origin refuses after close", async () => {
  const discovered = await discoverParts();
  let origin: string | undefined;
  const parts = discovered
    .filter((part) => part.name === "database" || part.name === "egress" || part.name === "mcp")
    .map((part) => (part.name === "mcp" ? wrappingMcp(part, (value) => (origin = value)) : part));
  assert.deepEqual(
    parts.map((part) => part.name),
    ["database", "egress", "mcp"],
    "the crash cluster runs database, egress and mcp in order",
  );

  const started = await startCrashCluster(parts);
  try {
    assert.match(origin ?? "", /^http:\/\/127\.0\.0\.1:[0-9]+$/, "the cluster captured the fake origin");
    const url = new URL(origin ?? "");
    const meta = "io.modelcontextprotocol/protocolVersion";
    const response = await fetch(`${origin}/mcp`, {
      method: "POST",
      headers: {
        host: url.host,
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        authorization: "Bearer k-mcp-7f3a",
        "mcp-protocol-version": "2026-07-28",
        "mcp-method": "server/discover",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "server/discover",
        params: { _meta: { [meta]: "2026-07-28" } },
      }),
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as { result?: { supportedVersions?: unknown } };
    assert.deepEqual(body.result?.supportedVersions, ["2026-07-28", "2025-11-25"]);
  } finally {
    await started.close();
  }

  assert.ok(origin !== undefined, "the cluster captured the fake origin");
  assert.equal(
    await connectionRefused(Number(new URL(origin).port)),
    true,
    "the fake origin refuses connections after close",
  );
});
