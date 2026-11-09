import { createHash, createPublicKey, verify } from "node:crypto";
import http from "node:http";

import type { FakeAuditEvent, ForwardedRequest } from "./index.ts";
import { credentialKey } from "./state.ts";
import type { FakeState } from "./state.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LEEWAY_SECONDS = 30;
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

interface Claims {
  jti: string;
  sub: string;
  tenantId: string;
  serviceId: string;
  aud: unknown;
  exp: number;
}

type Verdict = { claims: Claims } | { text: string };

function text(res: http.ServerResponse, status: number, body: string): void {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8", "x-content-type-options": "nosniff" });
  res.end(`${body}\n`);
}

function json(res: http.ServerResponse, status: number, body: string): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(body);
}

function decodePart(part: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function verifyToken(state: FakeState, token: string): Verdict {
  const invalid = { text: "unauthorized: signature_invalid" };
  const parts = token.split(".");
  if (parts.length !== 3) return invalid;
  const [h = "", p = "", s = ""] = parts;
  const header = decodePart(h);
  if (header === null || header["alg"] !== "EdDSA" || header["kid"] !== state.kid) return invalid;
  const key = createPublicKey({ key: { ...state.publicJwk }, format: "jwk" });
  if (!verify(null, Buffer.from(`${h}.${p}`), key, Buffer.from(s, "base64url"))) return invalid;
  const c = decodePart(p);
  if (c === null) return invalid;
  const exp = c["exp"];
  if (typeof exp !== "number" || typeof c["tenant_id"] !== "string" || typeof c["sub"] !== "string") return invalid;
  if (exp + LEEWAY_SECONDS < Math.floor(state.now().getTime() / 1000)) return { text: "unauthorized: token_expired" };
  return {
    claims: {
      jti: String(c["jti"] ?? ""),
      sub: c["sub"],
      tenantId: c["tenant_id"],
      serviceId: String(c["service_id"] ?? ""),
      aud: c["aud"],
      exp,
    },
  };
}

function readAll(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const hash = createHash("sha256");
    req.on("data", (c: Buffer) => hash.update(c));
    req.on("end", () => {
      resolve(hash.digest("hex"));
    });
    req.on("error", () => {
      resolve(hash.digest("hex"));
    });
  });
}

function bodyDone(req: http.IncomingMessage): Promise<void> {
  if (req.readableEnded) return Promise.resolve();
  return new Promise((resolve) => {
    req.once("end", resolve);
    req.once("close", resolve);
    req.resume();
  });
}

function actorEvent(claims: Claims, type: string, payload: Record<string, unknown>, targetId: string): FakeAuditEvent {
  return {
    emitter: "proxy",
    event_type: type,
    tenant_id: claims.tenantId,
    actor_type: "agent",
    actor_id: claims.sub,
    target_type: "service",
    target_id: targetId,
    payload,
  };
}

function passedHeaders(req: http.IncomingMessage, host: string): Record<string, string> {
  const named = new Set(
    String(req.headers["connection"] ?? "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t !== ""),
  );
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (name === "authorization" || name === "host" || HOP_BY_HOP.has(name) || named.has(name)) continue;
    out[name] = Array.isArray(value) ? value.join(", ") : value;
  }
  out["host"] = host;
  return out;
}

async function handle(state: FakeState, req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const auth = req.headers["authorization"];
  if (typeof auth !== "string" || !auth.startsWith("Bearer ") || auth.length === 7) {
    req.resume();
    text(res, 401, "unauthorized: missing Bearer token");
    return;
  }
  const verdict = verifyToken(state, auth.slice(7));
  if ("text" in verdict) {
    req.resume();
    text(res, 401, verdict.text);
    return;
  }
  const claims = verdict.claims;

  const url = req.url ?? "/";
  const q = url.indexOf("?");
  const pathPart = q < 0 ? url : url.slice(0, q);
  const query = q < 0 ? "" : url.slice(q + 1);
  const slash = pathPart.indexOf("/", 1);
  const first = pathPart.slice(1, slash < 0 ? undefined : slash);
  const rest = slash < 0 ? "/" : pathPart.slice(slash);
  const method = req.method ?? "GET";

  const reject = async (status: number, body: string, event: FakeAuditEvent | null): Promise<void> => {
    const bodySha256 = await readAll(req);
    state.requests.push({ serviceId: first, method, host: "", path: rest, query, headers: {}, bodySha256, status, outcome: "rejected" });
    if (event !== null) await state.emit(event);
    if (body.startsWith("{")) json(res, status, body);
    else text(res, status, body);
  };
  const mismatch = (urlServiceId: string): FakeAuditEvent =>
    actorEvent(
      claims,
      "proxy.aud_mismatch_rejected",
      { jti: claims.jti, aud: claims.serviceId, url_service_id: urlServiceId, mode: "strict" },
      claims.serviceId,
    );

  if (!UUID.test(first)) {
    await reject(403, '{"error":"service not addressed"}', mismatch(""));
    return;
  }
  if (!Array.isArray(claims.aud) || claims.aud.length !== 1 || claims.aud[0] !== first) {
    await reject(403, '{"error":"scope mismatch"}', mismatch(first));
    return;
  }
  const key = credentialKey(claims.tenantId, first);
  const stored = state.credentials.get(key);
  const target = stored?.meta.targetUrl ?? state.credentialless.get(key);
  if (target === undefined) {
    await reject(502, "bad gateway: vault error", null);
    return;
  }

  const targetUrl = new URL(target);
  const headers = passedHeaders(req, targetUrl.host);
  const sent: Record<string, string> = { ...headers };
  const recorded: Record<string, string> = { ...headers };
  if (stored !== undefined) {
    const name = stored.meta.authScheme === "BEARER_TOKEN" ? "authorization" : (stored.meta.headerName ?? "").toLowerCase();
    sent[name] = stored.meta.authScheme === "BEARER_TOKEN" ? `Bearer ${stored.value.toString("latin1")}` : stored.value.toString("latin1");
    recorded[name] = "[credential]";
  }

  const mapped = state.upstreams.get(targetUrl.hostname.toLowerCase());
  let connectTo: { hostname: string; port: string } | null = null;
  if (mapped !== undefined) {
    const o = new URL(mapped);
    connectTo = { hostname: o.hostname, port: o.port };
  } else if (["127.0.0.1", "localhost", "[::1]"].includes(targetUrl.hostname)) {
    connectTo = { hostname: targetUrl.hostname.replace(/^\[|\]$/g, ""), port: targetUrl.port || "80" };
  }

  const hash = createHash("sha256");
  req.on("data", (c: Buffer) => hash.update(c));
  const started = performance.now();
  const finish = async (status: number): Promise<void> => {
    const outcome = status < 400 ? "allowed" : "error";
    const record: ForwardedRequest = {
      serviceId: first,
      method,
      host: targetUrl.host,
      path: rest,
      query,
      headers: recorded,
      bodySha256: hash.copy().digest("hex"),
      status,
      outcome,
    };
    state.requests.push(record);
    await state.emit(
      actorEvent(
        claims,
        status < 400 ? "proxy.hit" : "proxy.error",
        {
          jti: claims.jti,
          upstream_status: status,
          upstream_latency_ms: Math.max(0, Math.round(performance.now() - started)),
          outcome,
        },
        first,
      ),
    );
  };
  const unreachable = async (): Promise<void> => {
    req.resume();
    await bodyDone(req);
    await finish(502);
    text(res, 502, "bad gateway: upstream unreachable");
  };

  if (connectTo === null) {
    await unreachable();
    return;
  }

  const upReq = http.request({
    hostname: connectTo.hostname,
    port: connectTo.port,
    method,
    path: q < 0 ? rest : `${rest}?${query}`,
    headers: sent,
    agent: false,
  });
  let answered = false;
  res.on("close", () => {
    if (!res.writableFinished) upReq.destroy();
  });
  upReq.on("error", () => {
    if (answered) {
      res.destroy();
      return;
    }
    answered = true;
    unreachable().catch(() => res.destroy());
  });
  upReq.on("response", (upRes) => {
    answered = true;
    const status = upRes.statusCode ?? 502;
    const named = new Set(
      String(upRes.headers["connection"] ?? "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t !== ""),
    );
    const raw: string[] = [];
    for (let i = 0; i + 1 < upRes.rawHeaders.length; i += 2) {
      const name = upRes.rawHeaders[i] ?? "";
      const lower = name.toLowerCase();
      if (HOP_BY_HOP.has(lower) || named.has(lower)) continue;
      raw.push(name, upRes.rawHeaders[i + 1] ?? "");
    }
    res.writeHead(status, upRes.statusMessage, raw);
    // With a content-length the caller is complete at the last byte, so that chunk waits for the record.
    const declared = Number(upRes.headers["content-length"]);
    let remaining = Number.isInteger(declared) && declared >= 0 ? declared : -1;
    let held: Buffer | null = null;
    upRes.on("data", (c: Buffer) => {
      if (remaining >= 0) {
        remaining -= c.length;
        if (remaining <= 0) {
          held = c;
          return;
        }
      }
      if (!res.write(c)) {
        upRes.pause();
        res.once("drain", () => {
          upRes.resume();
        });
      }
    });
    upRes.on("end", () => {
      finish(status).then(
        () => res.end(held ?? undefined),
        () => res.destroy(),
      );
    });
    upRes.on("error", () => res.destroy());
  });
  req.on("error", () => upReq.destroy());
  req.pipe(upReq);
}

export function createProxyServer(state: FakeState): http.Server {
  return http.createServer((req, res) => {
    handle(state, req, res).catch(() => {
      if (!res.headersSent) text(res, 502, "bad gateway: upstream unreachable");
      else res.destroy();
    });
  });
}
