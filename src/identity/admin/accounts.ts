import { appendAudit } from "../../audit/index.ts";
import { systemClock } from "../../core/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { RbacActor } from "../rbac/names.ts";
import { auditActor } from "../rbac/names.ts";
import type { IdentityOptions, User, UserKind, UserState } from "../users.ts";
import { createServiceAccount } from "../users.ts";
import { adminError } from "./errors.ts";

export interface AdminAccount extends User {
  roles: string[];
  teams: string[];
  localRoles: string[];
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MIN_LIMIT = 1;
const MAX_LIMIT = 200;
const STATES: readonly UserState[] = ["active", "disabled"];

interface UserRow {
  user_id: string;
  kind: UserKind;
  owner_user_id: string | null;
  display_name: string;
  email: string | null;
  state: UserState;
}

interface MembershipRow {
  user_id: string;
  role_id: string | null;
  team_id: string | null;
  source: string;
}

interface Memberships {
  roles: Set<string>;
  teams: Set<string>;
  localRoles: Set<string>;
}

async function assertTenantMatches(tx: TenantTx, ctx: TenantContext): Promise<void> {
  const result = await tx.query<{ t: string | null }>(
    "SELECT current_setting('app.tenant_id', true) AS t",
  );
  if (result.rows[0]?.t !== ctx.tenantId) throw adminError("ADMIN_TENANT_MISMATCH");
}

function requireUserId(value: unknown): string {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) throw adminError("ADMIN_INVALID");
  return value;
}

function requireKind(value: unknown): UserKind {
  if (value !== "human" && value !== "service") throw adminError("ADMIN_INVALID");
  return value;
}

function requireState(value: unknown): UserState {
  if (!STATES.includes(value as UserState)) throw adminError("ADMIN_INVALID");
  return value as UserState;
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

function emptyMemberships(): Memberships {
  return { roles: new Set(), teams: new Set(), localRoles: new Set() };
}

function toAccount(row: UserRow, memberships: Memberships): AdminAccount {
  return {
    ...toUser(row),
    roles: [...memberships.roles].sort(),
    teams: [...memberships.teams].sort(),
    localRoles: [...memberships.localRoles].sort(),
  };
}

async function readMemberships(
  tx: TenantTx,
  ctx: TenantContext,
  userIds: readonly string[],
): Promise<Map<string, Memberships>> {
  const byUser = new Map<string, Memberships>();
  if (userIds.length === 0) return byUser;
  const result = await tx.query<MembershipRow>(
    `SELECT user_id, role_id, team_id, source FROM ursitoare.membership
     WHERE tenant_id = $1 AND user_id = ANY($2::text[])`,
    [ctx.tenantId, [...userIds]],
  );
  for (const row of result.rows) {
    let memberships = byUser.get(row.user_id);
    if (memberships === undefined) {
      memberships = emptyMemberships();
      byUser.set(row.user_id, memberships);
    }
    if (row.role_id !== null) {
      memberships.roles.add(row.role_id);
      if (row.source === "local") memberships.localRoles.add(row.role_id);
    }
    if (row.team_id !== null) memberships.teams.add(row.team_id);
  }
  return byUser;
}

export async function getAccount(
  tx: TenantTx,
  ctx: TenantContext,
  userId: string,
  kind: UserKind,
): Promise<AdminAccount | null> {
  const id = requireUserId(userId);
  const accountKind = requireKind(kind);
  await assertTenantMatches(tx, ctx);
  const result = await tx.query<UserRow>(
    `SELECT user_id, kind, owner_user_id, display_name, email, state FROM ursitoare."user"
     WHERE tenant_id = $1 AND user_id = $2 AND kind = $3`,
    [ctx.tenantId, id, accountKind],
  );
  const row = result.rows[0];
  if (row === undefined) return null;
  const memberships = await readMemberships(tx, ctx, [row.user_id]);
  return toAccount(row, memberships.get(row.user_id) ?? emptyMemberships());
}

export async function listAccounts(
  tx: TenantTx,
  ctx: TenantContext,
  q: { kind: UserKind; state?: UserState | undefined; limit: number; after?: string | undefined },
): Promise<{ users: AdminAccount[]; next: string | null }> {
  const kind = requireKind(q.kind);
  const limit = q.limit;
  if (!Number.isInteger(limit) || limit < MIN_LIMIT || limit > MAX_LIMIT) {
    throw adminError("ADMIN_INVALID");
  }
  const state = q.state === undefined ? undefined : requireState(q.state);
  const after = q.after === undefined ? undefined : requireUserId(q.after);
  await assertTenantMatches(tx, ctx);

  const params: unknown[] = [ctx.tenantId, kind];
  let where = "tenant_id = $1 AND kind = $2";
  if (state !== undefined) {
    params.push(state);
    where += ` AND state = $${params.length}`;
  }
  if (after !== undefined) {
    params.push(after);
    where += ` AND user_id COLLATE "C" > $${params.length}`;
  }
  params.push(limit + 1);
  const result = await tx.query<UserRow>(
    `SELECT user_id, kind, owner_user_id, display_name, email, state FROM ursitoare."user"
     WHERE ${where} ORDER BY user_id COLLATE "C" LIMIT $${params.length}`,
    params,
  );
  const rows = result.rows.slice(0, limit);
  const memberships = await readMemberships(
    tx,
    ctx,
    rows.map((row) => row.user_id),
  );
  const users = rows.map((row) =>
    toAccount(row, memberships.get(row.user_id) ?? emptyMemberships()),
  );
  const last = users[users.length - 1];
  return {
    users,
    next: result.rows.length > limit && last !== undefined ? last.userId : null,
  };
}

export async function provisionServiceAccount(
  tx: TenantTx,
  ctx: TenantContext,
  input: { displayName: string; ownerUserId: string },
  actor: Extract<RbacActor, { userId: string }>,
  opts?: IdentityOptions,
): Promise<User> {
  const audit = auditActor(actor);
  const auditOpts = opts?.clock === undefined ? undefined : { clock: opts.clock };
  const user = await createServiceAccount(tx, ctx, input, opts);
  await appendAudit(
    tx,
    ctx,
    {
      eventType: "identity.service_account_created",
      actor: audit,
      target: { kind: "user", id: user.userId },
      payload: { ownerUserId: user.ownerUserId, displayName: user.displayName },
    },
    auditOpts,
  );
  return user;
}

export async function setAccountState(
  tx: TenantTx,
  ctx: TenantContext,
  input: { userId: string; kind: UserKind; state: UserState },
  actor: Extract<RbacActor, { userId: string }>,
  opts?: IdentityOptions,
): Promise<{ user: User; changed: boolean }> {
  const userId = requireUserId(input.userId);
  const kind = requireKind(input.kind);
  const state = requireState(input.state);
  const clock = opts?.clock ?? systemClock;
  const audit = auditActor(actor);
  const auditOpts = opts?.clock === undefined ? undefined : { clock: opts.clock };

  await assertTenantMatches(tx, ctx);
  const found = await tx.query<UserRow>(
    `SELECT user_id, kind, owner_user_id, display_name, email, state FROM ursitoare."user"
     WHERE tenant_id = $1 AND user_id = $2 AND kind = $3 FOR UPDATE`,
    [ctx.tenantId, userId, kind],
  );
  const row = found.rows[0];
  if (row === undefined) throw adminError("ADMIN_NOT_FOUND");
  if (state === "disabled" && actor.userId === userId) throw adminError("ADMIN_SELF_DISABLE");
  if (row.state === state) return { user: toUser(row), changed: false };

  const now = clock.now();
  await tx.query(
    `UPDATE ursitoare."user" SET state = $4, updated_at = $5
     WHERE tenant_id = $1 AND user_id = $2 AND kind = $3`,
    [ctx.tenantId, userId, kind, state, now],
  );
  await appendAudit(
    tx,
    ctx,
    {
      eventType: "identity.user_state_changed",
      actor: audit,
      target: { kind: "user", id: userId },
      payload: { from: row.state, to: state, kind },
    },
    auditOpts,
  );
  return { user: { ...toUser(row), state }, changed: true };
}
