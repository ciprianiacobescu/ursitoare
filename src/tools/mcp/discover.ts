import type { IdSource } from "../../core/index.ts";
import { GatewayError, bodyDigest } from "../../gateway/index.ts";
import type { BrokerToken, Gateway, GatewayResponse } from "../../gateway/index.ts";
import { recordDecisionOwnTx, tenantEntity, userEntity } from "../../pdp/index.ts";
import type { Decision, Egress, PolicyEngine, PolicyRequest, PrincipalEntity } from "../../pdp/index.ts";
import type { TenantContext, TenantPool } from "../../tenancy/index.ts";
import type { McpCallSpec, ToolJson } from "../calls.ts";
import { ToolsError } from "../types.ts";
import type { ToolSurface } from "../types.ts";
import { mcpSurface } from "./surface.ts";
import type { McpExclusion, McpOverlay } from "./surface.ts";
import { MCP_LEGACY_VERSIONS, MCP_MODERN_VERSION, MCP_CLIENT_INFO, mcpBody, mcpHeaders, readMcpReply } from "./wire.ts";

export interface ServiceLookup {
  resolve(ctx: TenantContext, toolServerId: string): Promise<{ serviceId: string; origin: string } | null>;
}

export interface McpDiscoveryDeps {
  pool: TenantPool;
  policy: Pick<PolicyEngine, "check">;
  gateway: Gateway;
  services: ServiceLookup;
  ids: IdSource;
}

export interface McpDiscovery {
  surface: ToolSurface;
  era: "modern" | "legacy";
  protocolVersion: McpCallSpec["protocolVersion"];
  excluded: { name: string; reason: McpExclusion }[];
  decisionIds: string[];
}

const MAX_PAGES = 10;
const TOKEN_TTL_SECONDS = 60;
const SESSION_MESSAGE = "the MCP server needs a stateful session, which Ursitoare does not support yet";

export function discoveryRequest(ctx: TenantContext, principal: PrincipalEntity, egress: Egress): PolicyRequest {
  return {
    principal: userEntity(principal).uid,
    action: "register_tool_server",
    resource: tenantEntity(ctx.tenantId).uid,
    context: {},
    entities: [userEntity(principal), tenantEntity(ctx.tenantId)],
    egress,
  };
}

function refused(reason: string, extra: Record<string, string> = {}, message = "MCP discovery refused"): ToolsError {
  return new ToolsError("TOOLS_REFUSED", message, { reason, ...extra });
}

function failed(stage: string, status?: number): ToolsError {
  return refused("discovery_failed", status === undefined ? { stage } : { stage, status: String(status) });
}

function isSuccess(status: number): boolean {
  return status >= 200 && status <= 299;
}

function hasSession(response: GatewayResponse): boolean {
  return Object.keys(response.headers).some((key) => key.toLowerCase() === "mcp-session-id");
}

export async function discoverMcp(
  deps: McpDiscoveryDeps,
  ctx: TenantContext,
  input: { serverId: string; endpoint: string; principal: PrincipalEntity; overlay: McpOverlay },
): Promise<McpDiscovery> {
  const resolved = await deps.services.resolve(ctx, input.serverId);
  if (resolved === null) throw refused("credential_missing");
  const target: { serviceId: string; origin: string } = resolved;
  const host = new URL(target.origin).host;
  const runId = deps.ids.next("disc");
  const decisionIds: string[] = [];
  let attempt = 0;

  async function exchange(
    stage: string,
    method: string,
    params: { [key: string]: ToolJson },
    version: McpCallSpec["protocolVersion"],
    notification: boolean,
  ): Promise<{ response: GatewayResponse; id: number }> {
    attempt += 1;
    const id = attempt;
    const body = mcpBody(notification ? null : id, method, params, version);
    const egress: Egress = {
      method: "POST",
      host,
      path: input.endpoint,
      bodyDigest: bodyDigest(body),
      serviceId: target.serviceId,
      ttlSeconds: TOKEN_TTL_SECONDS,
    };
    const req = discoveryRequest(ctx, input.principal, egress);

    let decision: Decision;
    try {
      decision = await deps.policy.check(req);
    } catch {
      throw failed("policy");
    }
    const { permit, ...rest } = decision;
    const hasErrors = decision.errors.length > 0;
    const stored: Decision = hasErrors || decision.decision === "deny" ? { ...rest, decision: "deny" } : decision;
    let recorded: boolean;
    try {
      recorded = await recordDecisionOwnTx(deps.pool, ctx, stored, req);
    } catch {
      recorded = false;
    }
    if (!recorded) throw failed("decision");
    decisionIds.push(decision.decisionId);
    if (hasErrors || decision.decision !== "allow" || permit === undefined) {
      throw refused("discovery_denied", { decisionId: decision.decisionId });
    }

    const tag = { tenantId: ctx.tenantId, runId, nodeId: input.serverId, attempt };
    let token: BrokerToken;
    try {
      token = await deps.gateway.requestToken(permit, tag);
    } catch (error) {
      if (error instanceof GatewayError && error.code === "GATEWAY_UNAVAILABLE") throw error;
      throw failed("token");
    }
    let response: GatewayResponse;
    try {
      response = await deps.gateway.send(
        permit,
        {
          method: "POST",
          origin: target.origin,
          path: input.endpoint,
          headers: mcpHeaders(method, null, version, null),
          body,
        },
        token,
        tag,
      );
    } catch (error) {
      if (error instanceof GatewayError && error.code === "GATEWAY_UNAVAILABLE") throw error;
      throw failed("send");
    }
    return { response, id };
  }

  // server/discover decides the era
  let era: "modern" | "legacy";
  {
    const { response, id } = await exchange("discover", "server/discover", {}, MCP_MODERN_VERSION, false);
    const reply = readMcpReply(response, id);
    if (!reply.ok && reply.reason === "rpc_error" && reply.code === -32601) {
      era = "modern";
    } else if (
      !reply.ok &&
      reply.reason === "rpc_error" &&
      (reply.code === -32020 || reply.code === -32021 || reply.code === -32022)
    ) {
      throw refused("protocol_unsupported");
    } else if (!isSuccess(response.status)) {
      if (response.status === 401 || response.status === 403 || response.status < 400 || response.status >= 500) {
        throw failed("discover", response.status);
      }
      era = "legacy";
    } else if (!reply.ok) {
      throw failed("discover");
    } else {
      const versions = reply.result["supportedVersions"];
      if (!Array.isArray(versions) || !versions.includes(MCP_MODERN_VERSION)) throw refused("protocol_unsupported");
      era = "modern";
    }
  }

  let protocolVersion: McpCallSpec["protocolVersion"] = MCP_MODERN_VERSION;
  if (era === "legacy") {
    const first = MCP_LEGACY_VERSIONS[0] as McpCallSpec["protocolVersion"];
    const { response, id } = await exchange(
      "initialize",
      "initialize",
      { protocolVersion: first, capabilities: {}, clientInfo: MCP_CLIENT_INFO },
      first,
      false,
    );
    if (!isSuccess(response.status)) throw failed("initialize", response.status);
    if (hasSession(response)) throw refused("mcp_session_required", {}, SESSION_MESSAGE);
    const reply = readMcpReply(response, id);
    if (!reply.ok) throw failed("initialize");
    const answered = reply.result["protocolVersion"];
    const known = MCP_LEGACY_VERSIONS.find((v) => v === answered);
    if (known === undefined) throw refused("protocol_unsupported");
    protocolVersion = known;
    const ack = await exchange("initialized", "notifications/initialized", {}, protocolVersion, true);
    if (!isSuccess(ack.response.status)) throw failed("initialized", ack.response.status);
  }

  const tools: unknown[] = [];
  let cursor: string | null = null;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const params: { [key: string]: ToolJson } = cursor === null ? {} : { cursor };
    const { response, id } = await exchange("tools", "tools/list", params, protocolVersion, false);
    if (!isSuccess(response.status)) throw failed("tools", response.status);
    const reply = readMcpReply(response, id);
    if (!reply.ok) throw failed("tools");
    const listed = reply.result["tools"];
    if (!Array.isArray(listed)) throw failed("tools");
    tools.push(...listed);
    const next = reply.result["nextCursor"];
    if (typeof next !== "string" || next === "") break;
    if (page === MAX_PAGES) throw refused("too_many_tools");
    cursor = next;
  }

  const { surface, excluded } = mcpSurface(tools, { endpoint: input.endpoint, protocolVersion }, input.overlay);
  return { surface, era, protocolVersion, excluded, decisionIds };
}
