import { withTenantTx } from "../../tenancy/index.ts";
import { envelopeStore } from "../store/envelope-store.ts";
import type {
  PayloadValue,
  RunMode,
  TenantContext,
  TenantPool,
  TenantTx,
} from "../store/types.ts";
import { idemKey } from "./key.ts";
import {
  completeIntent,
  markIntentUnknown,
  recordIntent,
  type IntentRecord,
} from "./repository.ts";
import { assertAt, assertNodeId, assertTool } from "./validate.ts";

export interface IntentCall {
  tool: string;
  args: PayloadValue;
  nodeId: string;
  effectSeq: number;
  generation?: number;
}

export interface IntentContext {
  tenant: TenantContext;
  runId: string;
  lineageId: string;
  mode: RunMode;
  unsafeToRetry: boolean;
  now: Date;
}

export type IntentDecision =
  | { action: "invoke"; idemKey: string | null }
  | { action: "reuse"; idemKey: string; result: { output: PayloadValue } }
  | { action: "unknown"; idemKey: string };

export interface EffectIntents {
  before(call: IntentCall, ctx: IntentContext): Promise<IntentDecision>;
  after(call: IntentCall, ctx: IntentContext, result: { output: PayloadValue }): Promise<void>;
}

function assertCall(call: IntentCall): void {
  assertTool(call.tool);
  assertNodeId(call.nodeId);
}

function keyOf(call: IntentCall, ctx: IntentContext): string {
  return idemKey(ctx.tenant.tenantId, ctx.lineageId, call.nodeId, call.effectSeq, call.generation ?? 0);
}

async function decide(
  tx: TenantTx,
  record: IntentRecord,
  created: boolean,
  key: string,
  ctx: IntentContext,
): Promise<IntentDecision> {
  if (created) {
    return { action: "invoke", idemKey: key };
  }
  if (record.state === "unknown") {
    return { action: "unknown", idemKey: key };
  }
  if (record.state === "intent") {
    if (!ctx.unsafeToRetry) {
      return { action: "invoke", idemKey: key };
    }
    await markIntentUnknown(tx, ctx.tenant, key, ctx.now);
    return { action: "unknown", idemKey: key };
  }
  if (record.mode !== ctx.mode || record.resultRef === null) {
    return { action: "unknown", idemKey: key };
  }
  const stored = await envelopeStore.get(tx, ctx.tenant, record.resultRef);
  if (stored === null) {
    return { action: "unknown", idemKey: key };
  }
  return { action: "reuse", idemKey: key, result: { output: stored.data } };
}

export function createEffectIntents(pool: TenantPool): EffectIntents {
  return {
    async before(call, ctx) {
      assertCall(call);
      assertAt(ctx.now);
      const key = keyOf(call, ctx);

      return withTenantTx(pool, ctx.tenant, async (tx) => {
        const { record, created } = await recordIntent(
          tx,
          ctx.tenant,
          {
            idemKey: key,
            runId: ctx.runId,
            nodeId: call.nodeId,
            tool: call.tool,
            args: call.args,
            mode: ctx.mode,
          },
          ctx.now,
        );
        return decide(tx, record, created, key, ctx);
      });
    },

    async after(call, ctx, result) {
      assertCall(call);
      assertAt(ctx.now);
      const key = keyOf(call, ctx);

      await withTenantTx(pool, ctx.tenant, (tx) =>
        completeIntent(tx, ctx.tenant, key, result.output, ctx.now),
      );
    },
  };
}
