import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";

import type { ContractCheck } from "../fake-oidc/index.ts";
import { FAKE_TOOLS_HOST, startFakeTools } from "./index.ts";
import { fakeToolsContract } from "./contract.ts";

const CONTRACT_NAMES = [
  "a read answers its fixture",
  "an unknown block is refused",
  "a foreign Host is refused",
  "an invalid input is refused with details",
  "an effect needs an idempotency key",
  "an effect replays under the same key",
  "only POST is allowed",
] as const;

interface Forwarder {
  origin: string;
  close(): Promise<void>;
}

type HeaderRewrite = (
  headers: http.IncomingHttpHeaders,
  count: number,
  target: URL,
) => http.OutgoingHttpHeaders;

function startForwarder(target: string, rewrite: HeaderRewrite): Promise<Forwarder> {
  return new Promise<Forwarder>((resolve, reject) => {
    const targetUrl = new URL(target);
    let count = 0;
    const server = http.createServer((request, response) => {
      count += 1;
      const chunks: Buffer[] = [];
      request.on("data", (chunk: Buffer) => chunks.push(chunk));
      request.on("end", () => {
        const headers: http.OutgoingHttpHeaders = {
          ...request.headers,
          ...rewrite(request.headers, count, targetUrl),
        };
        const forwarded = http.request(
          {
            host: targetUrl.hostname,
            port: targetUrl.port,
            method: request.method ?? "GET",
            path: request.url ?? "/",
            headers,
            agent: false,
          },
          (upstream) => {
            response.writeHead(upstream.statusCode ?? 502, upstream.headers);
            upstream.pipe(response);
          },
        );
        forwarded.on("error", () => {
          if (!response.headersSent) {
            response.writeHead(502, { "content-type": "text/plain" });
          }
          response.end("bad gateway");
        });
        forwarded.end(Buffer.concat(chunks));
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
        origin: `http://127.0.0.1:${String(address.port)}`,
        close: () =>
          new Promise<void>((done, fail) => {
            server.closeAllConnections();
            server.close((error) => {
              if (error === undefined) {
                done();
              } else {
                fail(error);
              }
            });
          }),
      });
    });
  });
}

function buildChecks(baseUrl: string): ContractCheck[] {
  let checks: ContractCheck[] | undefined;
  assert.doesNotThrow(() => {
    checks = fakeToolsContract(baseUrl, { host: FAKE_TOOLS_HOST });
  });
  assert.ok(checks !== undefined, "the contract suite was built");
  return checks;
}

function checkNamed(checks: ContractCheck[], name: string): ContractCheck {
  const check = checks.find((candidate) => candidate.name === name);
  assert.ok(check !== undefined, `the contract does not expose the check ${name}`);
  return check;
}

async function runAll(checks: ContractCheck[]): Promise<string[]> {
  const rejected: string[] = [];
  for (const check of checks) {
    try {
      await check.run();
    } catch (error: unknown) {
      assert.ok(
        error instanceof assert.AssertionError,
        `${check.name} rejected with a non-assertion error: ${String(error)}`,
      );
      assert.ok(
        error.message.startsWith(`${check.name}:`),
        `${check.name} rejected with a message that does not start with its name and a colon: ${error.message}`,
      );
      rejected.push(check.name);
    }
  }
  return rejected;
}

test("C-5f2ab557 the contract names are the seven checks in order", async () => {
  const fake = await startFakeTools();
  try {
    assert.deepEqual(
      buildChecks(fake.origin).map((check) => check.name),
      [...CONTRACT_NAMES],
    );
  } finally {
    await fake.close();
  }
});

for (const name of CONTRACT_NAMES) {
  test(`C-5f2ab557 ${name}`, async () => {
    const fake = await startFakeTools();
    try {
      const check = checkNamed(buildChecks(fake.origin), name);
      await assert.doesNotReject(async () => {
        await check.run();
      });
    } finally {
      await fake.close();
    }
  });
}

test("C-5f2ab557 a forwarder that changes the idempotency key fails only the replay check", async () => {
  const fake = await startFakeTools();
  const mutant = await startForwarder(fake.origin, (headers, count) => {
    const seen = headers["idempotency-key"];
    if (seen === undefined) {
      return {};
    }
    const value = Array.isArray(seen) ? (seen[0] ?? "") : seen;
    return { "idempotency-key": `${value}-${String(count)}` };
  });
  try {
    const rejected = await runAll(buildChecks(mutant.origin));
    assert.deepEqual(rejected, ["an effect replays under the same key"]);
  } finally {
    await mutant.close();
    await fake.close();
  }
});

test("C-5f2ab557 a forwarder that rewrites the Host fails only the foreign Host check", async () => {
  const fake = await startFakeTools();
  const mutant = await startForwarder(fake.origin, (_headers, _count, target) => ({
    host: target.host,
  }));
  try {
    const rejected = await runAll(buildChecks(mutant.origin));
    assert.deepEqual(rejected, ["a foreign Host is refused"]);
  } finally {
    await mutant.close();
    await fake.close();
  }
});

test("C-5f2ab557 a closed port rejects every check", async () => {
  const rejected = await runAll(buildChecks("http://127.0.0.1:1"));
  assert.deepEqual(rejected, [...CONTRACT_NAMES]);
});
