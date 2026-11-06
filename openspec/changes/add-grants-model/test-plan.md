# Test plan for add-grants-model (part 1: fixtures, fingerprints, compiler, engine)

Part 2 (store, chain, routes, fragment): `test-plan-store.md`. **Ran** in a scratch copy of the worktree (main@cf34c628 plus the unit; Node 24.22.2; embedded Postgres): every value here and in part 2 as assertions. **Derived:** `augmentedSuccessors` and `hookPlacements` are throwing stubs on main (M5 implements them); the scratch used a port of `add-hook-checker` design 1 and 2.

Test-file conventions are in `tasks.md`.

## Constants

- `T` = `tenant_a`. `CLOCK` = `fixedClock("2026-11-06T09:00:00.000Z")`; `AT` = `"2026-11-06T09:00:00.000000Z"`. `G(n)` = `"grant_00000000-0000-7000-8000-" + n.toString(16).padStart(12, "0")`: `sequentialIds()` answers `G(0)`, `G(1)`, … to successive `ids.next("grant")` calls (a rolled-back call still uses its number).
- `ARGT` = `{ amount: "decimal", currency: "String", exact: "Bool", limit: "Long", tags: "Set<String>", vendor_id: "String", vendor_name: "String" }`.
- `H1`, `H2`: the `hash` that `saveFlowVersion` returns for `F1` and `F2` below (`sha256:` and 64 hex digits).

## ACME blocks (imported with `importCatalogue`, actor `{ kind: "user", id: "carol" }`)

```json
{ "acme.lookup_vendor@1": { "effect": "read", "input": { "type": "object", "properties": { "vendor_name": { "type": "string" }, "limit": { "type": "integer" }, "exact": { "type": "boolean" }, "tags": { "type": "array", "items": { "type": "string" } } }, "required": ["vendor_name"] },
    "output": { "type": "object", "properties": { "vendor_id": { "type": "string" } }, "required": ["vendor_id"] } },
  "acme.create_payment@1": { "effect": "pay", "input": { "type": "object", "properties": { "vendor_id": { "type": "string" }, "amount": { "type": "number" }, "currency": { "type": "string" } }, "required": ["vendor_id", "amount", "currency"] },
    "output": { "type": "object" } } }
```

## Fixture flows (both pass `validateFlowText` with these blocks and the default roles: L1-L3 `ok`)

`pay-after-approval` (`F1`; registry flow id `pay-run`):

```yaml
ursitoare: "0.1"
flow: pay-run
version: 1.0.0
inputs: { type: object, properties: { vendor_name: { type: string }, amount: { type: number } }, required: [vendor_name, amount] }
start: lookup
nodes:
  lookup: { kind: block, uses: acme.lookup_vendor@1, with: { vendor_name: "${{ inputs.vendor_name }}" }, next: approval }
  approval:
    kind: human.approval
    assignee_role: approver
    summary: "Pay ${{ inputs.amount }} to ${{ nodes.lookup.output.vendor_id }}?"
    timeout: PT48H
    cases: { approved: pay, rejected: stop, timeout: stop }
  pay:
    kind: block
    uses: acme.create_payment@1
    with: { vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ inputs.amount }}", currency: EUR }
    next: done
  done: { kind: end, status: completed }
  stop: { kind: end, status: failed }
```

`pay-before-approval` (`F2`) is `F1` with `lookup.next: pay`, `pay.next: approval`, `approval.summary: "Confirm the payment of ${{ inputs.amount }}?"` and `approval.cases: { approved: done, rejected: stop, timeout: stop }`.

## Migration `0490_grants.sql` (verbatim)

```sql
CREATE TABLE ursitoare."grant" (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  grant_id text NOT NULL CHECK (grant_id ~ '^grant_[A-Za-z0-9-]{1,64}$'),
  subject_kind text NOT NULL CHECK (subject_kind IN ('role', 'user')),
  subject_id text NOT NULL,
  tool text NOT NULL CHECK (char_length(tool) <= 128 AND tool ~ '^[a-z][a-z0-9._-]*@(0|[1-9][0-9]{0,8})$'),
  scope_kind text NOT NULL CHECK (scope_kind IN ('any_step', 'node')),
  flow_id text,
  node_id text,
  args jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(args) = 'array' AND jsonb_array_length(args) <= 8),
  fingerprints text[] NOT NULL DEFAULT '{}' CHECK (cardinality(fingerprints) = 0 OR array_to_string(fingerprints, ',') ~ '^nf1_[0-9a-f]{64}(,nf1_[0-9a-f]{64})*$'),
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'revoked')),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL,
  revoked_by text,
  revoked_at timestamptz,
  PRIMARY KEY (tenant_id, grant_id),
  CHECK ((scope_kind = 'any_step' AND flow_id IS NULL AND node_id IS NULL AND cardinality(fingerprints) = 0)
    OR (scope_kind = 'node' AND flow_id IS NOT NULL AND node_id IS NOT NULL AND cardinality(fingerprints) >= 1)),
  CHECK ((state = 'active' AND revoked_by IS NULL AND revoked_at IS NULL)
    OR (state = 'revoked' AND revoked_by IS NOT NULL AND revoked_at IS NOT NULL)));
ALTER TABLE ursitoare."grant" ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
CREATE POLICY grant_isolation ON ursitoare."grant"
  USING (tenant_id = current_setting('app.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare."grant" TO ursitoare_app;
GRANT UPDATE (fingerprints, state, revoked_by, revoked_at) ON TABLE ursitoare."grant" TO ursitoare_app;
```

`grant` is a reserved word in PostgreSQL: the table is always written `ursitoare."grant"`. Checks: `checkTenancyCatalog` is `[]`; for `ursitoare_app` SELECT and INSERT are true, UPDATE and DELETE false, column UPDATE true on `fingerprints` and `state`, false on `tool`; ledger row `{ version: 490, name: "grants" }`. Constraint rows (owner pool in `withTenantTx`, base row a valid any-step role grant), each `23514`: a `node` row without fingerprint; an `any_step` row with `'{nf1_aa}'`; a node row with `'{nf1_aa}'`; `revoked` without `revoked_by`; `grant_id` `g1`; nine `args`. The app role updating `tool`, deleting, or inserting a `tenant_b` row in tenant A's transaction: `42501`.

## Fingerprint vectors (`nodeFingerprint(canonicalizeFlow(doc), nodeId, catalog)`, `catalog` = the ACME blocks)

| node | `F1` | `F2` |
|---|---|---|
| lookup | `nf1_1cae325a646069b82abdada223d1db6ff74d04f95693980f847762c6d4cc8ea1` | same as `F1` |
| approval | `nf1_ff4578dbc61f634b272031a5d8df9388ba61b50f75a5cc5b3a48c23fe0bc23c5` | `nf1_bf70b7feafbd537096eccd66e90a11a8a769c0a766217aee42fde0a78a04c09b` |
| pay (`FPA` in `F1`, `FPB` in `F2`) | `nf1_f24d1bc261f70ccadd830e24b3acb40edec5066462531278c03adc516dfeb51d` | `nf1_20f87c5365e1cb05fe773dd9e4200d18670a144581e85b9f1c17918f7fda9868` |
| done | `nf1_721060bafd2c1a979aba6975861ba5cbdf2c6a3e112c92e697f25bed9d593f3b` | `nf1_4bc9acaeb10b7d914c898456306ab822f26fc402a6311993040dabbc48b1eb2d` |
| stop | `nf1_4bc9acaeb10b7d914c898456306ab822f26fc402a6311993040dabbc48b1eb2d` | same as `F1` |

The payload of `F1.pay` is `{"approvals":[{"assignee_role":"approver","id":"approval"}],"hooks":[],"kind":"block","predecessors":["approval"],"uses":"acme.create_payment@1","v":1,"values":[["with",{"amount":"${{ inputs.amount }}","currency":"EUR","vendor_id":"${{ nodes.lookup.output.vendor_id }}"}]]}`. Variants of `F1` (unnamed nodes keep their `F1` value):

- **Reversed keys:** `F1` as JSON text with every object's keys reversed: all five equal `F1`.
- **Unrelated rename:** `stop` renamed `halt` (`approval.cases.rejected` and `.timeout` set to `halt`): the four others and `halt` equal `F1` (`halt` = `F1.stop`).
- **Hook route:** `nodes.lookup.post = [{ id: "to_stop", kind: "code", source: "return {};", routes: ["stop"] }]` (L1-L3 accept it): `lookup` and `stop` (`predecessors` `["approval","lookup"]`) differ from `F1`.
- **Changed value:** `pay.with.amount` = `5000`: `pay` differs from `F1.pay`.
- **Pre-hook on `pay`:** `nodes.pay.pre = [{ id: "bump", kind: "code", source: "return { amount: 1 };" }]` (L1-L3 accept it): `pay` is `nf1_afe02f5e6199590af7aba0aa0c6ff1567c1a96d6d012e964e92e323eaa8ec383`, the hash of the `F1.pay` payload with `"hooks":[{"kind":"code","label":"bump","phase":"pre","source":"<sha256 of the source text>"}]`; the other four equal `F1`.
- **Pre-hook with a `when`:** `nodes.pay.pre = [{ id: "bump", kind: "code", source: "return { amount: 1 };", when: { from: { nodes: ["lookup"] } } }]` (derived: `lookup` is no predecessor of `pay`, so the hook cannot fire when the grant is confirmed, and L1-L3 and layer H accept the selector): `pay` is `nf1_bb5d8ea0e0e16c580bafed35001467496a515c08a06568603ab1dbd11d86cace`, the hash of the `F1.pay` payload with `"hooks":[{"kind":"code","label":"bump","phase":"pre","source":"3d9cf9f963ebfba508fb9664ff9004526a4708a06bc4e2bc13cb55ea9e41d71a","when":{"from":{"nodes":["lookup"]}}}]`; it differs from the same hook without `when` (`nf1_afe02f5e…`), so switching the condition changes the fingerprint and the grant needs a re-confirmation; the other four equal `F1`. Ran (`canonicalize` of `src/audit` on the payload rule above): the model gives `F1.pay` and the `nf1_afe02f5e…` value of the pre-hook vector exactly, and none of the other vectors of this plan carries a `when`, so no earlier hash changes.
- **Weaker approver:** `approval.assignee_role` = `author`: `lookup`, `approval` equal `F1`; `pay` is `nf1_af0274ed2b9b0dee1f626b8195d3e418c2f3757c33f83c347d1dcd8a20d446ef`; `done`, `stop` differ.
- **Flow rule:** `hooks = [{ id: "all_pay", match: { effect: ["pay"] }, pre: { id: "audit_note", kind: "code", source: "return {};" } }]`: `pay` is `nf1_bd9a7113cc9d4bf781bfb71495be6f1ff74940d35b719596d289dab70aa7cf5a` (label `rule.all_pay`), the others equal `F1`; the same rule with `match: { effect: ["read"], nodes: ["pay"] }` matches nothing.
- **Unreachable node:** `orphan` = `{ kind: block, uses: acme.lookup_vendor@1, with: { vendor_name: x }, next: done }` added: `orphan` equals `"nf1_"` + sha256 of `{"approvals":[],"hooks":[],"kind":"block","predecessors":[],"uses":"acme.lookup_vendor@1","v":1,"values":[["with",{"vendor_name":"x"}]]}`; `done` differs (new predecessor `orphan`), the rest equal `F1`.
- **Cycle:** `pay.next` = `lookup`: `lookup` is `nf1_8b3587087952550be9d324dcf70a8e4e3622f806ee413728b0bddfd6e1adf904` (`predecessors` `["pay"]`), `done` is `nf1_13814de2d7bceeeb6ceec91e1214c95f28ff3b67339bcb8aace17284d332e04c` (no node leads to it any more: `predecessors` and `approvals` `[]`), `pay` equals `F1.pay`.
- **Null:** `"nope"`, `"__proto__"` on `F1`; node `"a"` on `null`, `5`, `{ nodes: 5 }`.

## Compile vectors (`compileGrants("tenant_a", [g1..g4], ARGT)`)

Base record: active, `createdBy` `carol`, `fingerprints` `[]` unless stated; input order `[g4, g2, g1, g3]` (proves the sort). `g1` (role `author`, any step), `g2` (user `bob`; args `vendor_name eq "Acme"`, `limit lte 50`, `exact eq true`), `g3` (node `pay-run`/`pay`, `fingerprints` `[FPA]`; args `amount gte 10`, `amount lte 1000.5`) compile to these texts (`\n` between lines, no trailing newline):

```
@id("grant_1")
permit (principal in Role::"author", action == Action::"invoke_tool", resource is Block)
when { context.tool == Tool::"tenant_a/acme.lookup_vendor@1" };
```

```
@id("grant_2")
permit (principal == User::"tenant_a/bob", action == Action::"invoke_tool", resource is Block)
when { context.tool == Tool::"tenant_a/acme.lookup_vendor@1" && context.args has "vendor_name" && context.args["vendor_name"] == "Acme" && context.args has "limit" && context.args["limit"] <= 50 && context.args has "exact" && context.args["exact"] == true };
```

```
@id("grant_3")
permit (principal in Role::"author", action == Action::"invoke_tool", resource == Block::"tenant_a/pay-run/pay")
when { context.tool == Tool::"tenant_a/acme.create_payment@1" && ["nf1_f24d1bc261f70ccadd830e24b3acb40edec5066462531278c03adc516dfeb51d"].contains(context.node_fingerprint) && context.args has "amount" && context.args["amount"].greaterThanOrEqual(decimal("10.0000")) && context.args has "amount" && context.args["amount"].lessThanOrEqual(decimal("1000.5000")) };
```

- `g4`: role `auditor`, `acme.lookup_vendor@1`, any step, args `limit gte -3` and `limit eq 5`, `state` `revoked`, `revokedBy` `carol`, `revokedAt` `AT`.
- `g5` (types `{ limit: "Long", in: "String", exact: "Bool" }`): role `author`, `acme.lookup_vendor@1`, any step, args `limit gte -3`, `in eq "x y"`, `exact eq false`, `url eq "https://a.test/x"`: each constraint is `context.args has "<arg>" && context.args["<arg>"] <op> <value>` with `>= -3`, `== "x y"`, `== false`, `== "https://a.test/x"`. `in` is a Cedar keyword (ran: `true false if then else in is like has` fail bare and pass quoted).
- Results: ids `["grants/grant_1", "grants/grant_2", "grants/grant_3"]`, every `layer` `"tenant"`; `compileGrant(T, g4, ARGT)` `null`; `compileGrants(T, [], ARGT)` `[]`; `compileGrants("tenant_b", [g1], ARGT)` is the `g1` text with `tenant_b/acme.lookup_vendor@1` as tool id.

## Compile refusals (`GRANTS_INVALID`; base = a valid active `g1` with the change)

| change | `details` |
|---|---|
| tenant `tenant"a`; role `a"b`; user `a/b`; tool `x@1" \|\| true`; flow `Pay`; node `a-b`; fingerprint `nf1_aa`; id `grant_1") permit`; arg `A b` | `{ reason: "identifier", field }`, `field` `tenant`, `role`, `user`, `tool`, `flow`, `node`, `fingerprint`, `id`, `arg` |
| node scope, `fingerprints` `[]` | `{ reason: "no_fingerprint" }` |
| `limit eq` each of `a"b`, `a\b`, 257 × `x`, `é`, `a` + tab (256 × `x` compiles) | `{ reason: "value_invalid" }` |
| `limit lte "x"`; value `{}` | `{ reason: "arg_type" }` |
| `amount lte 1e15`; `limit lte 2**53`; `limit lte NaN` | `{ reason: "number_range" }` |
| `amount lte 1.00001` | `{ reason: "decimal_precision" }` |

Texts that compile but are not typed as written are the validator's: `createPolicyEngine` with `toolArgs` = the types given fails `PDP_POLICY_INVALID`, `details` `{ stage: "validate", ids: ["grant_2"] }`, for `g2` compiled with `ARGT` minus `vendor_name`, with `vendor_name` typed `Set<String>`, and with `limit` typed `String`.

## Engine decisions (scenario "Compiled grants decide like the grant says")

`createPolicyEngine({ srcDir: <the repo's src>, tenantPolicies: <the three sources>, toolArgs: ARGT, clock: CLOCK, ids: sequentialIds(), logger })` loads; its `policies` hold `grant_1`..`grant_3` (layer `tenant`). `invoke(user, roles, node, tool, effect, fp, args, toolId = "tenant_a/" + tool)` builds the request: principal `User::"tenant_a/<user>"` (`tenant` T, `kind` `"human"`, `roles` and parents the `Role::"<r>"`s, no teams), action `invoke_tool`, resource `Block::"tenant_a/pay-run/<node>"` (`{ tenant: T, kind: "block", flow: entityRef("Flow", "tenant_a/pay-run") }`) with its `Flow`, `Team` and `Tool::<toolId>` entities, and context `{ tool: entityRef("Tool", toolId), args, taint: [], run_initiator: entityRef("User", "tenant_a/<user>"), sod_excluded: [], approvals: [], approvers_by_role: {}, node_fingerprint: fp }`. `L` = `acme.lookup_vendor@1` (`read`), `P` = `acme.create_payment@1` (`pay`).

| # | call | decision, reasons |
|---|---|---|
| 1 | alice `[author]`, node `lookup`, `L`, no args | allow, `["grant_1"]` |
| 2 | bob `[approver]`, `lookup`, `L`, no args | deny, `[]` |
| 3 | bob, `lookup`, `L`, `{ vendor_name: "Acme", limit: 50, exact: true }` | allow, `["grant_2"]` |
| 4 | as 3 with `limit: 51` | deny |
| 5 | alice, `pay`, `P`, `FPA`, `{ amount: toDecimal(1000.5) }` | allow, `["grant_3"]` |
| 6 | as 5 with `toDecimal(1000.5001)`; with `toDecimal(9.9999)` | deny |
| 7 | as 5 with `FPB`, `toDecimal(10)` (the moved `pay`) | deny |
| 8 | as 5 on node `pay2`, `toDecimal(10)` | deny |
| 9 | as 5 with no `amount` | deny |
| 10 | dan `[auditor]`, `lookup`, `L`, `{ limit: 5 }` (`g4` is revoked) | deny, `[]` |
| 11 | as 1 with `toolId` `tenant_b/acme.lookup_vendor@1` | deny, `[]` |

Every `errors` is `[]`. With `g5` alone (types `{ limit: "Long", in: "String", exact: "Bool" }`, an empty srcDir): `{ limit: -2, in: "x y", exact: false, url: "https://a.test/x" }` allow; `limit: -4` deny; `exact: true` deny.
