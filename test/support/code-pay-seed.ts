import type { Clock } from "../../src/core/index.ts";
import { upsertUserFromClaims } from "../../src/identity/index.ts";
import { createFlow, saveFlowVersion, validateVersion } from "../../src/registry/index.ts";
import type { TenantContext } from "../../src/tenancy/index.ts";
import { withTenantTx } from "../../src/tenancy/index.ts";
import { loadTestCatalogue } from "./catalogue/loader.ts";
import { CODE_PAY_TEXT } from "./code-pay.ts";
import type { TestDatabase } from "./pg.ts";

const SEED_ACTOR_ID = "code-pay-seed";
const SEED_CLAIMS = { issuer: "https://seed.test", subject: SEED_ACTOR_ID, name: SEED_ACTOR_ID };

export async function seedCodePay(
  db: TestDatabase,
  ctx: TenantContext,
  clock: Clock,
): Promise<string> {
  let validated = "";
  await withTenantTx(db.appPool, ctx, async (tx) => {
    const user = await upsertUserFromClaims(tx, ctx, SEED_CLAIMS, { clock });
    const flowActor = { kind: "user", userId: user.userId } as const;

    await createFlow(tx, ctx, { name: "code-pay", ownerTeam: "finance" }, flowActor, { clock });
    const saved = await saveFlowVersion(
      tx,
      ctx,
      { flowId: "code-pay", format: "yaml", text: CODE_PAY_TEXT },
      flowActor,
      { clock },
    );
    validated = saved.version.hash;
    await validateVersion(
      tx,
      ctx,
      { flowId: "code-pay", hash: validated, catalogue: loadTestCatalogue() },
      flowActor,
      { clock },
    );
  });
  return validated;
}
