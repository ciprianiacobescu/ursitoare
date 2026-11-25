import assert from "node:assert/strict";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { buildServer, registerSecurityHeaders } from "../../api/index.ts";
import { Secret } from "../../config/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import { createLogger, noopTracer } from "../../observability/index.ts";
import type { TenantPool } from "../../tenancy/index.ts";
import { startFakeOidc } from "../../../test/support/fake-oidc/index.ts";
import { registerOidcRoutes } from "../index.ts";
import type { OidcRoutesDeps } from "../index.ts";

const NOW = "2026-10-25T12:00:00.000Z";
const PUBLIC_BASE_URL = "http://127.0.0.1:8080";

interface LogLine {
  level: number;
  msg?: string;
  res?: { statusCode?: number };
}

async function hookedServer(lines: string[]): Promise<FastifyInstance> {
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({
      level: "info",
      destination: {
        write: (line: string): void => {
          lines.push(line);
        },
      },
    }),
    tracer: noopTracer,
  });
  registerSecurityHeaders(server);
  return server;
}

function parsed(lines: string[]): LogLine[] {
  return lines
    .flatMap((chunk) => chunk.split("\n"))
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as LogLine);
}

function assertClean(lines: string[], status: number): void {
  const entries = parsed(lines);
  const errors = entries.filter((entry) => entry.level >= 50);
  assert.deepEqual(errors, [], "no line at error level");
  const text = lines.join("");
  assert.ok(!text.includes("Reply was already sent"), "no already-sent line");
  assert.ok(!text.includes("FST_ERR_REP_ALREADY_SENT"), "no FST_ERR_REP_ALREADY_SENT line");
  const completed = entries.filter((entry) => entry.msg === "request completed");
  assert.equal(completed.length, 1, "one request completed line");
  assert.equal(completed[0]?.res?.statusCode, status);
}

function unusedPool(): TenantPool {
  return {
    connect: (): never => {
      throw new Error("the pool must not be used");
    },
  } as unknown as TenantPool;
}

test("C-e6c11022 not-configured routes send once and log the status sent", async () => {
  const lines: string[] = [];
  const server = await hookedServer(lines);
  try {
    registerOidcRoutes(server, {
      config: null,
      publicBaseUrl: PUBLIC_BASE_URL,
      pool: null,
      engineKey: null,
      clock: fixedClock(NOW),
    });
    const response = await server.inject({ method: "GET", url: "/auth/oidc/login" });
    assert.equal(response.statusCode, 503);
    await server.close();
    assertClean(lines, 503);
  } finally {
    await server.close();
  }
});

test("C-e6c11022 login redirect sends once and logs the status sent", async () => {
  const lines: string[] = [];
  const fake = await startFakeOidc();
  const server = await hookedServer(lines);
  try {
    fake.registerRedirect(`${PUBLIC_BASE_URL}/auth/oidc/callback`);
    const deps: OidcRoutesDeps = {
      config: { issuer: fake.issuer, clientId: "ursitoare-engine", clientSecret: new Secret("client-secret") },
      publicBaseUrl: PUBLIC_BASE_URL,
      pool: unusedPool(),
      engineKey: { reveal: () => "k".repeat(64) },
      clock: fixedClock(NOW),
    };
    registerOidcRoutes(server, deps);
    const response = await server.inject({ method: "GET", url: "/auth/oidc/login" });
    assert.equal(response.statusCode, 302);
    await server.close();
    assertClean(lines, 302);
  } finally {
    await server.close();
    await fake.close();
  }
});
