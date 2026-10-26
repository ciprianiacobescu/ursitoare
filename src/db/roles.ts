import { createHash, createHmac, pbkdf2Sync, randomBytes } from "node:crypto";

import type pg from "pg";

import { DbError } from "./errors.ts";

export const ROLE_OWNER: string = "ursitoare_owner";

export const ROLE_APP: string = "ursitoare_app";

const PRINTABLE_ASCII = /^[\x20-\x7e]{1,512}$/;
const ROLE_ATTRIBUTES = "LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS";

type PasswordInput = string | { reveal(): string };

interface RolePasswords {
  ownerPassword?: PasswordInput;
  appPassword?: PasswordInput;
}

interface RoleSpec {
  name: string;
  password: string | undefined;
}

function invalidPassword(): never {
  throw new DbError("DB_INVALID", "invalid role password", { reason: "bad_password" });
}

function reveal(value: string | { reveal(): string }): string {
  return typeof value === "string" ? value : value.reveal();
}

function readPassword(value: PasswordInput | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const plain = reveal(value);
  if (!PRINTABLE_ASCII.test(plain)) {
    invalidPassword();
  }
  return plain;
}

function scramVerifier(password: string): string {
  const salt = randomBytes(16);
  const saltedPassword = pbkdf2Sync(password, salt, 4096, 32, "sha256");
  const clientKey = createHmac("sha256", saltedPassword).update("Client Key").digest();
  const storedKey = createHash("sha256").update(clientKey).digest();
  const serverKey = createHmac("sha256", saltedPassword).update("Server Key").digest();
  return `SCRAM-SHA-256$4096:${salt.toString("base64")}$${storedKey.toString("base64")}:${serverKey.toString("base64")}`;
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function sqlState(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const candidate = error as { code?: unknown; severity?: unknown };
  if (typeof candidate.code === "string" && typeof candidate.severity === "string") {
    return candidate.code;
  }
  return undefined;
}

function roleFailure(error: unknown): never {
  if (error instanceof DbError) {
    throw error;
  }
  const state = sqlState(error);
  if (state !== undefined) {
    throw new DbError("DB_ROLES_FAILED", "could not bootstrap the database roles", {
      sqlstate: state,
    });
  }
  throw new DbError("DB_UNAVAILABLE", "database unavailable", {
    reason: errorCode(error) ?? "unknown",
  });
}

function firstRow<T>(rows: T[]): T {
  const row = rows[0];
  if (row === undefined) {
    throw new DbError("DB_ROLES_FAILED", "could not bootstrap the database roles", {
      reason: "empty_result",
    });
  }
  return row;
}

async function formatStatement(client: pg.PoolClient, template: string, values: string[]): Promise<string> {
  const placeholders = values.map((_, index) => `$${index + 1}::text`).join(", ");
  const text = `SELECT format('${template}', ${placeholders}) AS sql`;
  const result = await client.query<{ sql: string }>(text, values);
  return firstRow(result.rows).sql;
}

async function roleExists(client: pg.PoolClient, name: string): Promise<boolean> {
  const result = await client.query<{ present: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1) AS present",
    [name],
  );
  return firstRow(result.rows).present;
}

async function writeRole(client: pg.PoolClient, spec: RoleSpec, exists: boolean): Promise<void> {
  const action = exists ? "ALTER" : "CREATE";
  const template =
    spec.password === undefined
      ? `${action} ROLE %I ${ROLE_ATTRIBUTES}`
      : `${action} ROLE %I ${ROLE_ATTRIBUTES} PASSWORD %L`;

  const values = spec.password === undefined ? [spec.name] : [spec.name, scramVerifier(spec.password)];
  const statement = await formatStatement(client, template, values);
  await client.query(statement);
}

async function revokeAppMemberships(client: pg.PoolClient): Promise<void> {
  const result = await client.query<{ role: string; grantor: string }>(
    `SELECT r.rolname AS role, g.rolname AS grantor
       FROM pg_auth_members m
       JOIN pg_roles r ON r.oid = m.roleid
       JOIN pg_roles g ON g.oid = m.grantor
      WHERE m.member = $1::regrole`,
    [ROLE_APP],
  );

  for (const membership of result.rows) {
    const statement = await formatStatement(
      client,
      "REVOKE %I FROM %I GRANTED BY %I",
      [membership.role, ROLE_APP, membership.grantor],
    );
    await client.query(statement);
  }
}

async function grantDatabasePrivileges(client: pg.PoolClient): Promise<void> {
  const connect = await client.query<{ sql: string }>(
    "SELECT format('GRANT CONNECT ON DATABASE %I TO %I, %I', current_database(), $1::text, $2::text) AS sql",
    [ROLE_OWNER, ROLE_APP],
  );
  await client.query(firstRow(connect.rows).sql);

  const create = await client.query<{ sql: string }>(
    "SELECT format('GRANT CREATE ON DATABASE %I TO %I', current_database(), $1::text) AS sql",
    [ROLE_OWNER],
  );
  await client.query(firstRow(create.rows).sql);
}

export async function ensureRoles(
  adminPool: pg.Pool,
  passwords: RolePasswords = {},
): Promise<{ created: string[] }> {
  const specs: RoleSpec[] = [
    { name: ROLE_OWNER, password: readPassword(passwords.ownerPassword) },
    { name: ROLE_APP, password: readPassword(passwords.appPassword) },
  ];

  let client: pg.PoolClient;
  try {
    client = await adminPool.connect();
  } catch (error) {
    throw new DbError("DB_UNAVAILABLE", "database unavailable", {
      reason: errorCode(error) ?? "unknown",
    });
  }

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('ursitoare:ensure_roles', 0))");

    const created: string[] = [];
    for (const spec of specs) {
      const exists = await roleExists(client, spec.name);
      await writeRole(client, spec, exists);
      if (!exists) {
        created.push(spec.name);
      }
    }

    await revokeAppMemberships(client);
    await grantDatabasePrivileges(client);
    await client.query("COMMIT");

    return { created };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    roleFailure(error);
  } finally {
    client.release();
  }
}
