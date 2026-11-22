import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";

import type { ContractCheck } from "../fake-oidc/index.ts";
import { fakeMcpContract } from "./contract.ts";
import { startFakeMcp } from "./index.ts";

const HOST = "mcp.fake.test";
const PATH = "/mcp";
const KEY = "Bearer " + ["k", "mcp", "7f3a"].join("-");

const CONTRACT_NAMES = [
  "server/discover answers its versions",
  "tools/list answers the tools",
  "tools/call answers find_vendor",
  "a header mismatch is refused with -32020",
  "an unsupported version is refused with -32022",
  "an unknown method is refused with -32601",
  "a missing key is refused",
  "a legacy initialize answers its handshake",
] as const;

const MISSING_KEY = "a missing key is refused";
const LEGACY_HANDSHAKE = "a legacy initialize answers its handshake";
const MODERN_CHECKS = CONTRACT_NAMES.slice(0, 6);

type Key = { name: string; value: string } | null;

interface Forwarder {
  origin: string;
  close(): Promise<void>;
}

type HeaderRewrite = (
  headers: http.IncomingHttpHeaders,
  count: number,
  target: URL,
) => http.OutgoingHttpHeaders;

interface Rejection {
  name: string;
  message: string;
}

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

function buildChecks(baseUrl: string, key: Key = { name: "authorization", value: KEY }): ContractCheck[] {
  let checks: ContractCheck[] | undefined;
  assert.doesNotThrow(() => {
    checks = fakeMcpContract(baseUrl, { host: HOST, path: PATH, key });
  });
  assert.ok(checks !== undefined, "the contract suite was built");
  return checks;
}

function checkNamed(checks: ContractCheck[], name: string): ContractCheck {
  const check = checks.find((candidate) => candidate.name === name);
  assert.ok(check !== undefined, `the contract does not expose the check ${name}`);
  return check;
}

async function runAll(checks: ContractCheck[]): Promise<Rejection[]> {
  const rejected: Rejection[] = [];
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
      rejected.push({ name: check.name, message: error.message });
    }
  }
  return rejected;
}

test("C-d61fc3e1 the contract names are the eight checks in order", async () => {
  const fake = await startFakeMcp();
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
  test(`C-d61fc3e1 ${name}`, async () => {
    const fake = await startFakeMcp();
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

test("C-d61fc3e1 a modern-only fake passes seven checks and fails only the legacy handshake", async () => {
  const fake = await startFakeMcp({ era: "modern", pageSize: 1 });
  try {
    const rejected = await runAll(buildChecks(fake.origin));
    assert.deepEqual(
      rejected.map((rejection) => rejection.name),
      [LEGACY_HANDSHAKE],
    );
    assert.ok(
      fake.requests({ method: "tools/list" }).length >= 2,
      "the tools list check reads both pages",
    );
  } finally {
    await fake.close();
  }
});

test("C-d61fc3e1 a legacy-only fake fails the six modern checks and passes the key and handshake", async () => {
  const fake = await startFakeMcp({ era: "legacy" });
  try {
    const rejected = await runAll(buildChecks(fake.origin));
    assert.deepEqual(
      rejected.map((rejection) => rejection.name),
      [...MODERN_CHECKS],
    );
  } finally {
    await fake.close();
  }
});

test("C-d61fc3e1 the keyless contract has seven checks and all resolve", async () => {
  const fake = await startFakeMcp({ keyHeader: null, session: true });
  try {
    const checks = buildChecks(fake.origin, null);
    assert.deepEqual(
      checks.map((check) => check.name),
      CONTRACT_NAMES.filter((name) => name !== MISSING_KEY),
    );
    const rejected = await runAll(checks);
    assert.deepEqual(rejected, []);
  } finally {
    await fake.close();
  }
});

test("C-d61fc3e1 a forwarder that adds the key fails only the missing key check", async () => {
  const fake = await startFakeMcp();
  const mutant = await startForwarder(fake.origin, () => ({ authorization: KEY }));
  try {
    const rejected = await runAll(buildChecks(mutant.origin));
    assert.deepEqual(
      rejected.map((rejection) => rejection.name),
      [MISSING_KEY],
    );
    assert.match(rejected[0]?.message ?? "", /answered 200/);
  } finally {
    await mutant.close();
    await fake.close();
  }
});

test("C-d61fc3e1 a closed port rejects every check as unreachable", async () => {
  const rejected = await runAll(buildChecks("http://127.0.0.1:1"));
  assert.deepEqual(
    rejected.map((rejection) => rejection.name),
    [...CONTRACT_NAMES],
  );
  for (const rejection of rejected) {
    assert.match(rejection.message, /is unreachable/);
  }
});
