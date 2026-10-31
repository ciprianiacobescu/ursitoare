//	src/identity/admin/review-profile.ts
// Implements the review-profile switch of `add-admin-api` (design.md Decision 11).

import { appendAudit } from "../../audit/index.ts";
import type { ReviewProfile, TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { RbacActor } from "../rbac/names.ts";
import { auditActor } from "../rbac/names.ts";
import type { IdentityOptions } from "../users.ts";
import { adminError } from "./errors.ts";

export interface ReviewProfileWarning {
  code: "SOLO_TENANT_HAS_MANY_HUMANS";
  message: string;
  humanMembers: number;
}

export interface ReviewProfileChange {
  tenantId: string;
  reviewProfile: ReviewProfile;
  previous: ReviewProfile;
  changed: boolean;
  humanMembers: number;
  warning: ReviewProfileWarning | null;
}

const WARNING_CODE = "SOLO_TENANT_HAS_MANY_HUMANS" as const;

function requireProfile(value: ReviewProfile): ReviewProfile {
  if (value !== "solo" && value !== "team") throw adminError("ADMIN_INVALID");
  return value;
}

function soloWarning(humanMembers: number): ReviewProfileWarning {
  return {
    code: WARNING_CODE,
    message:
      `This solo tenant has ${humanMembers} active human members; ` +
      "each may review their own flows.",
    humanMembers,
  };
}

export async function setReviewProfile(
  tx: TenantTx,
  ctx: TenantContext,
  profile: ReviewProfile,
  actor: Extract<RbacActor, { userId: string }>,
  opts?: IdentityOptions,
): Promise<ReviewProfileChange> {
  const target = requireProfile(profile);
  const audit = auditActor(actor);
  const auditOpts = opts?.clock === undefined ? undefined : { clock: opts.clock };

  const locked = await tx.query<{ review_profile: ReviewProfile }>(
    `SELECT review_profile FROM ursitoare.tenant WHERE tenant_id = $1 FOR UPDATE`,
    [ctx.tenantId],
  );
  const row = locked.rows[0];
  if (row === undefined) throw adminError("ADMIN_NOT_FOUND");
  const previous = row.review_profile;

  const counted = await tx.query<{ n: string }>(
    `SELECT count(*) AS n FROM ursitoare."user"
     WHERE tenant_id = $1 AND kind = 'human' AND state = 'active'`,
    [ctx.tenantId],
  );
  const humanMembers = Number(counted.rows[0]?.n ?? "0");

  if (previous !== target) {
    await tx.query(
      `UPDATE ursitoare.tenant SET review_profile = $2 WHERE tenant_id = $1`,
      [ctx.tenantId, target],
    );
    await appendAudit(
      tx,
      ctx,
      {
        eventType: "identity.review_profile_changed",
        actor: audit,
        target: { kind: "tenant", id: ctx.tenantId },
        payload: { from: previous, to: target, humanMembers },
      },
      auditOpts,
    );
  }

  const warning =
    target === "solo" && humanMembers >= 2 ? soloWarning(humanMembers) : null;

  return {
    tenantId: ctx.tenantId,
    reviewProfile: target,
    previous,
    changed: previous !== target,
    humanMembers,
    warning,
  };
}
