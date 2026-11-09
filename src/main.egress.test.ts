import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";

import type { AppConfig, EgressConfig } from "./config/index.ts";
import { Secret } from "./config/index.ts";
import { systemClock } from "./core/index.ts";
import type { GatewayDeps } from "./gateway/index.ts";
import { checkEgress } from "./gateway/index.ts";
import type { MainDeps, RunningServer } from "./main.ts";
import { VERSION, main } from "./main.ts";
import type { LogDestination } from "./observability/index.ts";
import { startFakeEgress } from "../test/support/fake-egress/index.ts";
import { freePort } from "../test/support/pg.ts";

const BROKER_TOKEN = "bt-" + "secret-" + "4d2a";

type CheckEgressSeam = (
  config: EgressConfig,
  deps: GatewayDeps,
) => Promise<{ broker: "closed" | "unreachable" }>;

type DepsWithSeam = Partial<MainDeps> & { checkEgress?: CheckEgressSeam };

interface OpenBroker {
  readonly url: string;
  readonly requests: {
    method: string | undefined;
    url: string | undefined;
    headers: http.IncomingHttpHeaders;
  }[];
  close(): Promise<void>;
}

function capture(): { destination: LogDestination; lines: string[] } {
  const lines: string[] = [];
  return {
    lines,
    destination: {
      write(line: string): void {
        lines.push(line);
      },
    },
  };
}

function logged(lines: readonly string[]): Record<string, unknown>[] {
  return lines.map((line) => JSON.parse(line) as Record<string, unknown>);
}

function appConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    role: "all",
    host: "127.0.0.1",
    port: 0,
    logLevel: "info",
    publicBaseUrl: "https://ursitoare.example.com",
    webDist: null,
    shutdownDrainMs: 10000,
    engineKey: null,
    database: { app: null, owner: null },
    ...overrides,
  };
}

function egressConfig(brokerUrl: string, proxyUrl = "http://proxy.internal:8000/v1/call"): EgressConfig {
  return {
    brokerUrl,
    proxyUrl,
    brokerToken: new Secret(BROKER_TOKEN),
    agentId: "ursitoare-engine",
    vault: null,
  };
}

async function resolveMain(deps: DepsWithSeam): Promise<RunningServer | null> {
  const results: (RunningServer | null)[] = [];
  await assert.doesNotReject(async () => {
    results.push(await main(deps));
  }, "main must resolve");
  const result = results[0];
  assert.ok(result !== undefined, "main resolved a value");
  return result;
}

async function startOpenBroker(): Promise<OpenBroker> {
  const requests: OpenBroker["requests"] = [];
  const server = http.createServer((request, response) => {
    requests.push({ method: request.method, url: request.url, headers: request.headers });
    request.resume();
    response.writeHead(200, { "content-type": "application/json" });
    response.end('{"token":"x","expires_at":1}');
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address !== null && typeof address === "object", "the stub bound a port");
  return {
    url: `http://127.0.0.1:${(address as AddressInfo).port}`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error === undefined ? resolve() : reject(error)));
      }),
  };
}

test("C-cfd3a3ab main refuses an open issuer before it opens the database", async () => {
  const broker = await startOpenBroker();
  const { destination, lines } = capture();
  const exits: number[] = [];
  let running: RunningServer | null = null;

  try {
    running = await resolveMain({
      loadConfig: () => appConfig({ egress: egressConfig(broker.url) }),
      destination,
      signals: new EventEmitter(),
      exit: (code) => {
        exits.push(code);
      },
    });

    assert.ok(running === null, "an open issuer stops the start");
    assert.deepEqual(exits, [1]);

    const entries = logged(lines);
    const open = entries.find((entry) => entry["level"] === 50);
    assert.ok(open !== undefined, "the open broker is logged at error level");
    assert.equal(open["code"], "GATEWAY_INSECURE_BROKER");
    assert.equal(open["probe"], "issue");
    assert.equal(open["brokerUrl"], broker.url);
    assert.equal(
      open["msg"],
      "egress broker answered issue without a service token; give it its service tokens before starting",
    );

    const fatal = entries.filter((entry) => entry["level"] === 60);
    assert.equal(fatal.length, 1, "exactly one fatal line is written");
    assert.equal(fatal[0]?.["code"], "GATEWAY_INSECURE_BROKER");
    assert.equal(fatal[0]?.["msg"], "startup failed");
    assert.equal(
      entries.some((entry) => entry["msg"] === "ursitoare listening"),
      false,
      "no port was opened",
    );

    assert.equal(broker.requests.length, 1, "the probe stops at the open issue answer");
    const probe = broker.requests[0];
    assert.ok(probe !== undefined);
    assert.equal(probe.method, "POST");
    assert.equal(probe.url, "/v1/issue");
    assert.equal(probe.headers["x-mintkey-service-token"], undefined, "no service token is sent");
  } finally {
    await running?.close().catch(() => undefined);
    await broker.close();
  }
});

test("C-cfd3a3ab main starts against the closed fake broker and serves health", async () => {
  const fake = await startFakeEgress();
  const { destination, lines } = capture();
  const exits: number[] = [];
  const egress = egressConfig(fake.brokerUrl, fake.proxyUrl);
  let calls = 0;
  let seenConfig: EgressConfig | undefined;
  let running: RunningServer | null = null;

  try {
    running = await resolveMain({
      loadConfig: () => appConfig({ egress }),
      destination,
      signals: new EventEmitter(),
      exit: (code) => {
        exits.push(code);
      },
      checkEgress: (config, deps) => {
        calls += 1;
        seenConfig = config;
        return checkEgress(config, deps);
      },
    });

    assert.ok(running !== null, "a closed broker starts the engine");
    assert.equal(calls, 1, "the self-check runs once");
    assert.equal(seenConfig, egress, "the self-check receives the config's egress");

    const response = await fetch(`${running.url}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "ok",
      version: VERSION,
      checks: {},
    });

    assert.equal(
      logged(lines).some((entry) => entry["code"] === "EGRESS_BROKER_UNREACHABLE"),
      false,
      "a closed broker writes no warning",
    );
    assert.deepEqual(exits, []);
  } finally {
    await running?.close().catch(() => undefined);
    await fake.close();
  }
});

test("C-cfd3a3ab main warns and starts when the broker is unreachable", async () => {
  const port = await freePort();
  const brokerUrl = `http://127.0.0.1:${port}`;
  const { destination, lines } = capture();
  const exits: number[] = [];
  let running: RunningServer | null = null;

  try {
    running = await resolveMain({
      loadConfig: () => appConfig({ egress: egressConfig(brokerUrl) }),
      destination,
      signals: new EventEmitter(),
      exit: (code) => {
        exits.push(code);
      },
    });

    assert.ok(running !== null, "an unreachable broker still starts the engine");
    assert.deepEqual(exits, []);

    const entries = logged(lines);
    const warning = entries.find((entry) => entry["code"] === "EGRESS_BROKER_UNREACHABLE");
    assert.ok(warning !== undefined, "the unreachable broker is logged at warn level");
    assert.equal(warning["level"], 40);
    assert.equal(warning["brokerUrl"], brokerUrl);
    assert.equal(warning["msg"], "egress broker unreachable; tool calls fail until it answers");
  } finally {
    await running?.close().catch(() => undefined);
  }
});

test("C-cfd3a3ab main calls the checkEgress seam only when egress is configured", async () => {
  const egress = egressConfig("http://127.0.0.1:1");
  let calls = 0;
  let seenConfig: EgressConfig | undefined;
  let seenDeps: GatewayDeps | undefined;

  const closed: CheckEgressSeam = (config, deps) => {
    calls += 1;
    seenConfig = config;
    seenDeps = deps;
    return Promise.resolve({ broker: "closed" });
  };

  const { destination } = capture();
  const exits: number[] = [];
  let running: RunningServer | null = null;

  try {
    running = await resolveMain({
      loadConfig: () => appConfig({ egress }),
      destination,
      signals: new EventEmitter(),
      exit: (code) => {
        exits.push(code);
      },
      checkEgress: closed,
    });

    assert.ok(running !== null, "a closed broker starts the engine");
    assert.equal(calls, 1, "the seam is called once when egress is set");
    assert.equal(seenConfig, egress, "the seam receives the config's egress object");
    assert.equal(seenDeps?.clock, systemClock, "the seam gets the system clock");
    assert.equal(typeof seenDeps?.logger.warn, "function", "the seam gets the configured logger");
    assert.deepEqual(exits, []);
    await running.close();
    running = null;
  } finally {
    await running?.close().catch(() => undefined);
  }

  let thrown = 0;
  const throwing: CheckEgressSeam = () => {
    thrown += 1;
    throw new Error("the self-check must not run without egress");
  };
  const second = capture();
  let started: RunningServer | null = null;

  try {
    started = await resolveMain({
      loadConfig: () => appConfig(),
      destination: second.destination,
      signals: new EventEmitter(),
      exit: () => undefined,
      checkEgress: throwing,
    });

    assert.ok(started !== null, "a config without egress starts the engine");
    assert.equal(thrown, 0, "the seam is never called without egress");
    assert.equal(
      logged(second.lines).some((entry) => entry["code"] === "EGRESS_BROKER_UNREACHABLE"),
      false,
      "no egress warning without egress",
    );
  } finally {
    await started?.close().catch(() => undefined);
  }
});
