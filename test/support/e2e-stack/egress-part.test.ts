import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import type { EgressConfig } from "../../../src/config/index.ts";
import { loadEgressConfig } from "../../../src/config/index.ts";
import { systemClock } from "../../../src/core/index.ts";
import { checkEgress } from "../../../src/gateway/index.ts";

import { withDedicatedCluster } from "../crash/cluster.ts";
import type { FakeEgress } from "../fake-egress/index.ts";
import { captureLogger } from "../gateway-kit.ts";
import { PARTS_DIR, discoverParts } from "./discover.ts";
import { egressApi, egressPart } from "./egress-part.ts";
import { E2eStackError } from "./part.ts";
import type { PartContext, PartHandle } from "./part.ts";

const ENGINE_ORIGIN = "http://127.0.0.1:39080";
const CONTROL_ORIGIN = "http://127.0.0.1:39081";
const SERVICE_ID = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01";
const TENANT_ID = "d7f4eeba-9f57-8892-b4bb-591d220496d4";
const LOOPBACK_URL = /^http:\/\/127\.0\.0\.1:[0-9]+$/;
const EGRESS_KEYS = [
  "URSITOARE_EGRESS_BROKER_TOKEN_FILE",
  "URSITOARE_EGRESS_BROKER_URL",
  "URSITOARE_EGRESS_PROXY_URL",
  "URSITOARE_EGRESS_VAULT_IDENTITY",
  "URSITOARE_EGRESS_VAULT_TOKEN_FILE",
  "URSITOARE_EGRESS_VAULT_URL",
];

const tempRoots: string[] = [];

after(() => {
  for (const dir of tempRoots) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // The part or the cluster may already have removed its own directories.
    }
  }
});

function tempRoot(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "e2e-egress-part-"));
  tempRoots.push(dir);
  return dir;
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

function envValue(handle: PartHandle, key: string): string {
  const value = handle.env[key];
  assert.ok(value !== undefined, `the env names ${key}`);
  return value;
}

function contextFor(dataDir: string, handles: ReadonlyMap<string, PartHandle>): PartContext {
  return {
    name: "egress",
    dataDir,
    engineOrigin: ENGINE_ORIGIN,
    controlOrigin: CONTROL_ORIGIN,
    env: {},
    handles,
  };
}

function reader(file: string): string {
  return readFileSync(file, "utf8");
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

async function issue(fake: FakeEgress): Promise<number> {
  const response = await fetch(`${fake.brokerUrl}/v1/issue`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-mintkey-service-token": fake.brokerServiceToken,
    },
    body: JSON.stringify({
      agent_id: "ursitoare-engine",
      service_id: SERVICE_ID,
      tenant_id: TENANT_ID,
      scope: "call",
      ttl_seconds: 60,
    }),
  });
  await response.arrayBuffer();
  return response.status;
}

test("C-e09b6c9e the egress part starts with its six variables and closes completely", async () => {
  const root = tempRoot();
  const dataDir = path.join(root, "egress");
  mkdirSync(dataDir, { recursive: true });

  let started: PartHandle | undefined;
  try {
    const handles = new Map<string, PartHandle>();
    const context = contextFor(dataDir, handles);
    const handle = await must(() => egressPart.start(context));
    started = handle;

    assert.equal(egressPart.name, "egress", "the part is named egress");
    assert.equal(egressPart.seed, undefined, "the egress part seeds nothing");
    assert.deepEqual(
      Object.keys(handle.env).sort(),
      [...EGRESS_KEYS].sort(),
      "the env holds exactly the six URSITOARE_EGRESS_ variables",
    );
    for (const key of [EGRESS_KEYS[0], EGRESS_KEYS[1], EGRESS_KEYS[5]]) {
      assert.match(envValue(handle, key ?? ""), LOOPBACK_URL);
    }
    assert.equal(
      envValue(handle, "URSITOARE_EGRESS_VAULT_IDENTITY"),
      "svcid_ursitoare_admin",
      "the vault identity is the fake admin",
    );

    const brokerTokenFile = envValue(handle, "URSITOARE_EGRESS_BROKER_TOKEN_FILE");
    const vaultTokenFile = envValue(handle, "URSITOARE_EGRESS_VAULT_TOKEN_FILE");
    assert.equal(statSync(brokerTokenFile).mode & 0o777, 0o600, "the broker token file has mode 0600");
    assert.equal(statSync(vaultTokenFile).mode & 0o777, 0o600, "the vault token file has mode 0600");

    handles.set("egress", handle);
    const fake = egressApi(handles).fake;
    assert.deepEqual(handle.api, { fake }, "the handle exposes the fake");
    assert.equal(readFileSync(brokerTokenFile, "utf8"), fake.brokerServiceToken);
    assert.equal(readFileSync(vaultTokenFile, "utf8"), fake.vaultAdmin.token);

    const config = loadEgressConfig(handle.env, reader);
    assert.ok(config !== undefined, "the part env loads as an egress configuration");
    assert.equal(config.brokerUrl, envValue(handle, "URSITOARE_EGRESS_BROKER_URL"));
    assert.equal(config.proxyUrl, envValue(handle, "URSITOARE_EGRESS_PROXY_URL"));
    assert.equal(config.vault?.url, envValue(handle, "URSITOARE_EGRESS_VAULT_URL"));
    assert.equal(config.vault?.identity, "svcid_ursitoare_admin");
    assert.equal(config.vault?.token.reveal(), fake.vaultAdmin.token);

    const missing = thrown(() => egressApi(new Map<string, PartHandle>()));
    assert.ok(missing instanceof E2eStackError, `expected an E2eStackError, got ${String(missing)}`);
    assert.equal(missing.code, "STACK_PART_MISSING");
    assert.deepEqual(missing.details, { part: "egress" });

    assert.equal(await must(() => issue(fake)), 200, "the fake issues a token");
    assert.equal(fake.issued().length, 1, "the issue call is recorded");

    await must(() => egressPart.beforeReset?.(context) ?? Promise.resolve());
    assert.deepEqual(fake.issued(), [], "beforeReset clears the fake records");

    await must(() => handle.close());
    await must(() => handle.close());
    for (const url of [fake.brokerUrl, fake.proxyUrl, fake.vaultUrl]) {
      assert.equal(await connectionRefused(portOf(url)), true, `${url} refuses after close`);
    }
  } finally {
    await started?.close().catch(() => undefined);
  }
});

test("C-e09b6c9e discovery lists the egress part after durable and the part file re-exports it", async () => {
  assert.equal(egressPart.name, "egress", "the part is named egress");

  const parts = await must(() => discoverParts());
  const names = parts.map((part) => part.name);
  assert.ok(names.includes("egress"), "the egress part is discovered");
  assert.ok(
    names.indexOf("durable") < names.indexOf("egress"),
    "the egress part is discovered after the durable part",
  );

  const partFile = path.join(PARTS_DIR, "45-egress.ts");
  assert.ok(existsSync(partFile), "the shipped egress part file exists");
  assert.equal(
    readFileSync(partFile, "utf8").trim(),
    'export { egressPart as part } from "../egress-part.ts";',
    "the part file re-exports the egress part",
  );
});

test("C-e09b6c9e the crash cluster runs the egress part and its broker turns unreachable after close", async () => {
  const captured = captureLogger();
  const deps = { clock: systemClock, logger: captured.logger };
  let egress: EgressConfig | undefined;

  await must(() =>
    withDedicatedCluster(async (cluster) => {
      const keys = Object.keys(cluster.env)
        .filter((key) => key.startsWith("URSITOARE_EGRESS_"))
        .sort();
      assert.deepEqual(keys, [...EGRESS_KEYS].sort(), "the cluster env holds the six egress keys");
      for (const key of [EGRESS_KEYS[0], EGRESS_KEYS[1], EGRESS_KEYS[5]]) {
        assert.match(cluster.env[key ?? ""] ?? "", LOOPBACK_URL);
      }
      assert.equal(
        cluster.env["URSITOARE_EGRESS_VAULT_IDENTITY"],
        "svcid_ursitoare_admin",
        "the cluster env names the fake vault admin",
      );

      egress = loadEgressConfig(cluster.env, reader);
      assert.ok(egress !== undefined, "the cluster env loads as an egress configuration");
      assert.deepEqual(
        await checkEgress(egress, deps),
        { broker: "closed" },
        "the egress fake answers the self-check",
      );
    }),
  );

  assert.ok(egress !== undefined, "the callback saw the egress configuration");
  assert.deepEqual(
    await checkEgress(egress, deps),
    { broker: "unreachable" },
    "the closed broker is unreachable",
  );
});
