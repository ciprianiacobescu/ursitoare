import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import type { FakeEgress } from "../fake-egress/index.ts";
import { putCredential } from "../fake-egress/vault-client.ts";
import type { FakeMcp } from "../fake-mcp/index.ts";
import { FAKE_MCP_ORIGIN } from "../fake-mcp/index.ts";

import { PARTS_DIR, discoverParts } from "./discover.ts";
import { egressApi, egressPart } from "./egress-part.ts";
import { mcpApi, mcpPart } from "./mcp-part.ts";
import { E2eStackError } from "./part.ts";
import type { PartContext, PartHandle } from "./part.ts";

const ENGINE_ORIGIN = "http://127.0.0.1:39080";
const CONTROL_ORIGIN = "http://127.0.0.1:39081";
const TENANT = "4b8a2c1e-0000-8000-8000-000000000001";
const S1 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01";
const S2 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e02";
const CREDENTIAL = "k-mcp-" + "7f3a";
const META = "io.modelcontextprotocol/protocolVersion";

const tempRoots: string[] = [];

after(() => {
  for (const dir of tempRoots) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // The parts may already have removed their own directories.
    }
  }
});

function tempRoot(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "e2e-mcp-part-"));
  tempRoots.push(dir);
  return dir;
}

function tcpServers(): number {
  return process.getActiveResourcesInfo().filter((resource) => resource === "TCPServerWrap")
    .length;
}

async function must<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    assert.fail(`expected the call to resolve: ${String(error)}`);
  }
}

function contextFor(
  name: string,
  dataDir: string,
  handles: ReadonlyMap<string, PartHandle>,
): PartContext {
  return {
    name,
    dataDir,
    engineOrigin: ENGINE_ORIGIN,
    controlOrigin: CONTROL_ORIGIN,
    env: {},
    handles: new Map(handles),
  };
}

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

interface Reply {
  status: number;
  body: string;
}

function post(
  base: string,
  requestPath: string,
  headers: http.OutgoingHttpHeaders,
  body: string,
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const url = new URL(base);
    const req = http.request(
      { host: url.hostname, port: url.port, method: "POST", path: requestPath, headers, agent: false },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") });
        });
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}

async function issue(egress: FakeEgress, serviceId: string): Promise<string> {
  const answer = await fetch(`${egress.brokerUrl}/v1/issue`, {
    method: "POST",
    headers: {
      "x-mintkey-service-token": egress.brokerServiceToken,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      agent_id: "alice",
      service_id: serviceId,
      tenant_id: TENANT,
      scope: "call",
      ttl_seconds: 60,
    }),
  });
  assert.equal(answer.status, 200);
  const parsed = (await answer.json()) as { token?: unknown };
  assert.equal(typeof parsed.token, "string");
  return parsed.token as string;
}

function message(method: string, params: Record<string, unknown>): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method,
    params: { ...params, _meta: { [META]: "2026-07-28" } },
  });
}

async function call(
  egress: FakeEgress,
  serviceId: string,
  method: string,
  params: Record<string, unknown>,
  extra: Record<string, string> = {},
): Promise<Reply & { token: string }> {
  const token = await issue(egress, serviceId);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    "mcp-protocol-version": "2026-07-28",
    "mcp-method": method,
    authorization: `Bearer ${token}`,
    ...extra,
  };
  const reply = await post(egress.proxyUrl, `/${serviceId}/mcp`, headers, message(method, params));
  return { ...reply, token };
}

async function withStack(
  run: (egress: FakeEgress, handle: PartHandle, mcp: FakeMcp, ctx: PartContext) => Promise<void>,
): Promise<void> {
  const root = tempRoot();
  const handles = new Map<string, PartHandle>();
  let egressHandle: PartHandle | undefined;
  let mcpHandle: PartHandle | undefined;
  try {
    egressHandle = await must(() =>
      egressPart.start(contextFor("egress", path.join(root, "egress"), handles)),
    );
    handles.set("egress", egressHandle);
    const egress = egressApi(handles).fake;
    const stored = await putCredential(egress.vaultUrl, egress.vaultAdmin, {
      tenantId: TENANT,
      serviceId: S1,
      authScheme: 3,
      value: Buffer.from(CREDENTIAL),
      headerName: "",
      callerActorId: "carol",
      targetUrl: FAKE_MCP_ORIGIN,
    });
    assert.equal(stored.grpcStatus, 0, stored.grpcMessage);
    assert.equal(stored.keyVersion, 1);

    const ctx = contextFor("mcp", path.join(root, "mcp"), handles);
    mcpHandle = await must(() => mcpPart.start(ctx));
    handles.set("mcp", mcpHandle);
    const mcp = mcpApi(handles).mcp;
    await run(egress, mcpHandle, mcp, contextFor("mcp", path.join(root, "mcp"), handles));
  } finally {
    await mcpHandle?.close().catch(() => undefined);
    await egressHandle?.close().catch(() => undefined);
  }
}

test("C-24cbda4b P1 the mcp part refuses to start without the egress part and opens no listener", async () => {
  assert.equal(mcpPart.name, "mcp", "the part is named mcp");

  const before = tcpServers();
  let error: unknown;
  try {
    await mcpPart.start(contextFor("mcp", tempRoot(), new Map<string, PartHandle>()));
  } catch (caught) {
    error = caught;
  }
  const after = tcpServers();

  assert.ok(error instanceof E2eStackError, `expected an E2eStackError, got ${String(error)}`);
  assert.equal(error.code, "STACK_PART_MISSING");
  assert.deepEqual(error.details, { part: "egress" });
  assert.equal(after, before, "no listener was opened");
});

test("C-24cbda4b P2 a credentialed service reaches the fake and one without is refused", async () => {
  await withStack(async (egress, handle, mcp) => {
    assert.deepEqual(handle.env, {}, "the part exports no environment");

    const discover = await call(egress, S1, "server/discover", {});
    assert.equal(discover.status, 200, discover.body);
    const parsed = JSON.parse(discover.body) as { result?: Record<string, unknown> };
    assert.deepEqual(parsed.result?.["supportedVersions"], ["2026-07-28", "2025-11-25"]);

    const find = await call(
      egress,
      S1,
      "tools/call",
      { name: "find_vendor", arguments: { vendor_name: "Acme GmbH" } },
      { "mcp-name": "find_vendor", "x-ursitoare-call": "r_1:find:1" },
    );
    assert.equal(find.status, 200, find.body);
    const found = JSON.parse(find.body) as { result?: { structuredContent?: unknown } };
    assert.deepEqual(found.result?.structuredContent, { vendor_id: "V-ACME", status: "active" });

    const refused = await call(egress, S2, "server/discover", {});
    assert.equal(refused.status, 502);
    assert.equal(refused.body, "bad gateway: vault error\n");

    const records = mcp.requests();
    assert.equal(records.length, 2);
    assert.deepEqual(
      records.map((record) => [record.seq, record.method]),
      [
        [1, "server/discover"],
        [2, "tools/call"],
      ],
    );
    assert.equal(records[1]?.callHeader, "r_1:find:1");
    assert.equal(records[1]?.toolName, "find_vendor");
    for (const record of records) {
      assert.equal(record.host, "mcp.fake.test");
      assert.equal(record.status, 200);
      assert.equal(record.headers["authorization"], "[credential]");
    }

    assert.deepEqual(
      egress.requests().map((request) => request.outcome),
      ["allowed", "allowed", "rejected"],
    );
    const text = JSON.stringify(records);
    for (const secret of [discover.token, find.token, CREDENTIAL, "Bearer"]) {
      assert.equal(text.includes(secret), false, "no secret is in the fake's records");
    }
  });
});

test("C-24cbda4b P3 a reset empties the fake and keeps its route and the part closes twice", async () => {
  let origin = "";
  await withStack(async (egress, handle, mcp, ctx) => {
    origin = mcp.origin;
    mcp.setTools([]);
    await call(egress, S1, "server/discover", {});
    assert.equal(mcp.requests().length, 1);

    await must(async () => {
      await mcpPart.beforeReset?.(ctx);
    });
    assert.equal(typeof mcpPart.beforeReset, "function", "the part resets its fake");
    assert.deepEqual(mcp.requests(), []);

    const again = await call(egress, S1, "server/discover", {});
    assert.equal(again.status, 200, again.body);
    assert.equal(mcp.requests()[0]?.seq, 1, "the upstream survived and seq restarted");

    const listed = await call(egress, S1, "tools/list", {});
    assert.equal(listed.status, 200, listed.body);
    const tools = (JSON.parse(listed.body) as { result?: { tools?: { name: string }[] } }).result
      ?.tools;
    assert.deepEqual(
      tools?.map((tool) => tool.name),
      ["find_vendor", "log_note"],
    );

    await handle.close();
    await handle.close();
  });

  assert.equal(await connectionRefused(Number(new URL(origin).port)), true);

  let error: unknown;
  try {
    mcpApi(new Map<string, PartHandle>());
  } catch (caught) {
    error = caught;
  }
  assert.ok(error instanceof E2eStackError, `expected an E2eStackError, got ${String(error)}`);
  assert.equal(error.code, "STACK_PART_MISSING");
  assert.deepEqual(error.details, { part: "mcp" });
});

test("C-24cbda4b P4 the part file exports the part and is discovered after egress and tool-servers", async () => {
  const partFile = path.join(PARTS_DIR, "55-mcp.ts");
  assert.ok(existsSync(partFile), "the shipped mcp part file exists");
  assert.equal(
    readFileSync(partFile, "utf8").trim(),
    'export { mcpPart as part } from "../mcp-part.ts";',
  );
  assert.ok("52-tool-servers.ts" < "55-mcp.ts");

  const names = (await discoverParts()).map((part) => part.name);
  assert.ok(names.includes("mcp"), "the mcp part is discovered");
  assert.ok(names.indexOf("egress") < names.indexOf("mcp"));
  assert.ok(names.indexOf("tool-servers") < names.indexOf("mcp"));
});
