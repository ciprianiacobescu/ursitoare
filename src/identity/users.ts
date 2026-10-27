// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { systemClock, systemIds } from "../core/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import { identityError } from "./errors.ts";
import { requireText } from "./text.ts";
import type { TenantContext, TenantTx } from "../tenancy/index.ts";

export type UserKind = "human" | "service";

export type UserState = "active" | "disabled";

export interface User {
  readonly userId: string;
  readonly kind: UserKind;
  readonly ownerUserId: string | null;
  readonly displayName: string;
  readonly email: string | null;
  readonly state: UserState;
}

export interface IdentityOptions {
  ids?: IdSource;
  clock?: Clock;
}

export interface TokenClaims {
  issuer: string;
  subject: string;
  email?: string | undefined;
  name?: string | undefined;
  preferredUsername?: string | undefined;
}

export interface UserPage {
  limit?: number | undefined;
  after?: string | undefined;
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

interface UserRow {
  user_id: string;
  kind: UserKind;
  owner_user_id: string | null;
  display_name: string;
  email: string | null;
  state: UserState;
}

function toUser(row: UserRow): User {
  return {
    userId: row.user_id,
    kind: row.kind,
    ownerUserId: row.owner_user_id,
    displayName: row.display_name,
    email: row.email,
    state: row.state,
  };
}

async function assertTenantMatches(tx: TenantTx, ctx: TenantContext): Promise<void> {
  const res = await tx.query<{ t: string | null }>("SELECT current_setting('app.tenant_id', true) AS t");
  if (res.rows[0]?.t !== ctx.tenantId) throw identityError("IDENTITY_TENANT_MISMATCH");
}

function optionalText(value: unknown, maxPoints?: number): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.isWellFormed() || value.includes("\u0000")) {
    throw identityError("IDENTITY_INVALID");
  }
  const trimmed = value.trim();
  if (maxPoints !== undefined && Array.from(trimmed).length > maxPoints) {
    throw identityError("IDENTITY_INVALID");
  }
  return trimmed === "" ? undefined : trimmed;
}

function displayValue(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const cut = Array.from(value).slice(0, 200).join("").trim();
  return cut === "" ? undefined : cut;
}

export async function upsertUserFromClaims(
  tx: TenantTx,
  ctx: TenantContext,
  claims: TokenClaims,
  opts?: IdentityOptions,
): Promise<User> {
  const ids = opts?.ids ?? systemIds;
  const clock = opts?.clock ?? systemClock;
  const issuer = requireText(claims.issuer, 2048);
  const subject = requireText(claims.subject, 512);
  const email = optionalText(claims.email, 320);
  const name = optionalText(claims.name);
  const preferred = optionalText(claims.preferredUsername);
  const nameValue = displayValue(name);

  await assertTenantMatches(tx, ctx);
  await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
    `ursitoare:idp_link:${ctx.tenantId}\n${issuer}\n${subject}`,
  ]);
  const link = await tx.query<{ user_id: string }>(
    "SELECT user_id FROM ursitoare.idp_link WHERE tenant_id = $1 AND issuer = $2 AND subject = $3",
    [ctx.tenantId, issuer, subject],
  );
  const now = clock.now();
  const linked = link.rows[0];
  if (linked === undefined) {
    const displayName =
      nameValue ?? displayValue(preferred) ?? displayValue(email) ?? displayValue(subject) ?? subject;
    const userId = ids.next("usr");
    await tx.query(
      `INSERT INTO ursitoare."user" (tenant_id, user_id, kind, owner_user_id, display_name, email, state, created_at, updated_at)
       VALUES ($1, $2, 'human', NULL, $3, $4, 'active', $5, $5)`,
      [ctx.tenantId, userId, displayName, email ?? null, now],
    );
    await tx.query(
      "INSERT INTO ursitoare.idp_link (tenant_id, issuer, subject, user_id, linked_at) VALUES ($1, $2, $3, $4, $5)",
      [ctx.tenantId, issuer, subject, userId, now],
    );
    return { userId, kind: "human", ownerUserId: null, displayName, email: email ?? null, state: "active" };
  }
  const found = await tx.query<UserRow>(
    `SELECT user_id, kind, owner_user_id, display_name, email, state FROM ursitoare."user"
     WHERE tenant_id = $1 AND user_id = $2`,
    [ctx.tenantId, linked.user_id],
  );
  const row = found.rows[0];
  if (row === undefined || row.state !== "active" || row.kind !== "human") {
    throw identityError("IDENTITY_USER_DISABLED");
  }
  const newName = nameValue !== undefined && nameValue !== row.display_name ? nameValue : undefined;
  const newEmail = email !== undefined && email !== row.email ? email : undefined;
  if (newName === undefined && newEmail === undefined) return toUser(row);
  const updated = {
    ...row,
    display_name: newName ?? row.display_name,
    email: newEmail ?? row.email,
  };
  await tx.query(
    `UPDATE ursitoare."user" SET display_name = $3, email = $4, updated_at = $5
     WHERE tenant_id = $1 AND user_id = $2`,
    [ctx.tenantId, row.user_id, updated.display_name, updated.email, now],
  );
  return toUser(updated);
}

export async function getUser(
  _tx: TenantTx,
  _ctx: TenantContext,
  _userId: string,
): Promise<User | null> {
  throw new Error("not implemented");
}

export async function listUsers(
  tx: TenantTx,
  ctx: TenantContext,
  page?: UserPage,
): Promise<{ users: User[]; next: string | null }> {
  const limit = page?.limit ?? 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw identityError("IDENTITY_INVALID");
  const after = page?.after;
  if (after !== undefined && (typeof after !== "string" || !ID_PATTERN.test(after))) {
    throw identityError("IDENTITY_INVALID");
  }
  await assertTenantMatches(tx, ctx);
  const params: unknown[] = [ctx.tenantId];
  let where = "tenant_id = $1";
  if (after !== undefined) {
    params.push(after);
    where += ' AND user_id COLLATE "C" > $2';
  }
  params.push(limit + 1);
  const res = await tx.query<UserRow>(
    `SELECT user_id, kind, owner_user_id, display_name, email, state FROM ursitoare."user"
     WHERE ${where} ORDER BY user_id COLLATE "C" LIMIT $${params.length}`,
    params,
  );
  const users = res.rows.slice(0, limit).map(toUser);
  const last = users[users.length - 1];
  return { users, next: res.rows.length > limit && last !== undefined ? last.userId : null };
}

export async function createServiceAccount(
  _tx: TenantTx,
  _ctx: TenantContext,
  _input: { displayName: string; ownerUserId: string },
  _opts?: IdentityOptions,
): Promise<User> {
  throw new Error("not implemented");
}
