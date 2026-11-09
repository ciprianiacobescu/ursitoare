import assert from "node:assert/strict";
import net from "node:net";
import { test } from "node:test";

import { startCrashCluster } from "../crash/cluster.ts";
import type { FakeTools } from "../fake-tools/index.ts";

import { discoverParts } from "./discover.ts";
import type { E2eStackPart, PartContext, PartHandle } from "./part.ts";

const LOOKUP_OUTPUT = { vendor_id: "V-X", status: "active", payment_terms_days: 30 };

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

function wrappingTools(part: E2eStackPart, capture: (origin: string) => void): E2eStackPart {
  return {
    ...part,
    start: async (ctx: PartContext): Promise<PartHandle> => {
      const handle = await part.start(ctx);
      const api = handle.api as { tools?: FakeTools } | undefined;
      const origin = api?.tools?.origin;
      if (origin !== undefined) {
        capture(origin);
      }
      return handle;
    },
  };
}

test("C-f75683d5 P4 the tools part runs in a crash cluster and its origin refuses after close", async () => {
  const discovered = await discoverParts();
  const names = discovered.map((part) => part.name);
  assert.ok(names.includes("tools"), "the tools part is discovered");

  let origin: string | undefined;
  const parts = discovered
    .filter(
      (part) => part.name === "database" || part.name === "egress" || part.name === "tools",
    )
    .map((part) => (part.name === "tools" ? wrappingTools(part, (value) => (origin = value)) : part));
  assert.deepEqual(
    parts.map((part) => part.name),
    ["database", "egress", "tools"],
    "the crash cluster runs database, egress and tools in order",
  );

  const started = await startCrashCluster(parts);
  try {
    assert.match(origin ?? "", /^http:\/\/127\.0\.0\.1:[0-9]+$/, "the cluster captured the fake origin");
    const response = await fetch(`${origin}/blocks/erp.lookup_vendor@1`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ vendor_name: "x" }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), LOOKUP_OUTPUT);
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
