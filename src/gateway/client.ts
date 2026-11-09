import type { EgressConfig } from "../config/index.ts";
import { isIssuedPermit } from "../pdp/index.ts";
import type { Permit } from "../pdp/index.ts";
import { bodyDigest } from "./digest.ts";
import { mintkeyTenantId } from "./tenant.ts";
import { GATEWAY_LIMITS, GatewayError } from "./types.ts";
import type {
  BrokerToken,
  CallTag,
  Gateway,
  GatewayDeps,
  GatewayResponse,
  OutboundRequest,
} from "./types.ts";

const SERVICE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TAG_PART_PATTERN = /^[A-Za-z0-9._:-]{1,256}$/;
const TOKEN_VALUE_PATTERN = /^[A-Za-z0-9._-]{1,8192}$/;
const TOKEN_TTL_SLACK_SECONDS = 30;
const HEADER_NAME_PATTERN = /^[a-z0-9!#$%&'*+.^_`|~-]+$/;
const FORBIDDEN_HEADERS = new Set([
  "authorization",
  "x-ursitoare-call",
  "host",
  "cookie",
  "proxy-authorization",
  "connection",
  "content-length",
  "transfer-encoding",
  "upgrade",
  "te",
  "trailer",
]);

interface TokenState {
  readonly jwt: string;
  used: boolean;
}

const tokenStates = new WeakMap<object, TokenState>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalid(reason: string): GatewayError {
  return new GatewayError("GATEWAY_INVALID", `gateway refused an invalid ${reason}`, { reason });
}

function unavailableToken(): GatewayError {
  return new GatewayError("GATEWAY_UNAVAILABLE", "gateway token request failed", { stage: "token" });
}

function unavailableSend(): GatewayError {
  return new GatewayError("GATEWAY_UNAVAILABLE", "gateway send failed", { stage: "send" });
}

function responseTooLarge(): GatewayError {
  return new GatewayError("GATEWAY_RESPONSE_TOO_LARGE", "gateway response is too large", {
    limit: String(GATEWAY_LIMITS.maxResponseBytes),
  });
}

async function readBounded(
  response: Response,
  limit: number,
  tooLarge: () => GatewayError,
): Promise<Uint8Array> {
  const declared = response.headers.get("content-length");
  if (declared !== null && /^[0-9]+$/.test(declared) && Number(declared) > limit) {
    await response.body?.cancel().catch(() => undefined);
    throw tooLarge();
  }

  if (response.body === null) return new Uint8Array(0);

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel().catch(() => undefined);
      throw tooLarge();
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function validTag(tag: CallTag): boolean {
  return (
    typeof tag.tenantId === "string" &&
    tag.tenantId.length >= 1 &&
    tag.tenantId.length <= 128 &&
    typeof tag.runId === "string" &&
    TAG_PART_PATTERN.test(tag.runId) &&
    typeof tag.nodeId === "string" &&
    TAG_PART_PATTERN.test(tag.nodeId) &&
    Number.isSafeInteger(tag.attempt) &&
    tag.attempt >= 1
  );
}

function mismatchField(permit: Permit, request: OutboundRequest): string | undefined {
  if (permit.method !== request.method) return "method";

  let host: string | undefined;
  try {
    host = new URL(request.origin).host;
  } catch {
    host = undefined;
  }
  if (host !== permit.host) return "host";

  if (permit.path !== request.path) return "path";
  if (permit.bodyDigest !== bodyDigest(request.body)) return "bodyDigest";
  return undefined;
}

function unsafePath(path: string): boolean {
  if (path.includes("#") || path.includes("\\")) return true;

  const pathPart = path.split("?")[0] ?? "";
  for (const segment of pathPart.split("/")) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      return true;
    }
    if (decoded === "." || decoded === "..") return true;
  }
  return false;
}

function unsafeHeaderValue(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f || code > 0xff) return true;
  }
  return false;
}

function unsafeHeaders(headers: Readonly<Record<string, string>>): boolean {
  for (const [name, value] of Object.entries(headers)) {
    if (FORBIDDEN_HEADERS.has(name.toLowerCase())) return true;
    if (!HEADER_NAME_PATTERN.test(name)) return true;
    if (unsafeHeaderValue(value)) return true;
  }
  return false;
}

export function createGateway(config: EgressConfig, deps: GatewayDeps): Gateway {
  async function requestToken(permit: Permit, tag: CallTag): Promise<BrokerToken> {
    if (!isIssuedPermit(permit)) {
      throw new GatewayError("GATEWAY_PERMIT_FOREIGN", "permit was not issued by this engine");
    }
    if (!validTag(tag)) throw invalid("tag");
    if (!SERVICE_ID_PATTERN.test(permit.serviceId)) throw invalid("service");

    const nowSeconds = Math.floor(deps.clock.now().getTime() / 1000);
    const body = JSON.stringify({
      agent_id: config.agentId,
      service_id: permit.serviceId,
      tenant_id: mintkeyTenantId(tag.tenantId),
      scope: "call",
      ttl_seconds: permit.ttlSeconds,
    });

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, GATEWAY_LIMITS.timeoutMs);
    const fetchImpl = deps.fetch ?? fetch;

    try {
      let response: Response;
      try {
        response = await fetchImpl(`${config.brokerUrl}/v1/issue`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-mintkey-service-token": config.brokerToken.reveal(),
          },
          body,
          redirect: "manual",
          signal: controller.signal,
        });
      } catch {
        throw unavailableToken();
      }

      if (response.status === 401 || response.status === 403) {
        throw new GatewayError("GATEWAY_TOKEN_REFUSED", "broker refused the service token", {
          status: String(response.status),
        });
      }
      if (response.status !== 200) throw unavailableToken();

      const bytes = await readBounded(response, GATEWAY_LIMITS.maxResponseBytes, unavailableToken);

      let parsed: unknown;
      try {
        parsed = JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        throw unavailableToken();
      }
      if (!isRecord(parsed)) throw unavailableToken();

      const jwt = parsed["token"];
      const expiresAt = parsed["expires_at"];
      if (typeof jwt !== "string" || !TOKEN_VALUE_PATTERN.test(jwt)) throw unavailableToken();
      if (typeof expiresAt !== "number" || !Number.isSafeInteger(expiresAt)) throw unavailableToken();
      if (expiresAt > nowSeconds + permit.ttlSeconds + TOKEN_TTL_SLACK_SECONDS) throw unavailableToken();

      const token = Object.freeze({ serviceId: permit.serviceId, expiresAt });
      tokenStates.set(token, { jwt, used: false });
      return token;
    } catch (error) {
      if (error instanceof GatewayError) throw error;
      throw unavailableToken();
    } finally {
      clearTimeout(timer);
    }
  }

  async function send(
    permit: Permit,
    request: OutboundRequest,
    token: BrokerToken,
    tag: CallTag,
  ): Promise<GatewayResponse> {
    if (!isIssuedPermit(permit)) {
      throw new GatewayError("GATEWAY_PERMIT_FOREIGN", "permit was not issued by this engine");
    }

    const field = mismatchField(permit, request);
    if (field !== undefined) {
      throw new GatewayError("GATEWAY_PERMIT_MISMATCH", "request does not match the permit", { field });
    }

    if (!validTag(tag)) throw invalid("tag");
    if (!SERVICE_ID_PATTERN.test(permit.serviceId)) throw invalid("service");
    if (unsafePath(request.path)) throw invalid("path");
    if (unsafeHeaders(request.headers)) throw invalid("header");

    if (token.serviceId !== permit.serviceId) throw invalid("token_service");
    const state = tokenStates.get(token);
    if (state === undefined || state.used) throw invalid("token_used");
    if (token.expiresAt <= Math.floor(deps.clock.now().getTime() / 1000)) throw invalid("token_expired");

    state.used = true;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, GATEWAY_LIMITS.timeoutMs);
    const fetchImpl = deps.fetch ?? fetch;

    try {
      let response: Response;
      try {
        response = await fetchImpl(`${config.proxyUrl}/${permit.serviceId}${request.path}`, {
          method: request.method,
          headers: {
            ...request.headers,
            authorization: `Bearer ${state.jwt}`,
            "x-ursitoare-call": callHeader(tag),
          },
          body: request.body,
          redirect: "manual",
          signal: controller.signal,
        });
      } catch {
        throw unavailableSend();
      }

      const headers: Record<string, string> = {};
      response.headers.forEach((value: string, name: string): void => {
        headers[name] = value;
      });
      const body = await readBounded(response, GATEWAY_LIMITS.maxResponseBytes, responseTooLarge);
      return { status: response.status, headers, body };
    } catch (error) {
      if (error instanceof GatewayError) throw error;
      throw unavailableSend();
    } finally {
      clearTimeout(timer);
    }
  }

  return { requestToken, send };
}

export function callHeader(tag: CallTag): string {
  return `${tag.runId}:${tag.nodeId}:${tag.attempt}`;
}
