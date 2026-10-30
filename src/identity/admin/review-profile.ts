// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ReviewProfile, TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { RbacActor } from "../rbac/names.ts";
import type { IdentityOptions } from "../users.ts";

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

export async function setReviewProfile(
  _tx: TenantTx,
  _ctx: TenantContext,
  _profile: ReviewProfile,
  _actor: Extract<RbacActor, { userId: string }>,
  _opts?: IdentityOptions,
): Promise<ReviewProfileChange> {
  throw new Error("not implemented");
}
