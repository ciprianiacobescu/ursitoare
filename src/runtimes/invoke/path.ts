import type { Catalogue, JsonValue } from "../../authoring/index.ts";
import type { ServiceTarget } from "../../credentials/index.ts";
import type { BrokerToken, CallTag, GatewayResponse } from "../../gateway/index.ts";
import { nodeFingerprint, toCedarArgs } from "../../grants/index.ts";
import { InterpreterError } from "../../interpreter/index.ts";
import type {
  Approval,
  LoadedVersion,
  StepContext,
  ToolCall,
  ToolInvoker,
  ToolResult,
} from "../../interpreter/index.ts";
import { recordDecisionOwnTx } from "../../pdp/index.ts";
import type { Decision, PrincipalEntity } from "../../pdp/index.ts";
import type { RunRecord } from "../../runs/index.ts";
import type { ToolBinding } from "../../tools/index.ts";
import { pdpApprovals, invokeToolRequest, toolRequest } from "./request.ts";
import type { InvokePath, InvokePathDeps } from "./types.ts";

type Authorization = Awaited<ReturnType<NonNullable<ToolInvoker["authorize"]>>>;

interface Authorised {
  binding: ToolBinding;
  target: ServiceTarget;
  args: ToolCall["args"];
}

interface Loaded {
  version: LoadedVersion | null;
  catalogue: Catalogue;
}

const ERROR_CODE = /^[A-Z][A-Z0-9_]{0,63}$/;

function denied(
  call: ToolCall,
  ctx: StepContext,
  reason: string,
  extra: Record<string, string> = {},
): InterpreterError {
  const details: Record<string, string> = { reason, ...extra };
  if (ctx.hook !== undefined) {
    details["hook"] = `${call.nodeId}:${ctx.hook.phase}:${ctx.hook.label}`;
  }
  return new InterpreterError(
    "INTERPRETER_TOOL_DENIED",
    `tool call of "${call.nodeId}" is not permitted (${reason})`,
    call.nodeId,
    details,
  );
}

function failed(
  call: ToolCall,
  details: Record<string, string> = { stage: "authorize" },
): InterpreterError {
  return new InterpreterError("INTERPRETER_TOOL_FAILED", "node execution failed", call.nodeId, details);
}

function codeOf(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && ERROR_CODE.test(code) ? code : "UNKNOWN";
}

export function createInvokePath(deps: InvokePathDeps): InvokePath {
  const authorised = new WeakMap<object, Authorised>();

  async function liveInvoker(run: RunRecord): Promise<ToolInvoker> {
    let loading: Promise<Loaded> | undefined;

    function loaded(ctx: StepContext): Promise<Loaded> {
      if (loading === undefined) {
        const attempt = Promise.all([
          deps.loadVersion(ctx.tenant, run.flowId, run.flowHash),
          deps.catalogueFor(ctx.tenant),
        ]).then(([version, catalogue]) => ({ version, catalogue }));
        loading = attempt;
        attempt.catch(() => {
          if (loading === attempt) loading = undefined;
        });
      }
      return loading;
    }

    async function authorize(call: ToolCall, ctx: StepContext): Promise<Authorization> {
      const look = async <T>(p: Promise<T>): Promise<T> => {
        try {
          return await p;
        } catch {
          throw failed(call);
        }
      };
      const tenantId = ctx.tenant.tenantId;

      const binding = await look(deps.tools.resolve(ctx.tenant, call.tool));
      if (binding === null) throw denied(call, ctx, "tool_unbound");
      if (binding.state === "pending") throw denied(call, ctx, "tool_unapproved");
      if (binding.state === "drifted") throw denied(call, ctx, "surface_drift");

      const target = await look(deps.services.resolve(ctx.tenant, binding.serverId));
      if (target === null) throw denied(call, ctx, "credential_missing");

      const approvals = (ctx as StepContext & { approvals?: readonly Approval[] }).approvals ?? [];
      const approverIds = new Set<string>();
      for (const approval of approvals) {
        if (approval.decision === "approved" && approval.approver !== null) {
          approverIds.add(approval.approver);
        }
      }
      const ids = [ctx.principal.userId, ...[...approverIds].filter((id) => id !== ctx.principal.userId)];
      const rolesOf = new Map<string, readonly string[]>();
      let initiator: PrincipalEntity | null = null;
      for (const id of ids) {
        const entity = await look(deps.principals(ctx.tenant, id));
        if (entity === null || entity.tenantId !== tenantId) {
          throw denied(call, ctx, "principal_unknown");
        }
        rolesOf.set(id, entity.roles);
        if (id === ctx.principal.userId) initiator = entity;
      }
      if (initiator === null) throw denied(call, ctx, "principal_unknown");

      const types = await look(deps.policy.toolArgs(tenantId));
      const cedar = toCedarArgs(call.args, types);
      if (!cedar.ok) throw denied(call, ctx, "args_unconvertible");

      const { version, catalogue } = await look(loaded(ctx));
      const fingerprint =
        version === null ? null : nodeFingerprint(version.flow, ctx.nodeId, catalogue);
      if (version === null || fingerprint === null) {
        throw denied(call, ctx, "fingerprint_unavailable");
      }

      const sent = toolRequest(binding, target, call.args, null);
      const req = invokeToolRequest({
        ctx,
        principal: initiator,
        binding,
        flow: { ownerTeam: version.ownerTeam },
        args: cedar.args,
        fingerprint,
        approvals: pdpApprovals(approvals, rolesOf, tenantId),
        egress: sent.egress,
      });

      let decision: Decision;
      try {
        decision = await deps.policy.engine.check(req);
      } catch (error) {
        throw denied(call, ctx, "policy_unavailable", { code: codeOf(error) });
      }

      const { permit, ...rest } = decision;
      const hasErrors = decision.errors.length > 0;
      const stored: Decision =
        hasErrors || decision.decision === "deny" ? { ...rest, decision: "deny" } : decision;
      const extra = { runId: ctx.runId, nodeId: ctx.nodeId };
      let recorded: boolean;
      try {
        recorded = await recordDecisionOwnTx(deps.pool, ctx.tenant, stored, req, extra);
      } catch {
        recorded = false;
      }
      if (!recorded) throw denied(call, ctx, "decision_unrecorded");

      if (hasErrors) {
        throw denied(call, ctx, "policy_error", {
          decisionId: decision.decisionId,
          errorCount: String(decision.errors.length),
        });
      }
      if (decision.decision !== "allow" || permit === undefined) {
        throw denied(call, ctx, "policy", { decisionId: decision.decisionId });
      }
      const authorization: Authorization = { decisionId: decision.decisionId, permit };
      authorised.set(authorization, { binding, target, args: call.args });
      return authorization;
    }

    async function invoke(call: ToolCall, ctx: StepContext): Promise<ToolResult> {
      const authorization = ctx.authorization;
      const known = authorization === undefined ? undefined : authorised.get(authorization);
      if (authorization === undefined || known === undefined) {
        throw denied(call, ctx, "unauthorized");
      }
      authorised.delete(authorization);

      const tag: CallTag = {
        tenantId: ctx.tenant.tenantId,
        runId: ctx.runId,
        nodeId:
          ctx.hook === undefined
            ? call.nodeId
            : `${call.nodeId}:${ctx.hook.phase}:${ctx.hook.label}`,
        attempt: ctx.attempt,
      };
      const sent = toolRequest(known.binding, known.target, known.args, ctx.idemKey);

      let token: BrokerToken;
      try {
        token = await deps.gateway.requestToken(authorization.permit, tag);
      } catch {
        throw failed(call, { stage: "token" });
      }

      let response: GatewayResponse;
      try {
        response = await deps.gateway.send(authorization.permit, sent.request, token, tag);
      } catch {
        throw failed(call, { stage: "send" });
      }

      if (response.status < 200 || response.status > 299) {
        throw failed(call, { stage: "upstream", status: String(response.status) });
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(new TextDecoder().decode(response.body));
      } catch {
        throw failed(call, { stage: "response", reason: "not_json" });
      }
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw failed(call, { stage: "response", reason: "not_json" });
      }
      return { output: parsed as Record<string, JsonValue> };
    }

    return {
      authorize,
      invoke,
    };
  }

  return { liveInvoker };
}
