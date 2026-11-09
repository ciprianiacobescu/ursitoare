import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import { test } from "node:test";

import type { ContractCheck } from "../fake-oidc/index.ts";
import { egressContract } from "./contract.ts";
import type { EgressContractTarget } from "./contract.ts";
import { startEchoUpstream, startFakeEgress } from "./index.ts";
import type { EchoUpstream, FakeEgress } from "./index.ts";

const T_A = "4b8a2c1e-0000-8000-8000-000000000001";
const S1 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01";

const NAMES: readonly string[] = [
  "issue needs the service token",
  "issue returns a JWT for the service and tenant",
  "issue enforces the TTL bounds",
  "vault put with the admin identity returns a key version",
  "vault put with a denied identity is refused",
  "proxy refuses a request without a bearer",
  "proxy refuses a token for another service",
  "proxy forwards to the echo service with the injected header",
  "proxy passes a redirect through",
];

interface Listener {
  url: string;
  close(): Promise<void>;
}

interface ContractFake {
  fake: FakeEgress;
  echo: EchoUpstream;
  target: EgressContractTarget;
}

async function startContractFake(): Promise<ContractFake> {
  let fake: FakeEgress | undefined;
  await assert.doesNotReject(async () => {
    fake = await startFakeEgress();
  });
  assert.ok(fake !== undefined, "the fake started");
  let echo: EchoUpstream | undefined;
  await assert.doesNotReject(async () => {
    echo = await startEchoUpstream();
  });
  assert.ok(echo !== undefined, "the echo upstream started");
  const started: FakeEgress = fake;
  const upstream: EchoUpstream = echo;
  const target: EgressContractTarget = {
    brokerUrl: fake.brokerUrl,
    proxyUrl: fake.proxyUrl,
    vaultUrl: fake.vaultUrl,
    brokerServiceToken: fake.brokerServiceToken,
    vaultAdmin: { identity: fake.vaultAdmin.identity, token: fake.vaultAdmin.token },
    vaultDenied: { identity: fake.vaultDenied.identity, token: fake.vaultDenied.token },
    tenantId: T_A,
    echo: { serviceId: S1, targetUrl: "http://echo.fake.test" },
  };
  assert.doesNotThrow(() => {
    started.addUpstream("echo.fake.test", upstream.origin);
  }, "the echo host was not registered on the fake");
  return { fake: started, echo: upstream, target };
}

async function startForwarder(
  base: string,
  mutate: (headers: Record<string, string>) => Record<string, string>,
): Promise<Listener> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        const headers: Record<string, string> = {};
        for (const [name, value] of Object.entries(req.headers)) {
          if (name !== "host" && value !== undefined) {
            headers[name] = Array.isArray(value) ? value.join(", ") : value;
          }
        }
        const method = req.method ?? "GET";
        const raw = Buffer.concat(chunks);
        const init: RequestInit =
          method === "GET" || method === "HEAD"
            ? { method, headers: mutate(headers) }
            : { method, headers: mutate(headers), body: raw };
        fetch(base + (req.url ?? "/"), init)
          .then(async (up) => {
            const text = await up.text();
            res.writeHead(up.status, Object.fromEntries(up.headers.entries()));
            res.end(text);
          })
          .catch(() => {
            res.writeHead(502);
            res.end("forwarder failed");
          });
      });
    });
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("the forwarder has no TCP address"));
        return;
      }
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () =>
          new Promise<void>((done, fail) => {
            server.closeAllConnections();
            server.close((error) => {
              if (error === undefined) done();
              else fail(error);
            });
          }),
      });
    });
  });
}

async function closedPort(): Promise<Listener> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("the closed port has no TCP address"));
        return;
      }
      server.close(() => {
        resolve({ url: `http://127.0.0.1:${address.port}`, close: async () => {} });
      });
    });
  });
}

function assertionsOf(name: string, error: unknown): true {
  const message = String((error as { message?: unknown })?.message ?? error);
  assert.ok(
    error instanceof assert.AssertionError,
    `${name}: the failure was not an AssertionError (${message})`,
  );
  assert.ok(
    message.startsWith(`${name}:`),
    `${name}: the message does not start with the check name (${message})`,
  );
  return true;
}

function buildChecks(target: EgressContractTarget): ContractCheck[] {
  const checks: ContractCheck[] = [];
  assert.doesNotThrow(() => {
    checks.push(...egressContract(target));
  }, "egressContract threw instead of returning the checks");
  assert.equal(checks.length, NAMES.length);
  return checks;
}

async function runWith(target: EgressContractTarget, broken: string | null): Promise<void> {
  const checks = buildChecks(target);
  for (const check of checks) {
    if (broken !== null && check.name === broken) {
      await assert.rejects(check.run(), (error: unknown) => assertionsOf(check.name, error), `${check.name} did not reject`);
    } else {
      await assert.doesNotReject(check.run, `${check.name} rejected`);
    }
  }
}

test("C-37594c69 egressContract returns the nine checks in order", async () => {
  const { fake, echo, target } = await startContractFake();
  try {
    const checks: ContractCheck[] = [];
    assert.doesNotThrow(() => {
      checks.push(...egressContract(target));
    }, "egressContract threw instead of returning the checks");
    assert.deepEqual(checks.map((check) => check.name), [...NAMES]);
  } finally {
    await fake.close();
    await echo.close();
  }
});

test("C-37594c69 the nine checks pass on the fake", async (t) => {
  const { fake, echo, target } = await startContractFake();
  try {
    const checks = buildChecks(target);
    assert.deepEqual(checks.map((check) => check.name), [...NAMES]);
    for (const check of checks) {
      await t.test(check.name, check.run);
    }
  } finally {
    await fake.close();
    await echo.close();
  }
});

test("C-37594c69 on mutant A only issue needs the service token rejects", async () => {
  const { fake, echo, target } = await startContractFake();
  const mutant = await startForwarder(fake.brokerUrl, (headers) => ({
    ...headers,
    "x-mintkey-service-token": fake.brokerServiceToken,
  }));
  try {
    await runWith({ ...target, brokerUrl: mutant.url }, "issue needs the service token");
  } finally {
    await mutant.close();
    await fake.close();
    await echo.close();
  }
});

test("C-37594c69 on mutant B only proxy passes a redirect through rejects", async () => {
  const { fake, echo, target } = await startContractFake();
  const mutant = await startForwarder(fake.proxyUrl, (headers) => headers);
  try {
    await runWith({ ...target, proxyUrl: mutant.url }, "proxy passes a redirect through");
  } finally {
    await mutant.close();
    await fake.close();
    await echo.close();
  }
});

test("C-37594c69 on a closed port all nine checks reject with unreachable or failed", async () => {
  const { fake, echo, target } = await startContractFake();
  const dead = await closedPort();
  try {
    const checks = buildChecks({ ...target, brokerUrl: dead.url, proxyUrl: dead.url, vaultUrl: dead.url });
    for (const check of checks) {
      await assert.rejects(check.run(), (error: unknown) => {
        assertionsOf(check.name, error);
        assert.match(
          String((error as { message?: unknown })?.message ?? ""),
          /unreachable|failed/,
          `${check.name}: the message says neither unreachable nor failed`,
        );
        return true;
      }, `${check.name} did not reject on the closed port`);
    }
  } finally {
    await dead.close();
    await fake.close();
    await echo.close();
  }
});
