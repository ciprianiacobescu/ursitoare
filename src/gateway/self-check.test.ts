import assert from "node:assert/strict";
import { mock, test } from "node:test";

import { Secret } from "../config/index.ts";
import type { EgressConfig } from "../config/index.ts";
import { fixedClock } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import type { Logger } from "../observability/index.ts";
import { captureLogger, recordingFetch } from "../../test/support/gateway-kit.ts";
import { startFakeEgress } from "../../test/support/fake-egress/index.ts";
import { checkEgress } from "./self-check.ts";
import { GatewayError } from "./types.ts";

const BROKER_URL = "http://broker.internal:8081";
const ZERO_UUID = "00000000-0000-4000-8000-000000000000";
const T0 = new Date("2026-11-06T10:00:00.000Z");
const CLOCK = fixedClock(T0.toISOString());

const CFG: EgressConfig = {
  brokerUrl: BROKER_URL,
  proxyUrl: "http://kong.internal:8000/v1/call",
  brokerToken: new Secret("unused"),
  agentId: "ursitoare-engine",
  vault: null,
};

const ISSUE_BODY = `{"agent_id":"ursitoare-engine","service_id":"${ZERO_UUID}","tenant_id":"${ZERO_UUID}","scope":"call","ttl_seconds":1}`;
const RESOLVE_BODY = `{"key_fingerprint":"probe","presented_key":"probe","service_id":"${ZERO_UUID}","tenant_id":"${ZERO_UUID}"}`;

function silentLogger(): Logger {
  return createLogger({
    level: "silent",
    destination: { write(_line: string): void {} },
  });
}

function response(status: number): Response {
  return new Response(null, { status });
}

function flush(): Promise<void> {
  return new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}

function errorIs(code: string, details: Record<string, string>) {
  return (error: unknown): boolean => {
    assert.ok(error instanceof GatewayError, "a GatewayError");
    assert.equal(error.code, code);
    assert.deepEqual(error.details, details);
    return true;
  };
}

test("C-b6e0b10b checkEgress treats non 2xx answers as a closed broker and logs nothing", async () => {
  await assert.doesNotReject(async () => {
    const rows = [
      { name: "C1 unauthorized twice", answers: [response(401), response(401)] },
      { name: "C2 forbidden then missing", answers: [response(403), response(404)] },
      { name: "C3 server errors", answers: [response(500), response(500)] },
      { name: "C4 redirect then unauthorized", answers: [response(302), response(401)] },
    ];

    for (const row of rows) {
      const recorded = recordingFetch(row.answers);
      const captured = captureLogger();
      const result = await checkEgress(CFG, {
        clock: CLOCK,
        logger: captured.logger,
        fetch: recorded.fetch,
      });
      assert.deepEqual(result, { broker: "closed" }, row.name);
      assert.equal(recorded.calls.length, 2, `${row.name} makes two probes`);
      assert.deepEqual(captured.lines(), [], `${row.name} writes no line`);
    }
  });
});

test("C-b6e0b10b checkEgress posts two probes without a service token", async () => {
  await assert.doesNotReject(async () => {
    const recorded = recordingFetch([response(401), response(401)]);
    const captured = captureLogger();
    const result = await checkEgress(CFG, {
      clock: CLOCK,
      logger: captured.logger,
      fetch: recorded.fetch,
    });

    assert.deepEqual(result, { broker: "closed" });
    assert.equal(recorded.calls.length, 2);

    const issue = recorded.calls[0];
    const resolve = recorded.calls[1];
    assert.ok(issue !== undefined && resolve !== undefined);
    assert.equal(issue.url, `${BROKER_URL}/v1/issue`);
    assert.equal(resolve.url, `${BROKER_URL}/v1/api-keys/resolve`);

    for (const call of [issue, resolve]) {
      assert.equal(call.init.method, "POST");
      assert.equal(call.init.redirect, "manual");
      assert.deepEqual(call.init.headers, { "content-type": "application/json" });
      assert.ok(call.init.signal instanceof AbortSignal, "the probe carries a signal");
    }

    assert.equal(issue.init.body, ISSUE_BODY);
    assert.equal(resolve.init.body, RESOLVE_BODY);
  });
});

test("C-b6e0b10b an open issuer is refused at the first 2xx answer", async () => {
  await assert.doesNotReject(async () => {
    const rows = [
      { name: "C5 issue open", answers: [response(200)], probe: "issue", calls: 1 },
      {
        name: "C6 resolve open with a token body",
        answers: [response(401), response(200)],
        probe: "resolve",
        calls: 2,
      },
      {
        name: "C7 resolve open with an empty body",
        answers: [response(401), response(204)],
        probe: "resolve",
        calls: 2,
      },
    ];

    for (const row of rows) {
      const recorded = recordingFetch(row.answers);
      const captured = captureLogger();
      await assert.rejects(
        checkEgress(CFG, { clock: CLOCK, logger: captured.logger, fetch: recorded.fetch }),
        errorIs("GATEWAY_INSECURE_BROKER", { probe: row.probe }),
        row.name,
      );
      assert.equal(recorded.calls.length, row.calls, `${row.name} stops at the open probe`);

      const withoutBase = captured.lines().map((line) => {
        const { time: _time, service: _service, ...rest } = line;
        return rest;
      });
      assert.deepEqual(withoutBase, [
        {
          level: 50,
          code: "GATEWAY_INSECURE_BROKER",
          probe: row.probe,
          brokerUrl: BROKER_URL,
          msg: `egress broker answered ${row.probe} without a service token; give it its service tokens before starting`,
        },
      ]);
    }
  });
});

test("C-b6e0b10b a connection failure makes the broker unreachable", async () => {
  await assert.doesNotReject(async () => {
    const rows = [
      { name: "C8 resolve refused to connect", answers: [response(401), new TypeError("connection refused")] },
      { name: "C9 issue refused to connect", answers: [new TypeError("connection refused"), response(401)] },
      { name: "C10 both refused to connect", answers: [new TypeError("connection refused"), new TypeError("connection refused")] },
    ];

    for (const row of rows) {
      const recorded = recordingFetch(row.answers);
      const captured = captureLogger();
      const result = await checkEgress(CFG, {
        clock: CLOCK,
        logger: captured.logger,
        fetch: recorded.fetch,
      });
      assert.deepEqual(result, { broker: "unreachable" }, row.name);
      assert.equal(recorded.calls.length, 2, `${row.name} makes two probes`);
      assert.deepEqual(captured.lines(), [], `${row.name} writes no line`);
    }
  });
});

test("C-b6e0b10b each probe aborts at five seconds and not before", async () => {
  await assert.doesNotReject(async () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    try {
      const calls: { url: string; init: RequestInit }[] = [];
      const fetchFn = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        calls.push({ url, init: init ?? {} });
        return new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (signal === undefined || signal === null) {
            reject(new Error("the probe passed no signal"));
            return;
          }
          const fail = (): void => {
            reject(signal.reason);
          };
          if (signal.aborted) fail();
          else signal.addEventListener("abort", fail, { once: true });
        });
      };

      const pending = checkEgress(CFG, {
        clock: CLOCK,
        logger: silentLogger(),
        fetch: fetchFn as typeof fetch,
      });
      pending.catch(() => undefined);

      await flush();
      assert.equal(calls.length, 1);
      const first = calls[0]?.init.signal;
      assert.ok(first instanceof AbortSignal, "the first probe carries a signal");
      mock.timers.tick(4999);
      await flush();
      assert.equal(first.aborted, false, "the first probe is not aborted before five seconds");
      mock.timers.tick(1);
      await flush();
      assert.equal(first.aborted, true, "the first probe aborts at five seconds");

      await flush();
      assert.equal(calls.length, 2);
      const second = calls[1]?.init.signal;
      assert.ok(second instanceof AbortSignal, "the second probe carries a signal");
      mock.timers.tick(4999);
      await flush();
      assert.equal(second.aborted, false, "the second probe is not aborted before five seconds");
      mock.timers.tick(1);
      await flush();
      assert.equal(second.aborted, true, "the second probe aborts at five seconds");

      const result = await pending;
      assert.deepEqual(result, { broker: "unreachable" });
      assert.equal(calls.length, 2);
    } finally {
      mock.timers.reset();
    }
  });
});

test("C-b6e0b10b the real fake broker answers as closed without recording an issue", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFakeEgress({ now: () => T0 });
    try {
      const cfg: EgressConfig = {
        brokerUrl: fake.brokerUrl,
        proxyUrl: fake.proxyUrl,
        brokerToken: new Secret(fake.brokerServiceToken),
        agentId: "ursitoare-engine",
        vault: null,
      };
      const captured = captureLogger();
      const result = await checkEgress(cfg, { clock: CLOCK, logger: captured.logger });
      assert.deepEqual(result, { broker: "closed" });
      assert.deepEqual(fake.issued(), []);
      assert.deepEqual(fake.events(), []);
      assert.deepEqual(captured.lines(), []);
    } finally {
      await fake.close();
    }
  });
});
