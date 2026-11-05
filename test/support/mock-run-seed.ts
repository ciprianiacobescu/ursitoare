import type { Clock } from "../../src/core/index.ts";
import { upsertUserFromClaims } from "../../src/identity/index.ts";
import {
  createFlow,
  importCatalogue,
  saveFlowVersion,
  validateVersion,
} from "../../src/registry/index.ts";
import type { TenantContext } from "../../src/tenancy/index.ts";
import { withTenantTx } from "../../src/tenancy/index.ts";
import { loadTestCatalogue } from "./catalogue/loader.ts";
import { readCatalogueDocument } from "./catalogue/document.ts";
import { readTestFlowText } from "./catalogue/flows.ts";
import { payOnceCatalogue, payOnceVersion } from "./crash/pay-once.ts";
import type { TestDatabase } from "./pg.ts";

export interface MockRunSeed {
  validated: string;
  draft: string;
  llm: string;
}

const SEED_ACTOR_ID = "mock-run-seed";
const IMPORT_ACTOR = { kind: "system", id: SEED_ACTOR_ID } as const;
const SEED_CLAIMS = { issuer: "https://seed.test", subject: SEED_ACTOR_ID, name: SEED_ACTOR_ID };

export async function seedMockRunFlows(
  db: TestDatabase,
  ctx: TenantContext,
  clock: Clock,
): Promise<MockRunSeed> {
  const blocks = readCatalogueDocument().blocks;
  await importCatalogue(db.appPool, ctx, blocks, IMPORT_ACTOR, { clock });

  let validated = "";
  let draft = "";
  let llm = "";
  await withTenantTx(db.appPool, ctx, async (tx) => {
    const user = await upsertUserFromClaims(tx, ctx, SEED_CLAIMS, { clock });
    const flowActor = { kind: "user", userId: user.userId } as const;
    await tx.query(
      "INSERT INTO ursitoare.team (tenant_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [ctx.tenantId, "finance"],
    );

    await createFlow(tx, ctx, { name: "pay-once", ownerTeam: "finance" }, flowActor, {
      clock,
    });
    const flow = payOnceVersion().flow;
    const first = await saveFlowVersion(
      tx,
      ctx,
      { flowId: "pay-once", format: "json", text: JSON.stringify(flow) },
      flowActor,
      { clock },
    );
    validated = first.version.hash;
    await validateVersion(
      tx,
      ctx,
      { flowId: "pay-once", hash: validated, catalogue: payOnceCatalogue() },
      flowActor,
      { clock },
    );
    const second = await saveFlowVersion(
      tx,
      ctx,
      { flowId: "pay-once", format: "json", text: JSON.stringify({ ...flow, description: "draft" }) },
      flowActor,
      { clock },
    );
    draft = second.version.hash;

    await createFlow(tx, ctx, { name: "rf-1-core", ownerTeam: "finance" }, flowActor, {
      clock,
    });
    const third = await saveFlowVersion(
      tx,
      ctx,
      { flowId: "rf-1-core", format: "yaml", text: readTestFlowText("rf-1-core") },
      flowActor,
      { clock },
    );
    llm = third.version.hash;
    await validateVersion(
      tx,
      ctx,
      { flowId: "rf-1-core", hash: llm, catalogue: loadTestCatalogue() },
      flowActor,
      { clock },
    );
  });

  return { validated, draft, llm };
}
