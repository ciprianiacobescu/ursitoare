import type { Clock } from "../../src/core/index.ts";
import {
  SESSION_COOKIE,
  createSession,
  issueCsrfToken,
  resolveSession,
  upsertUserFromClaims,
} from "../../src/identity/index.ts";
import { withTenantTx } from "../../src/tenancy/index.ts";
import type { TenantContext } from "../../src/tenancy/index.ts";
import type { TestDatabase } from "./pg.ts";

export async function createTestSession(
  db: TestDatabase,
  ctx: TenantContext,
  subject: string,
  clock: Clock,
): Promise<{ cookie: string; userId: string; csrfToken: string }> {
  const created = await withTenantTx(db.appPool, ctx, async (tx) => {
    const user = await upsertUserFromClaims(
      tx,
      ctx,
      { issuer: "https://idp.test", subject, name: subject },
      { clock },
    );
    const { sessionId } = await createSession(tx, ctx, { userId: user.userId }, { clock });
    return { userId: user.userId, sessionId };
  });

  const session = await resolveSession(db.appPool, created.sessionId, { clock });
  if (session === null) {
    throw new Error("the test session could not be resolved");
  }
  const csrfToken = await issueCsrfToken(db.appPool, session, { clock });

  return {
    cookie: `${SESSION_COOKIE}=${created.sessionId}`,
    userId: created.userId,
    csrfToken,
  };
}
