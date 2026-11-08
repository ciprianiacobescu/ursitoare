import { timingSafeEqual } from "node:crypto";
import http from "node:http";

import { randomId } from "./state.ts";
import type { FakeState } from "./state.ts";
import { signJwt } from "./jwt.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const MAX_BODY = 65536;

function problem(code: string, title: string): string {
  return JSON.stringify({ "mintkey:code": code, title });
}

function sameToken(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function send(res: http.ServerResponse, status: number, body: string, extra: Record<string, string> = {}): void {
  res.writeHead(status, { "content-type": "application/json", "content-length": String(Buffer.byteLength(body)), ...extra });
  res.end(body);
}

function readBody(req: http.IncomingMessage): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let tooBig = false;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) tooBig = true;
      else chunks.push(c);
    });
    req.on("end", () => {
      resolve(tooBig ? null : Buffer.concat(chunks));
    });
    req.on("error", () => {
      resolve(null);
    });
  });
}

async function issue(state: FakeState, req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const header = req.headers["x-mintkey-service-token"];
  if (typeof header !== "string" || !sameToken(header, state.brokerServiceToken)) {
    req.resume();
    send(res, 401, problem("unauthenticated", "unauthenticated"));
    return;
  }
  const bad = (title: string): void => {
    send(res, 400, problem("validation_failed", title));
  };
  const raw = await readBody(req);
  let parsed: unknown;
  try {
    parsed = raw === null ? undefined : JSON.parse(raw.toString("utf8"));
  } catch {
    parsed = undefined;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    bad("Invalid request body");
    return;
  }
  const body = parsed as Record<string, unknown>;
  const rawTtl = body["ttl_seconds"];
  let ttl = 600;
  if (rawTtl !== undefined && rawTtl !== null) {
    if (typeof rawTtl !== "number" || !Number.isInteger(rawTtl)) {
      bad("Invalid request body");
      return;
    }
    if (rawTtl !== 0) {
      if (rawTtl < 1 || rawTtl > 3600) {
        bad("ttl_seconds must be between 1 and 3600");
        return;
      }
      ttl = rawTtl;
    }
  }
  const agent = body["agent_id"];
  if (typeof agent !== "string" || agent.length < 1 || agent.length > 128) {
    bad("agent_id is invalid");
    return;
  }
  const service = body["service_id"];
  if (typeof service !== "string" || !UUID.test(service)) {
    bad("service_id is invalid");
    return;
  }
  const tenant = body["tenant_id"];
  if (typeof tenant !== "string" || !UUID.test(tenant)) {
    bad("tenant_id is invalid");
    return;
  }
  if (body["scope"] !== "call") {
    bad("scope is invalid");
    return;
  }
  const iat = Math.floor(state.now().getTime() / 1000);
  const exp = iat + ttl;
  const jti = randomId("jti_");
  const token = signJwt(state.privateKey, state.kid, {
    aud: [service],
    exp,
    iat,
    iss: "mintkey/broker",
    jti,
    scope: "call",
    service_id: service,
    sub: agent,
    tenant_id: tenant,
    tnt: tenant,
  });
  state.issued.push({ jti, serviceId: service, tenantId: tenant, agentId: agent, ttlSeconds: ttl, issuedAt: iat, expiresAt: exp });
  await state.emit({
    emitter: "broker",
    event_type: "token.issued",
    tenant_id: tenant,
    actor_type: "agent",
    actor_id: agent,
    target_type: "service",
    target_id: service,
    payload: { scope: "call", jti, exp_ts: exp, agent_id: agent },
  });
  send(res, 200, JSON.stringify({ token, expires_at: exp }));
}

export function createBrokerServer(state: FakeState): http.Server {
  return http.createServer((req, res) => {
    const path = (req.url ?? "/").split("?")[0];
    const handle = async (): Promise<void> => {
      if (path === "/v1/issue") {
        if (req.method !== "POST") {
          req.resume();
          send(res, 405, problem("method_not_allowed", "method not allowed"), { allow: "POST" });
          return;
        }
        await issue(state, req, res);
        return;
      }
      req.resume();
      if (path === "/.well-known/jwks.json" && req.method === "GET") {
        const key = { ...state.publicJwk, alg: "EdDSA", use: "sig", kid: state.kid };
        send(res, 200, JSON.stringify({ keys: [key] }));
        return;
      }
      if (path === "/v1/health" && req.method === "GET") {
        send(res, 200, '{"status":"ok"}');
        return;
      }
      if (path === "/v1/api-keys/resolve" && req.method === "POST") {
        const header = req.headers["x-mintkey-service-token"];
        if (typeof header !== "string" || !sameToken(header, state.brokerServiceToken)) {
          send(res, 401, problem("unauthenticated", "unauthenticated"));
          return;
        }
      }
      send(res, 404, problem("not_found", "not found"));
    };
    handle().catch(() => {
      if (!res.headersSent) send(res, 400, problem("validation_failed", "Invalid request body"));
      else res.destroy();
    });
  });
}
