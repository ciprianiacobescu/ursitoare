# Test plan for add-policy-deploy (part 1: fixtures, migration, arguments, validation)

Part 2: `test-plan-runtime.md`. **Ran** on 2026-11-06 in a scratch copy (design.md § Verification) as assertions, with a hand port of U49's compiler. **Derived, not run:** the real compiler's texts (no literal version contains a grant).

Each test file declares its helpers.

## Constants

- `T` = `tenant_a`, `U` = `tenant_b`, `W` = `tenant_c` (inserted by the owner pool). `CLOCK` = `fixedClock("2026-11-06T09:00:00.000Z")`, `LATER` and `LATER2` = the same day at `10:00` and `11:00`; `AT`, `AT2`, `AT3` = those instants as `"2026-11-06T09:00:00.000000Z"` etc. `G(n)` = `"grant_00000000-0000-7000-8000-" + n.toString(16).padStart(12, "0")`. `FP1` = `"nf1_" + "a1".repeat(32)`, `FP2` = `"nf1_" + "b2".repeat(32)`. `CAROL` = `{ kind: "user", id: "carol" }`.
- `SRCDIR`: a new empty temporary directory, so the platform layer alone is the base; `VBASE` = `599ac6e140250949aa9104d2e02c0da35508a8ec6227aa6cd452187caf2efdd8` is the `policySetVersion` of `createPolicyEngine({ srcDir: SRCDIR })`. `runtime(pool)` = `createPolicyRuntime({ pool, srcDir: SRCDIR, clock: CLOCK, ids: sequentialIds(1000), logger })`.
- `ACME`, imported with `importCatalogue` (actor `CAROL`) into T and U (`OTHER` also into U):

```json
{ "acme.lookup_vendor@1": { "effect": "read", "input": { "type": "object", "properties": { "vendor_name": { "type": "string" }, "limit": { "type": "integer" }, "exact": { "type": "boolean" }, "tags": { "type": "array", "items": { "type": "string" } } } }, "output": { "type": "object" } },
  "acme.create_payment@1": { "effect": "pay", "input": { "type": "object", "properties": { "vendor_id": { "type": "string" }, "amount": { "type": "number" }, "currency": { "type": "string" } } }, "output": { "type": "object" } } }
```

`OTHER` = `acme.other@1`, `read`, `input` `{ type: "object", properties: { limit: { type: "number" } } }`. `ARGT` = `{ amount: "decimal", currency: "String", exact: "Bool", limit: "Long", tags: "Set<String>", vendor_id: "String", vendor_name: "String" }`.
- `seedGrant(ctx, g)`: an `INSERT INTO ursitoare."grant"` (columns: delivered-shapes.md) in `withTenantTx(db.appPool, ctx, …)` with `created_by` `carol`, `created_at` `2026-11-06T09:00:00Z` (a revoked row: `revoked_by` `carol`, `revoked_at` `…09:30:00Z`); `revoke(ctx, id)` is the matching `UPDATE`. `seedSet(ctx, version, src, toolArgs)`: `UPDATE ursitoare.policy_set SET current = false WHERE current`, then an `INSERT` with `source` `src`, `tenant_sources` `[{ id: "tenant/source", text: src }]`, `tool_args`, `current` true, `deploy_seq` the tenant's maximum plus 1 (1 for none), `deployed_at` `2026-11-06T09:00:00Z`. `runtime(pool)` uses a capturing logger.
- `invoke(tenant, user, roles, node, tool, effect, fp, args, opts?)` builds an `invoke_tool` `PolicyRequest`: principal `userEntity({ tenantId: tenant, userId: user, kind: "human", roles, teams: [] })`; resource `Block::"<bt>/pay-run/<node>"` (`bt` = `opts.blockTenant` or `tenant`) with `Flow`, `Team` and `Tool::<toolId>` entities (`toolId` = `opts.toolId` or `<tenant>/<tool>`); the `InvokeToolContext` with empty `taint`, `sod_excluded`, `approvals`, `approvers_by_role` and `node_fingerprint: fp`. `L` = `invoke(T, "alice", ["author"], "lookup", "acme.lookup_vendor@1", "read", "", {})`; `P(amount, fp, approved?)` = `invoke(T, "alice", ["author"], "pay", "acme.create_payment@1", "pay", fp, { amount: toDecimal(amount) })`, with `approvers_by_role` `{ approver: [entityRef("User", "tenant_a/bob")] }` when `approved`. `dec(d)` = `[d.decision, d.reasons, d.errors, d.policySetVersion]`.
- Sources (one trailing newline): `SRC_R` = `@id("t-a-read-all")⏎permit (principal, action == Action::"invoke_tool", resource is Block)⏎when { context.tool.effect == "read" };`; `SRC_S` = the same with id `t-b-send` and `"send"`; `SRC_A1` = `SRC_R`, a blank line, then `@id("t-pay-needs-approval")⏎forbid (principal, action == Action::"invoke_tool", resource)⏎when { context.tool == Tool::"tenant_a/acme.create_payment@1" && context.args has "amount" && context.args["amount"].greaterThan(decimal("1000.0000")) && !(context.approvers_by_role has "approver" && !context.approvers_by_role.approver.isEmpty()) };`.

## Migration (`0495_policy_sets.sql`, verbatim)

```sql
CREATE TABLE ursitoare.policy_set (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  deploy_seq bigint NOT NULL CHECK (deploy_seq >= 1),
  version text NOT NULL CHECK (version ~ '^[0-9a-f]{64}$'),
  source text NOT NULL CHECK (char_length(source) <= 65536),
  grant_ids text[] NOT NULL DEFAULT '{}' CHECK (cardinality(grant_ids) <= 500),
  tenant_sources jsonb NOT NULL CHECK (jsonb_typeof(tenant_sources) = 'array'),
  tool_args jsonb NOT NULL CHECK (jsonb_typeof(tool_args) = 'object'),
  current boolean NOT NULL,
  deployed_by text NOT NULL,
  deployed_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, deploy_seq));
CREATE UNIQUE INDEX policy_set_current_idx ON ursitoare.policy_set (tenant_id) WHERE current;
ALTER TABLE ursitoare.policy_set ENABLE ROW LEVEL SECURITY;
ALTER TABLE ursitoare.policy_set FORCE ROW LEVEL SECURITY;
CREATE POLICY policy_set_isolation ON ursitoare.policy_set USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare.policy_set TO ursitoare_app;
GRANT UPDATE (current) ON TABLE ursitoare.policy_set TO ursitoare_app;
```

Ledger row `{ version: 495, name: "policy_sets" }`; `checkTenancyCatalog(db.ownerPool)` `[]`; `has_table_privilege` for `ursitoare_app`: SELECT and INSERT `true`, UPDATE and DELETE `false`; `has_column_privilege` UPDATE: `current` `true`, `source` `false`. With `V1`, `V2` = 64 × `a`, `b`, the app role runs in `withTenantTx` (other columns: `source` `''`, `grant_ids` `{}`, `tenant_sources` `[]`, `tool_args` `{}`, `deployed_by` `carol`), in order:
1. T `deploy_seq` 1 `V1` current at `2026-11-06T09:00:00Z`: ok. T `deploy_seq` 2 `V2` current at `…T10:00:00Z`: `23505` (second current row).
2. T `deploy_seq` 2 `V2` not current at `…T10:00:00Z`: ok; again: `23505` (primary key `(tenant_id, deploy_seq)`). T `deploy_seq` 3 `V2` not current at the same `…T10:00:00Z`: ok (version and instant are plain columns). T `deploy_seq` 4 `V1` not current at `…T10:00:00Z`: ok. U `deploy_seq` 1 `V1` current: ok.
3. Rows that violate a check, each `23514`: `deploy_seq` 0; version `"xyz"`; 501 grant ids; `tenant_sources` `{}`; `tool_args` `[]`; a 65,537-character source.
4. A `tenant_b` row in T's transaction: `42501`. `UPDATE … SET source = 'x'` and `DELETE FROM ursitoare.policy_set`: `42501`.
5. `UPDATE … SET current = false WHERE current`, then T `deploy_seq` 5 `V1` current at `…T12:00:00Z`: ok, ok. `SELECT tenant_id, version` in U's transaction: one row, `tenant_b`, `V1`.

## toolArgTypes vectors

`D(props)` = a `read` block with `input` `{ type: "object", properties: props }`. `D1` = `D` of `vendor_name` string, `limit` integer, `exact` boolean, `tags` array of string; `D2` = `D` of `vendor_id` string, `amount` number, `currency` string; `D3` = `D` of `vendor_name`, `url`, `url_host`, `Bad`, `a-b`, `9x` (strings), `limit` number, `memo` `{ type: ["string","null"] }`, `nested` object, `nums` array of number; `D4` has `input` `{ type: "object" }`; `D5` has `properties: 5`; `D6` has `properties` `{ z: null, y: 5, w: { type: "string" } }`; `D7` = `D(JSON.parse('{"__proto__":{"type":"string"},"ok_name":{"type":"string"}}'))`; `D8` = `D` of 300 string properties `p000` to `p299`.

| input | result |
|---|---|
| `[]`; `[D1, D2]` | `{}`; `ARGT` (7 names) |
| `[D1, D2, D3]` | `ARGT` without `limit` (6 names; the other `D3` names are absent) |
| `[D4, D5, D6]`; `[D7]` | `{ w: "String" }`; `{ ok_name: "String" }` |
| `[D8]` | 256 names, first `p000`, last `p255` |

## toCedarArgs vectors (`toCedarArgs(args, ARGT)`; `dec(s)` = `{ __extn: { fn: "decimal", arg: s } }`)

| # | `args` | result |
|---|---|---|
| 1 | `{ vendor_name: "Acme", limit: 5, exact: true, tags: ["a","b"], amount: 1000.5, currency: "EUR", extra: 1, other: [1] }` | ok; `args` `{ amount: dec("1000.5000"), currency: "EUR", exact: true, limit: 5, tags: ["a","b"], vendor_name: "Acme" }`; `unconstrained` `["extra","other"]` |
| 2 | `{ amount: 5 }`, `{ amount: -3 }`, `{ amount: 922337203685477 }` | ok; `dec("5.0000")`, `dec("-3.0000")`, `dec("922337203685477.0000")` |
| 3 | `{ amount: 1.00001 }`, `{ amount: 0.30000000000000004 }`, `{ amount: 1e15 }` | `{ ok: false, arg: "amount", reason: "precision" }` × 3 |
| 4 | `{ url: "https://Api.Acme.test/x?y=1", vendor_name: "A" }`; `{ url: "mailto:x@y.test" }` | ok; `args` `{ url: "https://Api.Acme.test/x?y=1", url_host: "api.acme.test", vendor_name: "A" }`; `{ url: "mailto:x@y.test", url_host: "" }` |
| 5 | `{ url: "not a url" }`, `{ url: 5 }`; `{ url_host: "evil.test" }`, `{ amount: "5", url_host: "evil.test" }` | `{ ok: false, arg: "url", reason: "type" }` × 2; `{ ok: false, arg: "url_host", reason: "reserved" }` × 2 |
| 6 | `{ limit: 1.5 }`, `{ limit: "5" }`, `{ limit: 2 ** 53 }`, `{ tags: [1] }`, `{ tags: "a" }`, `{ exact: "true" }`, `{ vendor_name: null }` | `type` with `arg` `limit` × 3, `tags` × 2, `exact`, `vendor_name` |
| 7 | `[1]`; `null`; `"x"` | `{ ok: false, arg: "", reason: "type" }` × 3 |
| 8 | `{ zeta: 1, alpha: 2 }` | ok, `args` `{}`, `unconstrained` `["alpha","zeta"]` |
| 9 | `JSON.parse('{"__proto__":1,"constructor":2,"limit":3}')` | ok; `args` `{ limit: 3 }`; `unconstrained` `["__proto__","constructor"]`; the prototype of `args` is `Object.prototype`; `({}).limit` is `undefined` |

`SRC_ARGS` = `@id("t-args")⏎permit (principal, action == Action::"invoke_tool", resource is Block)⏎when { context.args has "url_host" && context.args["url_host"] == "api.acme.test" && context.args has "tags" && context.args["tags"].contains("a") && context.args has "amount" && context.args["amount"].greaterThan(decimal("999.0000")) };`, loaded by `createPolicyEngine({ srcDir: SRCDIR, tenantPolicies: [{ id: "tenant/source", layer: "tenant", text: SRC_ARGS }], toolArgs: ARGT, … })`. The `args` of `invoke(T, "alice", ["author"], "lookup", "acme.lookup_vendor@1", "read", "", …)` come from `toCedarArgs`: the input `{ url: "https://Api.Acme.test/x?y=1", tags: ["a","b"], amount: 1000.5, extra: 1 }` is allow, `["t-args"]`; the same with `amount: 999`, `{ amount: 922337203685477 }`, `{ amount: -922337203685477 }` and `{ url: "mailto:x@y.test" }` are deny, `[]`; every `errors` is `[]`.

## Validation vectors (scenario "Validation reports problems by stage")

Every problem is `{ stage, ids, message }`, `message` being `""` except for `parse` and `validate`. **Ran** (Cedar 4.14.0, empty `SRCDIR`): the messages below; row 7 on a hand-written grant text (**derived**). `a\u0000b` alone gives Cedar's `invalid token`, but the U+0000 check runs first.

Seeds: T has `ACME` and `G(0)` (role `author`, `acme.lookup_vendor@1`, any step), `G(1)` (user `bob`, same tool, `limit lte 50`), `G(2)` (role `author`, `acme.create_payment@1`, node `pay-run`/`pay`, `fingerprints` `[FP1]`, `amount lte 2000`), `G(3)` (role `auditor`, lookup, any step, revoked). Each row is `validatePolicySet(runtime(db.appPool), db.appPool, ctx, source)`; `VH` = `ok: true`, `problems: []`, a 64-hex `policySetVersion`.

| # | ctx | source | answer |
|---|---|---|---|
| 1 | T | `""`; `SRC_A1`; `"  \n"`; `"//" + "x".repeat(65534)` | `VH` × 4, the four versions distinct (the first is `VE`) |
| 2 | T | `permit (principal`; `@id("t-tpl")⏎permit (principal == ?principal, action, resource);`; `permit (principal, action == Action::"read_self", resource);` | `[{ stage: "parse", ids: ["tenant/source"], message: "unexpected end of input" }]`; `template`; `id` (same ids, `message: ""`) |
| 3 | T | id `platform-read-self` (`read_self` permit); id `t-dup` twice | `[{ stage: "policy", ids: ["platform-read-self"], message: "" }]`; `["t-dup"]` |
| 4 | T | the `read_self` permit with id `grant_x`, with id `G(0)`, with id `G(3)`; ids `platform-read-self` and `G(0)` together | `[{ stage: "reserved", ids: ["grant_x"], message: "" }]`; `["G(0)"]`; `["G(3)"]`; `[{ stage: "reserved", ids: ["G(0)"], message: "" }, { stage: "policy", ids: ["platform-read-self"], message: "" }]` |
| 5 | T | `@id("t-kind")⏎permit (principal, action == Action::"read_self", resource) when { principal.kind == "human" };`, then with `"приvet"` | `VH`; `[{ stage: "validate", ids: ["t-kind"], message: ``for policy `t-kind`, string `"???vet"` contains mixed scripts`` }] |
| 6 | T | `"a\u0000b"`; `"// \ud800"`; `"x".repeat(65537)` | `[{ stage: "parse", ids: ["tenant/source"], message: "the source holds U+0000 or a lone surrogate" }]` × 2; `[{ stage: "limit", ids: ["tenant/source"], message: "" }]` |
| 7 | U (`ACME`, `OTHER`), `G(10)` (author, lookup, `limit lte 5`) | `""` | `[{ stage: "validate", ids: ["G(10)"], message: ``for policy `G(10)`, policy is impossible: the policy expression evaluates to false for all valid requests`` }] (`limit` is `Long` and `decimal` in the two blocks, so it is dropped; `G(10)` in the message is the id text) |
| 8 | U, then `G(11)` (`vendor_name eq 'a"b'`) and `G(12)` (`vendor_name eq "a\\b"`) | `""` | `[{ stage: "compile", ids: ["G(11)", "G(12)"], message: "" }]` (only `compile`: `G(10)` still fails `validate`, but the engine is not loaded) |
| 9 | W (`ACME`), `G(100)` to `G(599)` active (author, lookup, any step); then `G(600)` | `""`; `""` | `VH`; `[{ stage: "limit", ids: ["grants"], message: "" }]` |

Afterwards `policy_set` has 0 rows in T, U and W and `listAuditEvents` for `policy.deployed` is empty. No record of the capturing logger holds `mixed scripts` or `приvet`. `validatePolicySet({ engine, toolArgs, reload }, …)` over an object literal rejects `TypeError` with message `not a policy runtime made by createPolicyRuntime`.

## Load diagnostic (scenario "A load failure carries the diagnostic outside details"; `src/pdp/load-diagnostic.test.ts`, no database, **derived, not run**)

`load(text)` = `loadPolicySet({ schema: buildSchema(), policies: [{ id: "t/s", layer: "tenant", text }] })`, the `PdpError` caught.

| # | call | `code`, `details`, `diagnostic` |
|---|---|---|
| 1 | `load("permit (principal")` | `PDP_POLICY_INVALID`, deep-equal `{ stage: "parse", ids: ["t/s"] }`, `"unexpected end of input"` |
| 2 | `load` of row 5's source above with `"приvet"` | `PDP_POLICY_INVALID`, deep-equal `{ stage: "validate", ids: ["t-kind"] }`, ``for policy `t-kind`, string `"приvet"` contains mixed scripts`` (unreduced) |
| 3 | `load` of the `template`, `id` and duplicate-id sources of rows 2 and 3 above; `new PdpError("PDP_OPTIONS_INVALID", "m")` | `undefined` for all four |

For rows 1 and 2 `message` holds neither diagnostic, `JSON.stringify(error)` holds neither text, `Object.keys(error)` lacks `diagnostic` and the property is non-enumerable; `new PdpError("PDP_POLICY_INVALID", "m", { stage: "parse", ids: [] }, "d").diagnostic` is `"d"`.
