import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import type { FakeEgress } from "../fake-egress/index.ts";
import { putCredential } from "../fake-egress/vault-client.ts";
import type { FakeTools } from "../fake-tools/index.ts";
import {
  FAKE_TOOLS_HOST,
  FAKE_TOOLS_KEY_HEADER,
  FAKE_TOOLS_ORIGIN,
  fakeToolPath,
} from "../fake-tools/index.ts";

import { PARTS_DIR, discoverParts } from "./discover.ts";
import { egressPart } from "./egress-part.ts";
import { E2eStackError } from "./part.ts";
import type { PartContext, PartHandle } from "./part.ts";
import { toolsApi, toolsPart } from "./tools-part.ts";

const ENGINE_ORIGIN = "http://127.0.0.1:39080";
const CONTROL_ORIGIN = "http://127.0.0.1:39081";
const TENANT_A = "4b8a2c1e-0000-8000-8000-000000000001";
const SERVICE_ID = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01";
const CREDENTIAL = "kv-" + "tools-4d1c";
const LOOKUP_OUTPUT = { vendor_id: "V-ACME", status: "active", payment_terms_days: 30 };

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
  const dir = mkdtempSync(path.join(os.tmpdir(), "e2e-tools-part-"));
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

function thrown(call: () => unknown): unknown {
  try {
    call();
  } catch (error) {
    return error;
  }
  assert.fail("expected the call to throw");
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

function portOf(url: string): number {
  return Number(new URL(url).port);
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
      tenant_id: TENANT_A,
      scope: "call",
      ttl_seconds: 60,
    }),
  });
  assert.equal(answer.status, 200);
  const parsed = (await answer.json()) as { token?: unknown };
  assert.equal(typeof parsed.token, "string");
  return parsed.token as string;
}

async function forwarded(
  egress: FakeEgress,
  serviceId: string,
  ref: string,
  input: unknown,
): Promise<Reply> {
  const token = await issue(egress, serviceId);
  return post(
    egress.proxyUrl,
    `/${serviceId}${fakeToolPath(ref)}`,
    {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "x-ursitoare-call": "r_1:lookup:1",
    },
    JSON.stringify(input),
  );
}

async function provision(egress: FakeEgress, serviceId: string): Promise<number | null> {
  const answer = await putCredential(egress.vaultUrl, egress.vaultAdmin, {
    tenantId: TENANT_A,
    serviceId,
    authScheme: 1,
    value: Buffer.from(CREDENTIAL),
    headerName: FAKE_TOOLS_KEY_HEADER,
    callerActorId: "carol",
    targetUrl: FAKE_TOOLS_ORIGIN,
  });
  assert.equal(answer.grpcStatus, 0, answer.grpcMessage);
  return answer.keyVersion;
}

test("C-f75683d5 P1 the tools part refuses to start without the egress part and opens no listener", async () => {
  assert.equal(toolsPart.name, "tools", "the part is named tools");

  const before = tcpServers();
  let error: unknown;
  try {
    await toolsPart.start(contextFor("tools", tempRoot(), new Map<string, PartHandle>()));
  } catch (caught) {
    error = caught;
  }
  const after = tcpServers();

  assert.ok(error instanceof E2eStackError, `expected an E2eStackError, got ${String(error)}`);
  assert.equal(error.code, "STACK_PART_MISSING");
  assert.deepEqual(error.details, { part: "egress" });
  assert.equal(after, before, "no listener was opened");
});

test("C-f75683d5 P2 the tools part registers its upstream and resets with the stack", async () => {
  const root = tempRoot();
  const handles = new Map<string, PartHandle>();
  let egressHandle: PartHandle | undefined;
  let toolsHandle: PartHandle | undefined;

  try {
    egressHandle = await must(() =>
      egressPart.start(contextFor("egress", path.join(root, "egress"), handles)),
    );
    handles.set("egress", egressHandle);
    const egress = (egressHandle.api as { fake: FakeEgress }).fake;
    assert.equal(await provision(egress, SERVICE_ID), 1, "the credential is stored with keyVersion 1");

    toolsHandle = await must(() =>
      toolsPart.start(contextFor("tools", path.join(root, "tools"), handles)),
    );
    assert.deepEqual(toolsHandle.env, {}, "the tools part exports no environment");
    handles.set("tools", toolsHandle);

    const tools = toolsApi(handles).tools;
    assert.equal((toolsHandle.api as { tools?: FakeTools }).tools, tools, "the handle exposes the fake");

    const first = await forwarded(egress, SERVICE_ID, "erp.lookup_vendor@1", {
      vendor_name: "Acme GmbH",
    });
    assert.equal(first.status, 200);
    assert.deepEqual(JSON.parse(first.body), LOOKUP_OUTPUT);

    const recorded = tools.calls();
    assert.equal(recorded.length, 1, "the proxy call reached the fake once");
    assert.equal(recorded[0]?.seq, 1);
    assert.equal(recorded[0]?.ref, "erp.lookup_vendor@1");
    assert.equal(recorded[0]?.host, FAKE_TOOLS_HOST);
    assert.equal(recorded[0]?.keyHeaderSeen, true);

    await must(
      () =>
        toolsPart.beforeReset?.(contextFor("tools", path.join(root, "tools"), handles)) ??
        Promise.resolve(),
    );
    assert.deepEqual(tools.calls(), [], "beforeReset empties the calls");

    const second = await forwarded(egress, SERVICE_ID, "erp.lookup_vendor@1", {
      vendor_name: "Acme GmbH",
    });
    assert.equal(second.status, 200);
    assert.equal(tools.calls().length, 1, "the same call reaches the fake again");
    assert.equal(tools.calls()[0]?.seq, 1, "the counter restarted at 1");

    const missing = thrown(() => toolsApi(new Map<string, PartHandle>()));
    assert.ok(missing instanceof E2eStackError, `expected an E2eStackError, got ${String(missing)}`);
    assert.equal(missing.code, "STACK_PART_MISSING");
    assert.deepEqual(missing.details, { part: "tools" });

    const origin = tools.origin;
    await must(() => toolsHandle?.close() ?? Promise.resolve());
    await must(() => toolsHandle?.close() ?? Promise.resolve());
    assert.equal(await connectionRefused(portOf(origin)), true, "the origin refuses after close");
  } finally {
    await toolsHandle?.close().catch(() => undefined);
    await egressHandle?.close().catch(() => undefined);
  }
});

test("C-f75683d5 P3 the tools part is discovered after egress with its file", async () => {
  const names = (await discoverParts()).map((part) => part.name);
  assert.ok(names.includes("egress"), "the egress part is discovered");
  assert.ok(names.includes("tools"), "the tools part is discovered");
  assert.ok(
    names.indexOf("egress") < names.indexOf("tools"),
    "the tools part is discovered after the egress part",
  );

  const partFile = path.join(PARTS_DIR, "50-tools.ts");
  assert.ok(existsSync(partFile), "the shipped tools part file exists");
  assert.equal(
    readFileSync(partFile, "utf8").trim(),
    'export { toolsPart as part } from "../tools-part.ts";',
  );
  assert.ok("45-egress.ts" < "50-tools.ts", "the tools part file sorts after the egress part file");
});
