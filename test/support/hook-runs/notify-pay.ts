import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { Flow } from "../../../src/authoring/index.ts";
import type { Clock } from "../../../src/core/index.ts";
import { upsertUserFromClaims } from "../../../src/identity/index.ts";
import type { LoadedVersion } from "../../../src/interpreter/index.ts";
import { createFlow, saveFlowVersion, validateVersion } from "../../../src/registry/index.ts";
import type { TenantContext } from "../../../src/tenancy/index.ts";
import { withTenantTx } from "../../../src/tenancy/index.ts";
import { parseCatalogueFlow } from "../catalogue/flows.ts";
import { loadTestCatalogue } from "../catalogue/loader.ts";
import type { TestDatabase } from "../pg.ts";

export const NOTIFY_PAY_HASH: string = "sha256:" + "b".repeat(64);

const SOFT_HASH = "sha256:" + "c".repeat(64);
const FLOW_PATH = fileURLToPath(new URL("./notify-pay.yaml", import.meta.url));
const SEED_ACTOR_ID = "mock-run-seed";
const SEED_CLAIMS = { issuer: "https://seed.test", subject: SEED_ACTOR_ID, name: SEED_ACTOR_ID };

function strictFlow(): Flow {
  return parseCatalogueFlow(readFileSync(FLOW_PATH, "utf8"), "notify-pay");
}

function softFlow(): Flow {
  const flow = strictFlow();
  const pay = flow.nodes["pay"];
  const hook = pay?.post?.[0];
  if (pay === undefined || hook === undefined || hook.kind !== "block") {
    throw new Error("notify-pay lost its block hook");
  }
  return {
    ...flow,
    flow: "notify-pay-soft",
    nodes: {
      ...flow.nodes,
      pay: { ...pay, post: [{ ...hook, on_error: "continue" }] },
    },
  } as Flow;
}

export function notifyPayVersion(variant: "strict" | "soft" = "strict"): LoadedVersion {
  const soft = variant === "soft";
  return {
    flowId: soft ? "notify-pay-soft" : "notify-pay",
    hash: soft ? SOFT_HASH : NOTIFY_PAY_HASH,
    state: "validated",
    ownerTeam: "finance",
    flow: soft ? softFlow() : strictFlow(),
  };
}

export async function seedNotifyPay(
  db: TestDatabase,
  ctx: TenantContext,
  clock: Clock,
): Promise<{ strict: string; soft: string }> {
  const hashes = { strict: "", soft: "" };
  await withTenantTx(db.appPool, ctx, async (tx) => {
    const user = await upsertUserFromClaims(tx, ctx, SEED_CLAIMS, { clock });
    const actor = { kind: "user", userId: user.userId } as const;
    for (const variant of ["strict", "soft"] as const) {
      const { flowId, flow } = notifyPayVersion(variant);
      await createFlow(tx, ctx, { name: flowId, ownerTeam: "finance" }, actor, { clock });
      const saved = await saveFlowVersion(
        tx,
        ctx,
        { flowId, format: "json", text: JSON.stringify(flow) },
        actor,
        { clock },
      );
      hashes[variant] = saved.version.hash;
      await validateVersion(
        tx,
        ctx,
        { flowId, hash: saved.version.hash, catalogue: loadTestCatalogue() },
        actor,
        { clock },
      );
    }
  });
  return hashes;
}
