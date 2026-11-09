import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";

import type { ContractCheck } from "../fake-oidc/index.ts";
import { putCredential } from "./vault-client.ts";
import type { VaultPutInput } from "./wire.ts";

export interface EgressContractTarget {
  brokerUrl: string;
  proxyUrl: string;
  vaultUrl: string;
  brokerServiceToken: string;
  vaultAdmin: { identity: string; token: string };
  vaultDenied: { identity: string; token: string };
  tenantId: string;
  echo: { serviceId: string; targetUrl: string };
}

const SERVICE_TOKEN_HEADER = "x-mintkey-service-token";
const AGENT = "contract-agent";
const HEADER_NAME = "x-egress-contract-key";

type Answer = Readonly<{ status: number; headers: Map<string, string>; text: string }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function randomValue(): string {
  return `ec_${Array.from(randomBytes(12), (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

async function send(name: string, url: string, init: RequestInit): Promise<Answer> {
  let response: Response;
  try {
    response = await fetch(url, { redirect: "manual", ...init });
  } catch (cause) {
    assert.fail(`${name}: ${url} is unreachable or failed (${String(cause)})`);
  }
  let text: string;
  try {
    text = await response.text();
  } catch (cause) {
    assert.fail(`${name}: the body of ${url} failed to arrive (${String(cause)})`);
  }
  const headers = new Map<string, string>();
  for (const [key, value] of response.headers.entries()) headers.set(key, value);
  return { status: response.status, headers, text };
}

function jsonOf(name: string, text: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    assert.fail(`${name}: the body is not JSON (${text.slice(0, 120)})`);
  }
  assert.ok(isRecord(parsed), `${name}: the body is not a JSON object (${text.slice(0, 120)})`);
  return parsed as Record<string, unknown>;
}

function decodePart(name: string, part: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch (cause) {
    assert.fail(`${name}: the token part is not JSON (${String(cause)})`);
  }
  assert.ok(isRecord(parsed), `${name}: the token part is not a JSON object`);
  return parsed as Record<string, unknown>;
}

async function putRequest(
  name: string,
  vaultUrl: string,
  who: { identity: string; token: string },
  input: VaultPutInput,
): Promise<{ grpcStatus: number; grpcMessage: string; keyVersion: number | null }> {
  let answer: { grpcStatus: number; grpcMessage: string; keyVersion: number | null };
  try {
    answer = await putCredential(vaultUrl, who, input);
  } catch (cause) {
    assert.fail(`${name}: ${vaultUrl} is unreachable or failed (${String(cause)})`);
  }
  return answer;
}

export function egressContract(target: EgressContractTarget): ContractCheck[] {
  const { brokerUrl, proxyUrl, vaultUrl, brokerServiceToken, vaultAdmin, vaultDenied, tenantId, echo } = target;

  const baseBody = (serviceId: string, ttl: number): string =>
    JSON.stringify({ agent_id: AGENT, service_id: serviceId, tenant_id: tenantId, scope: "call", ttl_seconds: ttl });

  const issuePost = async (
    name: string,
    serviceId: string,
    ttl: number,
    tokenHeader: string | undefined,
  ): Promise<Answer> => {
    const headers: RequestInit["headers"] = tokenHeader === undefined ? {} : { [SERVICE_TOKEN_HEADER]: tokenHeader };
    return send(name, `${brokerUrl}/v1/issue`, {
      method: "POST",
      headers,
      body: baseBody(serviceId, ttl),
    });
  };

  const issueToken = async (name: string, serviceId: string, ttl: number): Promise<string> => {
    const answer = await issuePost(name, serviceId, ttl, brokerServiceToken);
    assert.equal(answer.status, 200, `${name}: the broker answered ${answer.status} (${answer.text.slice(0, 120)})`);
    const body = jsonOf(name, answer.text);
    const token = body["token"];
    assert.ok(typeof token === "string" && token.length > 0, `${name}: the answer has no token`);
    return token;
  };

  const putInput = (value: string, serviceId: string, targetUrl: string): VaultPutInput => ({
    tenantId,
    serviceId,
    authScheme: 1,
    value: Buffer.from(value, "utf8"),
    headerName: HEADER_NAME,
    callerActorId: AGENT,
    targetUrl,
  });

  return [
    {
      name: "issue needs the service token",
      run: async () => {
        const name = "issue needs the service token";
        const without = await issuePost(name, echo.serviceId, 60, undefined);
        assert.equal(
          without.status,
          401,
          `${name}: no token answered ${without.status} (${without.text.slice(0, 120)})`,
        );
        const body = jsonOf(name, without.text);
        assert.equal(body["mintkey:code"], "unauthenticated", `${name}: the refusal is not unauthenticated`);
        const corrupted = await issuePost(name, echo.serviceId, 60, `${brokerServiceToken}x`);
        assert.equal(corrupted.status, 401, `${name}: a corrupted token answered ${corrupted.status}`);
      },
    },
    {
      name: "issue returns a JWT for the service and tenant",
      run: async () => {
        const name = "issue returns a JWT for the service and tenant";
        const answer = await issuePost(name, echo.serviceId, 60, brokerServiceToken);
        assert.equal(answer.status, 200, `${name}: the broker answered ${answer.status} (${answer.text.slice(0, 120)})`);
        const body = jsonOf(name, answer.text);
        const token = body["token"];
        assert.ok(typeof token === "string" && token.length > 0, `${name}: the answer has no token`);
        const expiresAt = body["expires_at"];
        assert.ok(typeof expiresAt === "number", `${name}: the answer has no numeric expires_at`);
        const parts = token.split(".");
        assert.equal(parts.length, 3, `${name}: the token is not three parts`);
        const header = decodePart(name, parts[0] ?? "");
        const payload = decodePart(name, parts[1] ?? "");
        assert.equal(header["alg"], "EdDSA", `${name}: the token alg is not EdDSA`);
        const aud = payload["aud"];
        assert.ok(
          Array.isArray(aud) && aud.length === 1 && aud[0] === echo.serviceId,
          `${name}: the token audience is not the service (${JSON.stringify(aud)})`,
        );
        assert.equal(payload["iss"], "mintkey/broker", `${name}: the token issuer is not mintkey/broker`);
        assert.equal(payload["tenant_id"], tenantId, `${name}: the token tenant_id is not the tenant`);
        assert.equal(payload["sub"], AGENT, `${name}: the token sub is not the agent`);
        assert.equal(payload["exp"], expiresAt, `${name}: exp and expires_at differ`);
        const jti = payload["jti"];
        assert.ok(typeof jti === "string" && jti.length > 0, `${name}: the token has no jti`);
      },
    },
    {
      name: "issue enforces the TTL bounds",
      run: async () => {
        const name = "issue enforces the TTL bounds";
        for (const ttl of [0, 3600] as const) {
          const answer = await issuePost(name, echo.serviceId, ttl, brokerServiceToken);
          assert.equal(
            answer.status,
            200,
            `${name}: ttl_seconds ${ttl} answered ${answer.status} (${answer.text.slice(0, 120)})`,
          );
          jsonOf(name, answer.text);
        }
        for (const ttl of [3601, -1] as const) {
          const answer = await issuePost(name, echo.serviceId, ttl, brokerServiceToken);
          assert.equal(answer.status, 400, `${name}: ttl_seconds ${ttl} answered ${answer.status}`);
          const body = jsonOf(name, answer.text);
          assert.equal(body["mintkey:code"], "validation_failed", `${name}: the refusal is not validation_failed`);
        }
      },
    },
    {
      name: "vault put with the admin identity returns a key version",
      run: async () => {
        const name = "vault put with the admin identity returns a key version";
        const answer = await putRequest(name, vaultUrl, vaultAdmin, putInput(randomValue(), echo.serviceId, echo.targetUrl));
        assert.equal(
          answer.grpcStatus,
          0,
          `${name}: the vault answered grpc-status ${answer.grpcStatus} (${answer.grpcMessage})`,
        );
        assert.ok(
          typeof answer.keyVersion === "number" &&
            Number.isInteger(answer.keyVersion) &&
            answer.keyVersion >= 1,
          `${name}: key_version is not an integer of at least 1`,
        );
      },
    },
    {
      name: "vault put with a denied identity is refused",
      run: async () => {
        const name = "vault put with a denied identity is refused";
        const answer = await putRequest(
          name,
          vaultUrl,
          vaultDenied,
          putInput(randomValue(), randomUUID(), echo.targetUrl),
        );
        assert.equal(answer.grpcStatus, 7, `${name}: the denied put answered grpc-status ${answer.grpcStatus}`);
      },
    },
    {
      name: "proxy refuses a request without a bearer",
      run: async () => {
        const name = "proxy refuses a request without a bearer";
        const answer = await send(name, `${proxyUrl}/${echo.serviceId}/x`, { method: "GET" });
        assert.equal(answer.status, 401, `${name}: no bearer answered ${answer.status}`);
        assert.ok(answer.text.startsWith("unauthorized:"), `${name}: the refusal is not unauthorized (${answer.text.trim()})`);
      },
    },
    {
      name: "proxy refuses a token for another service",
      run: async () => {
        const name = "proxy refuses a token for another service";
        const token = await issueToken(name, echo.serviceId, 60);
        const answer = await send(name, `${proxyUrl}/${randomUUID()}/x`, {
          method: "GET",
          headers: { authorization: `Bearer ${token}` },
        });
        assert.equal(answer.status, 403, `${name}: a foreign audience answered ${answer.status}`);
      },
    },
    {
      name: "proxy forwards to the echo service with the injected header",
      run: async () => {
        const name = "proxy forwards to the echo service with the injected header";
        const value = randomValue();
        const put = await putRequest(name, vaultUrl, vaultAdmin, putInput(value, echo.serviceId, echo.targetUrl));
        assert.equal(put.grpcStatus, 0, `${name}: the vault provision answered grpc-status ${put.grpcStatus}`);
        const token = await issueToken(name, echo.serviceId, 60);
        const answer = await send(name, `${proxyUrl}/${echo.serviceId}/x?q=1`, {
          method: "GET",
          headers: { authorization: `Bearer ${token}` },
        });
        assert.equal(
          answer.status,
          200,
          `${name}: the proxy answered ${answer.status} (${answer.text.slice(0, 120)})`,
        );
        const seen = jsonOf(name, answer.text);
        assert.deepEqual(seen["path"], "/x", `${name}: the echo saw path ${JSON.stringify(seen["path"])}`);
        assert.deepEqual(seen["query"], "q=1", `${name}: the echo saw query ${JSON.stringify(seen["query"])}`);
        const headers = seen["headers"];
        assert.ok(isRecord(headers), `${name}: the echo answer has no headers`);
        assert.deepEqual(
          headers[HEADER_NAME],
          value,
          `${name}: the injected header was ${JSON.stringify(headers[HEADER_NAME])}`,
        );
        assert.ok(
          !Object.hasOwn(headers, "authorization"),
          `${name}: the caller authorization reached the upstream`,
        );
      },
    },
    {
      name: "proxy passes a redirect through",
      run: async () => {
        const name = "proxy passes a redirect through";
        const value = randomValue();
        const put = await putRequest(name, vaultUrl, vaultAdmin, putInput(value, echo.serviceId, echo.targetUrl));
        assert.equal(put.grpcStatus, 0, `${name}: the vault provision answered grpc-status ${put.grpcStatus}`);
        const token = await issueToken(name, echo.serviceId, 60);
        const answer = await send(name, `${proxyUrl}/${echo.serviceId}/redirect`, {
          method: "GET",
          headers: { authorization: `Bearer ${token}` },
        });
        assert.equal(answer.status, 302, `${name}: the proxy answered ${answer.status} (${answer.text.slice(0, 120)})`);
        const location = answer.headers.get("location");
        assert.ok(location !== undefined, `${name}: the 302 has no location`);
        assert.deepEqual(location, "/landing?from=echo", `${name}: the location was ${JSON.stringify(location)}`);
      },
    },
  ];
}
