import type { QueryResultRow } from "pg";
import type pg from "pg";

import { ROLE_APP } from "../db/index.ts";

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
  const app = await db.query<AppRoleRow>(
    "SELECT oid::text AS oid FROM pg_roles WHERE rolname = $1",
    [appRole],
  );
  const appOid = app.rows[0]?.oid ?? null;
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
