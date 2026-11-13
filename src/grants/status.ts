import type { GrantRecord, GrantStatus } from "./types.ts";

/**
 * The status of a grant read against `latest`, the node's fingerprint in the
 * flow's newest validated version (`null` when there is none or the node is gone).
 */
export function grantStatus(grant: GrantRecord, latest: string | null): GrantStatus {
  if (grant.state === "revoked") return "revoked";
  if (grant.scope.kind === "node" && (latest === null || !grant.fingerprints.includes(latest))) {
    return "needs_reconfirm";
  }
  return "active";
}
