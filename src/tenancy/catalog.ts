import type { QueryResultRow } from "pg";
import type pg from "pg";

import { ROLE_APP, ROLE_OWNER } from "../db/index.ts";

export const CATALOG_GLOBAL_TABLES: readonly string[] = [
  "schema_migration",
  "tenant",
  "tenant_route",
];

export type CatalogRule =
  | "not_tenant_leading"
  | "unique_not_tenant_leading"
  | "fk_not_tenant_scoped"
  | "rls_not_enabled"
  | "rls_not_forced"
  | "no_tenant_policy"
  | "partition_open_to_app"
  | "view_open_to_app"
  | "route_table_open"
  | "definer_function_unsafe"
  | "app_role_missing"
  | "app_role_privileged"
  | "app_role_owns_relation";

export interface CatalogViolation {
  readonly rule: CatalogRule;
  readonly object: string;
}

interface ObjectRow extends QueryResultRow {
  object: string;
}

interface AppRoleRow extends QueryResultRow {
  oid: string | null;
  rolsuper: boolean;
  rolbypassrls: boolean;
}

interface FlagRow extends QueryResultRow {
  flag: boolean;
}

interface DefinerFunctionRow extends QueryResultRow {
  object: string;
  owner_ok: boolean;
  public_execute: boolean;
  proconfig: string[] | null;
}

const TENANT_PREDICATE = "(tenant_id = current_setting(''app.tenant_id''::text, true))";
const TENANT_PREDICATE_AND_PREFIX =
  "((tenant_id = current_setting(''app.tenant_id''::text, true)) AND ";

const CHECKED_TABLES = `
  SELECT c.oid,
         c.relname,
         c.relrowsecurity,
         c.relforcerowsecurity,
         a.attnum AS tenant_attnum
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_attribute a
      ON a.attrelid = c.oid
     AND a.attname = 'tenant_id'
     AND a.attnum > 0
     AND NOT a.attisdropped
   WHERE n.nspname = 'ursitoare'
     AND c.relkind IN ('r', 'p')
     AND NOT c.relispartition
     AND NOT (c.relname = ANY($1::text[]))`;

const NOT_TENANT_LEADING = `WITH checked AS (${CHECKED_TABLES})
SELECT format('ursitoare.%s', c.relname) AS object
  FROM checked c
  LEFT JOIN pg_constraint con
    ON con.conrelid = c.oid
   AND con.contype = 'p'
 WHERE (con.oid IS NOT NULL
        AND c.tenant_attnum IS NOT NULL
        AND con.conkey[1] = c.tenant_attnum) IS NOT TRUE`;

const UNIQUE_NOT_TENANT_LEADING = `WITH checked AS (${CHECKED_TABLES})
SELECT format('ursitoare.%s', ic.relname) AS object
  FROM checked c
  JOIN pg_index i
    ON i.indrelid = c.oid
   AND i.indisunique
   AND NOT i.indisprimary
  JOIN pg_class ic ON ic.oid = i.indexrelid
 WHERE (c.tenant_attnum IS NOT NULL AND i.indkey[0] = c.tenant_attnum) IS NOT TRUE`;

const FK_NOT_TENANT_SCOPED = `WITH checked AS (${CHECKED_TABLES})
SELECT format('ursitoare.%s', con.conname) AS object
  FROM checked c
  JOIN pg_constraint con
    ON con.conrelid = c.oid
   AND con.contype = 'f'
  LEFT JOIN pg_attribute ref
    ON ref.attrelid = con.confrelid
   AND ref.attname = 'tenant_id'
   AND ref.attnum > 0
   AND NOT ref.attisdropped
 WHERE c.tenant_attnum IS NULL
    OR array_position(con.conkey, c.tenant_attnum) IS NULL
    OR ref.attnum IS NULL
    OR con.confkey[array_position(con.conkey, c.tenant_attnum)] IS DISTINCT FROM ref.attnum`;

const RLS_NOT_ENABLED = `WITH checked AS (${CHECKED_TABLES})
SELECT format('ursitoare.%s', c.relname) AS object
  FROM checked c
 WHERE c.relrowsecurity IS NOT TRUE`;

const RLS_NOT_FORCED = `WITH checked AS (${CHECKED_TABLES})
SELECT format('ursitoare.%s', c.relname) AS object
  FROM checked c
 WHERE c.relforcerowsecurity IS NOT TRUE`;

const NO_TENANT_POLICY = `WITH checked AS (${CHECKED_TABLES}),
policies AS (
  SELECT c.oid,
         c.relname,
         pg_get_expr(p.polqual, p.polrelid) AS qual,
         pg_get_expr(p.polwithcheck, p.polrelid) AS with_check
    FROM checked c
    JOIN pg_policy p
      ON p.polrelid = c.oid
     AND p.polpermissive
   WHERE 0 = ANY(p.polroles)
      OR ($2::oid IS NOT NULL
          AND EXISTS (
            SELECT 1
              FROM unnest(p.polroles) AS r(role_oid)
             WHERE pg_has_role($2::oid, r.role_oid, 'MEMBER')))
),
assessed AS (
  SELECT oid,
         relname,
         ((qual IS NOT NULL OR with_check IS NOT NULL)
          AND (qual IS NULL
               OR qual = '${TENANT_PREDICATE}'
               OR starts_with(qual, '${TENANT_PREDICATE_AND_PREFIX}'))
          AND (with_check IS NULL
               OR with_check = '${TENANT_PREDICATE}'
               OR starts_with(with_check, '${TENANT_PREDICATE_AND_PREFIX}'))) AS ok
    FROM policies
)
SELECT format('ursitoare.%s', c.relname) AS object
  FROM checked c
  LEFT JOIN assessed v ON v.oid = c.oid
 GROUP BY c.oid, c.relname
HAVING count(v.oid) = 0
    OR bool_or(NOT v.ok)`;

const TABLE_PRIVILEGES =
  "SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER";
const COLUMN_PRIVILEGES = "SELECT,INSERT,UPDATE,REFERENCES";

const PRIVILEGED_RELATION = `(has_table_privilege($1::oid, c.oid, '${TABLE_PRIVILEGES}')
  OR has_any_column_privilege($1::oid, c.oid, '${COLUMN_PRIVILEGES}'))`;

const ROUTE_TABLE_OPEN = `
SELECT format('ursitoare.%s', c.relname) AS object
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'ursitoare'
   AND c.relname = 'tenant_route'
   AND ${PRIVILEGED_RELATION}`;

const PARTITION_OPEN_TO_APP = `
SELECT format('ursitoare.%s', c.relname) AS object
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'ursitoare'
   AND c.relispartition
   AND ${PRIVILEGED_RELATION}`;

const VIEW_OPEN_TO_APP = `
SELECT format('ursitoare.%s', c.relname) AS object
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'ursitoare'
   AND c.relkind IN ('v', 'm', 'f')
   AND NOT (c.relkind = 'v'
            AND c.reloptions IS NOT NULL
            AND ('security_invoker=true' = ANY(c.reloptions)
                 OR 'security_invoker=on' = ANY(c.reloptions)))
   AND ${PRIVILEGED_RELATION}`;

const DEFINER_FUNCTIONS = `
SELECT format('%I.%I(%s)', 'ursitoare', p.proname, pg_get_function_identity_arguments(p.oid)) AS object,
       p.proowner = $1::oid AS owner_ok,
       EXISTS (
         SELECT 1
           FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) AS a
          WHERE a.grantee = 0
            AND a.privilege_type = 'EXECUTE') AS public_execute,
       p.proconfig
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'ursitoare'
   AND p.prosecdef`;

const APP_ROLE_PRIVILEGED = `
SELECT (
  EXISTS (
    SELECT 1
      FROM pg_roles a
     WHERE a.oid = $1::oid
       AND (a.rolsuper OR a.rolbypassrls))
  OR EXISTS (
    SELECT 1
      FROM pg_roles o
     WHERE o.oid <> $1::oid
       AND (o.rolname = $2 OR o.rolsuper OR o.rolbypassrls)
       AND pg_has_role($1::oid, o.oid, 'MEMBER'))
) AS flag`;

const APP_ROLE_OWNS_RELATION = `
SELECT EXISTS (
  SELECT 1
    FROM pg_class c
   WHERE c.relowner = $1::oid) AS flag`;

const SEARCH_PATH_NAMES = new Set(["pg_catalog", "ursitoare", "pg_temp"]);

function searchPathIsSafe(proconfig: string[] | null): boolean {
  if (proconfig === null) {
    return false;
  }
  const entry = proconfig.find((item) => item.startsWith("search_path="));
  if (entry === undefined) {
    return false;
  }
  const names = entry
    .slice("search_path=".length)
    .split(",")
    .map((name) => name.trim());
  if (names.length === 0 || names[names.length - 1] !== "pg_temp") {
    return false;
  }
  return names.every((name) => SEARCH_PATH_NAMES.has(name));
}

function sortViolations(violations: CatalogViolation[]): CatalogViolation[] {
  return violations.sort((left, right) => {
    if (left.rule !== right.rule) {
      return left.rule < right.rule ? -1 : 1;
    }
    if (left.object !== right.object) {
      return left.object < right.object ? -1 : 1;
    }
    return 0;
  });
}

async function ruleViolations(
  db: Pick<pg.Pool, "query">,
  rule: CatalogRule,
  sql: string,
  params: unknown[],
): Promise<CatalogViolation[]> {
  const result = await db.query<ObjectRow>(sql, params);
  return result.rows.map((row) => ({ rule, object: row.object }));
}

export async function checkTenancyCatalog(
  db: Pick<pg.Pool, "query">,
  opts?: { appRole?: string; ownerRole?: string },
): Promise<CatalogViolation[]> {
  const appRole = opts?.appRole ?? ROLE_APP;
  const ownerRole = opts?.ownerRole ?? ROLE_OWNER;
  const app = await db.query<AppRoleRow>(
    "SELECT oid::text AS oid, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1",
    [appRole],
  );
  const appRow = app.rows[0];
  const appOid = appRow?.oid ?? null;
  const allowlist = [...CATALOG_GLOBAL_TABLES];

  const violations: CatalogViolation[] = [];
  violations.push(
    ...(await ruleViolations(db, "not_tenant_leading", NOT_TENANT_LEADING, [allowlist])),
  );
  violations.push(
    ...(await ruleViolations(db, "unique_not_tenant_leading", UNIQUE_NOT_TENANT_LEADING, [
      allowlist,
    ])),
  );
  violations.push(
    ...(await ruleViolations(db, "fk_not_tenant_scoped", FK_NOT_TENANT_SCOPED, [allowlist])),
  );
  violations.push(
    ...(await ruleViolations(db, "rls_not_enabled", RLS_NOT_ENABLED, [allowlist])),
  );
  violations.push(...(await ruleViolations(db, "rls_not_forced", RLS_NOT_FORCED, [allowlist])));
  violations.push(
    ...(await ruleViolations(db, "no_tenant_policy", NO_TENANT_POLICY, [allowlist, appOid])),
  );

  const owner = await db.query<AppRoleRow>(
    "SELECT oid::text AS oid, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1",
    [ownerRole],
  );
  const ownerOid = owner.rows[0]?.oid ?? null;

  const functions = await db.query<DefinerFunctionRow>(DEFINER_FUNCTIONS, [ownerOid]);
  for (const row of functions.rows) {
    if (!row.owner_ok || row.public_execute || !searchPathIsSafe(row.proconfig)) {
      violations.push({ rule: "definer_function_unsafe", object: row.object });
    }
  }

  if (appOid === null) {
    violations.push({ rule: "app_role_missing", object: appRole });
  } else {
    if (appRow !== undefined && (appRow.rolsuper || appRow.rolbypassrls)) {
      violations.push({ rule: "app_role_privileged", object: appRole });
    } else {
      const privileged = await db.query<FlagRow>(APP_ROLE_PRIVILEGED, [appOid, ownerRole]);
      if (privileged.rows[0]?.flag === true) {
        violations.push({ rule: "app_role_privileged", object: appRole });
      }
    }

    const owns = await db.query<FlagRow>(APP_ROLE_OWNS_RELATION, [appOid]);
    if (owns.rows[0]?.flag === true) {
      violations.push({ rule: "app_role_owns_relation", object: appRole });
    }

    violations.push(
      ...(await ruleViolations(db, "route_table_open", ROUTE_TABLE_OPEN, [appOid])),
    );
    violations.push(
      ...(await ruleViolations(db, "partition_open_to_app", PARTITION_OPEN_TO_APP, [appOid])),
    );
    violations.push(
      ...(await ruleViolations(db, "view_open_to_app", VIEW_OPEN_TO_APP, [appOid])),
    );
  }

  const seen = new Set<string>();
  const distinct: CatalogViolation[] = [];
  for (const violation of violations) {
    const key = `${violation.rule}\u0000${violation.object}`;
    if (!seen.has(key)) {
      seen.add(key);
      distinct.push(violation);
    }
  }

  return sortViolations(distinct);
}
