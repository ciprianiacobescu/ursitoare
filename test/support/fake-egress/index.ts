import type http2 from "node:http2";
import type net from "node:net";

import { createBrokerServer } from "./broker.ts";
import { generateSigningKey } from "./jwt.ts";
import { createProxyServer } from "./proxy.ts";
import { credentialKey, randomId, randomSecret } from "./state.ts";
import type { FakeState } from "./state.ts";
import { createVaultServer } from "./vault.ts";

export type FakeAuthScheme = "API_KEY_HEADER" | "BEARER_TOKEN";

export interface FakeVaultIdentity {
  identity: string;
  token: string;
  scopes: readonly ("vault.put" | "vault.read")[];
}

export interface FakeEgressOptions {
  now?: () => Date;
  auditSink?: string | null;
}

export interface IssuedToken {
  jti: string;
  serviceId: string;
  tenantId: string;
  agentId: string;
  ttlSeconds: number;
  issuedAt: number;
  expiresAt: number;
}

export interface ForwardedRequest {
  serviceId: string;
  method: string;
  host: string;
  path: string;
  query: string;
  headers: Readonly<Record<string, string>>;
  bodySha256: string;
  status: number;
  outcome: "allowed" | "error" | "rejected";
}

export interface StoredCredential {
  tenantId: string;
  serviceId: string;
  authScheme: FakeAuthScheme;
  headerName: string | null;
  targetUrl: string;
  keyVersion: number;
  callerActorId: string;
  identity: string;
}

export interface FakeAuditEvent {
  emitter: "broker" | "proxy";
  event_type: string;
  tenant_id: string;
  actor_type: string;
  actor_id?: string;
  target_type?: string;
  target_id?: string;
  payload: Record<string, unknown>;
}

export interface FakeEgress {
  readonly brokerUrl: string;
  readonly proxyUrl: string;
  readonly vaultUrl: string;
  readonly brokerServiceToken: string;
  readonly proxyServiceToken: string;
  readonly vaultAdmin: FakeVaultIdentity;
  readonly vaultProxy: FakeVaultIdentity;
  readonly vaultDenied: FakeVaultIdentity;
  addUpstream(host: string, origin: string): void;
  addCredentialless(serviceId: string, tenantId: string, targetUrl: string): void;
  credentials(): StoredCredential[];
  issued(): IssuedToken[];
  requests(): ForwardedRequest[];
  events(): FakeAuditEvent[];
  clearRecords(): void;
  close(): Promise<void>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);

function parseUrl(text: string): URL | null {
  try {
    return new URL(text);
  } catch {
    return null;
  }
}

function isOrigin(text: string): boolean {
  const url = parseUrl(text);
  return url !== null && (url.protocol === "http:" || url.protocol === "https:") && url.origin === text;
}

function isLoopbackHttpOrigin(text: string): boolean {
  const url = parseUrl(text);
  return url !== null && url.protocol === "http:" && LOOPBACK.has(url.hostname) && url.origin === text;
}

function listen(server: net.Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") reject(new Error("fake egress listener has no port"));
      else resolve(address.port);
    });
  });
}

export async function startFakeEgress(opts: FakeEgressOptions = {}): Promise<FakeEgress> {
  const { privateKey, publicJwk } = generateSigningKey();
  const brokerServiceToken = randomSecret();
  const proxyServiceToken = randomSecret();
  const identity = (name: string, scopes: FakeVaultIdentity["scopes"]): FakeVaultIdentity => ({
    identity: name,
    token: randomSecret(),
    scopes,
  });
  const vaultAdmin = identity("svcid_ursitoare_admin", ["vault.put", "vault.read"]);
  const vaultProxy = identity("svcid_proxy", ["vault.read", "vault.put"]);
  const vaultDenied = identity("svcid_email_proxy", []);

  const state: FakeState = {
    now: opts.now ?? ((): Date => new Date()),
    brokerServiceToken,
    proxyServiceToken,
    privateKey,
    publicJwk,
    kid: randomId("kid_"),
    vaultIdentities: [vaultAdmin, vaultProxy, vaultDenied],
    credentials: new Map(),
    credentialless: new Map(),
    upstreams: new Map(),
    issued: [],
    requests: [],
    events: [],
    async emit(event: FakeAuditEvent): Promise<void> {
      state.events.push(event);
      const sink = opts.auditSink ?? null;
      if (sink === null) return;
      const { emitter, ...body } = event;
      try {
        const res = await fetch(`${sink}/v1/internal/audit/emit`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-mintkey-service-token": emitter === "broker" ? brokerServiceToken : proxyServiceToken,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(2000),
        });
        await res.arrayBuffer();
      } catch {
        // a failing sink is ignored
      }
    },
  };

  const broker = createBrokerServer(state);
  const proxy = createProxyServer(state);
  const vault = createVaultServer(state);
  const sockets = new Set<net.Socket>();
  const sessions = new Set<http2.ServerHttp2Session>();
  for (const server of [broker, proxy]) {
    server.on("connection", (s: net.Socket) => {
      sockets.add(s);
      s.on("close", () => sockets.delete(s));
    });
  }
  vault.on("session", (s: http2.ServerHttp2Session) => {
    sessions.add(s);
    s.on("close", () => sessions.delete(s));
  });

  const ports = await Promise.all([listen(broker), listen(proxy), listen(vault)]);

  let closing: Promise<void> | undefined;
  return {
    brokerUrl: `http://127.0.0.1:${ports[0]}`,
    proxyUrl: `http://127.0.0.1:${ports[1]}`,
    vaultUrl: `http://127.0.0.1:${ports[2]}`,
    brokerServiceToken,
    proxyServiceToken,
    vaultAdmin,
    vaultProxy,
    vaultDenied,
    addUpstream(host: string, origin: string): void {
      const name = host.toLowerCase();
      if (!/^[^:/]+\.fake\.test$/.test(name) || name.startsWith(".")) {
        throw new TypeError('addUpstream: host must end with ".fake.test"');
      }
      if (!isLoopbackHttpOrigin(origin)) {
        throw new TypeError("addUpstream: origin must be an http origin on a loopback host");
      }
      state.upstreams.set(name, origin);
    },
    addCredentialless(serviceId: string, tenantId: string, targetUrl: string): void {
      if (!UUID.test(serviceId) || !UUID.test(tenantId)) {
        throw new TypeError("addCredentialless: ids must be lowercase UUIDs");
      }
      if (!isOrigin(targetUrl)) {
        throw new TypeError("addCredentialless: targetUrl must be an http or https origin");
      }
      state.credentialless.set(credentialKey(tenantId, serviceId), targetUrl);
    },
    credentials: (): StoredCredential[] => [...state.credentials.values()].map((e) => ({ ...e.meta })),
    issued: (): IssuedToken[] => state.issued.map((r) => ({ ...r })),
    requests: (): ForwardedRequest[] => state.requests.map((r) => ({ ...r, headers: { ...r.headers } })),
    events: (): FakeAuditEvent[] => structuredClone(state.events),
    clearRecords(): void {
      state.issued.length = 0;
      state.requests.length = 0;
      state.events.length = 0;
    },
    close(): Promise<void> {
      closing ??= new Promise<void>((resolve) => {
        let open = 3;
        const done = (): void => {
          open -= 1;
          if (open === 0) resolve();
        };
        broker.close(done);
        proxy.close(done);
        vault.close(done);
        for (const s of sockets) s.destroy();
        for (const s of sessions) s.destroy();
      });
      return closing;
    },
  };
}

export * from "./echo.ts";
export * from "./contract.ts";
