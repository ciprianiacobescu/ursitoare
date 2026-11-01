# Delivered shapes taken by add-test-catalogue

The one name this change takes from merged code (proposal.md, "Interfaces taken"), copied from the code on main (main@3142c5f), with `file:line`. The code is the truth; this file only shows it to the readiness judge. The other names this change takes come from `add-flow-format-model` (written, not merged); they are restated in proposal.md and design.md from that change's own folder.

```ts
// add-roles-and-memberships (src/identity/rbac/names.ts, lines 8-13)
export const DEFAULT_ROLES: readonly string[] = [
  "tenant_admin",
  "author",
  "approver",
  "auditor",
];
// add-roles-and-memberships (src/identity/index.ts, lines 44-48): the re-export used by a test of this change
export {
  DEFAULT_ROLES,
  DEFAULT_BOOTSTRAP_ADMIN_GROUP,
  BOOTSTRAP_ADMIN_GROUP_ENV,
} from "./rbac/names.ts";
```

## Facts from the merged code

- The default role names are exactly four, in this order. `src/identity/rbac/names.ts:8-13`: `export const DEFAULT_ROLES: readonly string[] = [ "tenant_admin", "author", "approver", "auditor", ];`. The seed's `finance-approver` is not among them.
- A role id must match a pattern that forbids a hyphen, so the seed's roles `finance-clerk`, `finance-approver`, `support-agent`, `support-lead`, `ops-admin` and `sales-rep` cannot exist as roles. `src/identity/rbac/names.ts:19`: `const ROLE_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;`.
- The architecture import rules apply to files under `src/` only, so test-support code may import from `src/`. `test/arch/rules.ts:421`: `if (!file.path.startsWith("src/")) continue;` (inside `checkForbiddenImports`).
- Test code is type-checked with erasable syntax and exact optional properties. `tsconfig.json:10`: `"exactOptionalPropertyTypes": true,`; `tsconfig.json:13`: `"erasableSyntaxOnly": true,`; `tsconfig.json:23`: `"include": ["src/**/*.ts", "test/**/*.ts"],`.
- `test/support/README.md:15-16` already lists the two directories of this change: `` | `catalogue/` | `add-test-catalogue` | The 20 mock blocks, RF-1, `rf-1-core`, `rf-1-core-approval` | `` and `` | `hook-flows/` | `add-test-catalogue` | Synthetic hook flows on the M5 node kinds | ``.
