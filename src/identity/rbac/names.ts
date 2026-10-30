// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type RbacActor =
  | { kind: "user" | "service"; userId: string; roles: readonly string[] }
  | { kind: "operator"; name: string };

export const DEFAULT_ROLES: readonly string[] = [
  "tenant_admin",
  "author",
  "approver",
  "auditor",
];

export const DEFAULT_BOOTSTRAP_ADMIN_GROUP: string = "ursitoare-admins";

export const BOOTSTRAP_ADMIN_GROUP_ENV: string = "URSITOARE_BOOTSTRAP_ADMIN_GROUP";
