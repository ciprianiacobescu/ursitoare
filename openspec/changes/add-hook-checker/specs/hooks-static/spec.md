## Purpose

Decide, before a run exists, which hooks wrap which node, where their routes lead, and whether the flow with its hook routes added is still a safe graph: the shared hook model, the static checker with its codes, and the `H` validation layer.

## ADDED Requirements

### Requirement: Node metas and selectors
`nodeMeta` SHALL describe a node as `{ id, kind, effect, tags }`, `selectorMatches` SHALL AND the `kind`, `effect`, `nodes` and `tags` fields of a selector against a meta, and `whenMatches` SHALL apply a hook's `when` to the previous node, the next node and the outcome.

#### Scenario: Metas and selectors
- **WHEN** `s09-onion` is loaded with `loadHookFlow`, the catalogue is `loadTestCatalogue()`, `pay` gets `tags: ["finance", "eu"]`, and `nodeMeta` is called for `pay`, `archive`, `approval`, `done`, `extract`, `__proto__`, `constructor`, `missing`, a node set to the number `5`, and `lookup_vendor` after its `uses` is set to `erp.unknown@1`
- **THEN** the results deep-equal, in order, `{ id: "pay", kind: "block", effect: "pay", tags: ["finance", "eu"] }` and, with the node's own id and `tags: []`, kind and effect `delegate`/`send` (`archive`), `human.approval`/`human` (`approval`), `end`/`none` (`done`), `llm.extract`/`read` (`extract`); then `null` four times, and `{ id: "lookup_vendor", kind: "block", effect: null, tags: [] }`; with `P` the `pay` meta, `selectorMatches` is `true` on `P` for `undefined`, `{}`, `{ effect: ["pay", "send"] }`, `{ kind: ["block"], effect: ["pay"] }`, `{ nodes: ["pay"] }` and `{ tags: ["eu", "zz"] }`, and `false` on `P` for `{ effect: ["read"] }`, `{ kind: ["block"], effect: ["read"] }`, `{ nodes: ["x"] }`, `{ tags: ["zz"] }`, `{ effect: [] }` and `{ kind: "block" }`; on `null` it is `false` for `{}` and `undefined`; on the unknown-block meta `false` for `{ effect: ["read"] }` and `true` for `{ kind: ["block"] }`

#### Scenario: when conditions
- **WHEN** `whenMatches` gets the metas of `lookup_vendor` (`LV`), `classify` (`CL`), `approval` (`AP`) and `pay` (`PA`) of `s09-onion`
- **THEN** it is `true` for `(undefined, null, null, null)` and `({}, null, null, null)`; for `{ from: { kind: ["block"] } }` `false` with `(null, PA, null)` and `true` with from `LV`; for `{ next: { effect: ["pay"] } }` `true` with `(LV, PA, null)` and `false` with next `null`; for `{ outcome: ["approved"] }` `true` with outcome `"approved"` and `false` with `"rejected"` or `null`; for `{ from: { kind: ["llm.decide"] }, next: { effect: ["human"] }, outcome: ["needs_review"] }` `true` with `(CL, AP, "needs_review")`, `false` with outcome `"reject"` and `false` with next `PA`

### Requirement: Hook placements follow the onion order
`hookPlacements` SHALL list the hooks that wrap a node as `pre` (matching flow rules in declaration order, then the node's own `pre`) and `post` (the node's own `post`, then matching flow rules in reverse declaration order), and SHALL place nothing on a node of `HOOKLESS_KINDS` or a `post` on an `end` node.

#### Scenario: Order, labels and exclusions
- **WHEN** `hookPlacements` is called for `pay`, `fetch_invoice`, `extract` and `done` of `s09-onion` (rules `rule_a`: effect `pay` or `send`, and `rule_b`: kind `block`, each with `pre` and `post`; `pay` has `pay_pre_note` and `pay_post_note`), then for `done`, `rejected`, `pay`, `agent_x`, `loop_x`, `form_x`, `sub_x`, `missing` and `__proto__` of a copy that adds the rule `all` (`match: {}`, a `pre` and a `post`) and the nodes `agent_x` (kind `agent` with a `pre`), `loop_x` (`foreach`), `form_x` (`human.form`) and `sub_x` (`subflow`)
- **THEN** in the original `pay` has `pre` labels `["rule.rule_a", "rule.rule_b", "pay_pre_note"]` with `ruleId` `["rule_a", "rule_b", null]` and `post` labels `["pay_post_note", "rule.rule_b", "rule.rule_a"]`, `fetch_invoice` has `pre` `["rule.rule_b"]` and `post` `["rule.rule_b"]`, `extract` and `done` have both lists empty; every placement has its `phase` and the same `hook` object as the flow; in the copy `done` and `rejected` have `pre` `["rule.all"]` and `post` `[]`, `pay` has `pre` `["rule.rule_a", "rule.rule_b", "rule.all", "pay_pre_note"]` and `post` `["pay_post_note", "rule.all", "rule.rule_b", "rule.rule_a"]`, and the other six ids have both lists empty

### Requirement: Hook routes extend the successor graph
`hookRoutes` SHALL return the routes of a node's `post` placements, `augmentedSuccessors` SHALL add them to the declared successors of every node, and `declaresHooks` SHALL say whether a document uses hooks at all.

#### Scenario: Routes, augmented successors and declaresHooks
- **WHEN** `hookRoutes` and `augmentedSuccessors` run on `s06-next-redirect`, `s14-unsafe-redirect` and `n-route-target`, and `declaresHooks` gets `{}`, `null`, `{ hooks: [] }`, `{ hooks: undefined }`, `{ nodes: { a: { post: [] } } }`, `{ nodes: { a: { pre: undefined } } }`, `{ nodes: { a: { kind: "end" } } }`, `m-h0`, `m-h1`, `rf-1-invoice-intake` and `s09-onion`
- **THEN** `hookRoutes(s06, "classify")` is `["approval"]`, and `[]` for `approval` and `nope`; the map of `s14` has its 11 node ids as keys in key order, `get("extract")` is `["lookup_vendor", "classify"]`, `get("fetch_invoice")` is `["extract"]`, `get("done")` is `[]`; `get("classify")` is `["pay", "approval", "notify_rejection"]` in `s06` (no repeat) and in `n-route-target` (`nowhere` is no node); `declaresHooks` is, in order, `false`, `false`, `true`, `false`, `true`, `false`, `false`, `false`, `true`, `false`, `true`

### Requirement: The checker reports each hook rule with its code
`checkHooks` SHALL return, sorted by `path`, `code` and `message`, the `H_*` errors and `W_NO_MATCH` warnings of a document, each with layer `"H"`, the wrapped node id (or `null` for a rule-level or graph problem) and a JSON Pointer path, without reading `ursitoare`. A hook with `max_retries` SHALL be judged by the node's own effect and by the effects of its `post` block hooks, rules included (a retry restarts the post chain, not the pre-hooks): `pay` in that scope refuses the retry always, `write`, `send` or an unknown effect requires `allow_effect_retry: true`.

#### Scenario: The 45 hook flows
- **WHEN** `checkHooks(loadHookFlow(name), loadTestCatalogue())` runs for every `name` of `hookFlowNames()` (45 names; never `validateFlow`: they say `0.2-draft`)
- **THEN** the 15 flows named in `test-plan.md` § The 45 hook flows (`n-block`, `n-dominance-hook`, `n-no-match`, `n-retry-scope`, `n-retry-scope-human`, `n-route-self`, `n-route-target`, `n-schema`, `n-schema-routes-pre`, `s14-unsafe-redirect`, `s14c-cycle`, `s18d-routes-on-human`, `x1a-retry-pay`, `x1b-retry-raise`, `x3-gate-bypass`) each give exactly the rows listed there, and the other 30 give `{ errors: [], warnings: [] }`

#### Scenario: Effect routes and effect retries
- **WHEN** `checkHooks` runs on the parsed case files `h-route-effect-x3` (a post hook on `lookup` with `routes: [pay]`) and `h-retry-scope-pay` (a post hook on `pay` with `max_retries: 1` and `allow_effect_retry: true`), and on the variants V1 to V14 of `test-plan.md` § Effect variants (V11 fails L2 on its unknown block, so `checkHooks` gets its parsed document directly; V12 to V14 put a block hook before a retrying code hook in the `post` of the `read` node `lookup`)
- **THEN** the first gives exactly one error, `H_ROUTE_EFFECT`, node `lookup`, path `/nodes/lookup/post/0/routes/0`; the second exactly one, `H_RETRY_SCOPE`, node `pay`, path `/nodes/pay/post/0/allow_effect_retry`; each variant gives the result of that table, so a route to a node of unknown effect is `H_ROUTE_EFFECT`, a `pay` block hook in a retried post chain is `H_RETRY_SCOPE` even with `allow_effect_retry: true`, and a `send` one is `H_RETRY_SCOPE` only without the flag

### Requirement: Malformed hooks give H_SCHEMA and never throw
`checkHooks` SHALL report every malformed hook, rule, selector, reference or placement as `H_SCHEMA`, SHALL run its other rules only when no `H_SCHEMA` was found, and SHALL NOT throw for any input. `H_SCHEMA` SHALL cover (members in `design.md` Decision 4) an unknown, missing, forbidden or ill-typed member of a code hook (no `source`; `on_error`), a block hook (no `with`; `routes`), a rule, `when` or selector; `routes`, `max_retries`, `allow_effect_retry`, `when.next` or `when.outcome` on a `pre` hook; a duplicate id (in a node across `pre` and `post`, or across rules); a rule hook id other than the rule's; and the bounds (ids of 64 characters, 16 hooks per phase, 16 rules). A throwing catalogue SHALL be caught: a block hook gives `H_BLOCK` and a node's effect is `null`, which `H_ROUTE_EFFECT` and `H_RETRY_SCOPE` count as an effect.

#### Scenario: Malformed documents
- **WHEN** `checkHooks` gets the minimal document of `test-plan.md` § Malformed documents changed one way at a time by each of the 36 mutations M1 to M36 listed there (a non-array `pre`, a non-object hook, a non-array `hooks`, hooks on `foreach`, `agent`, `subflow`, `human.form` and `end` nodes, unparsable and misplaced references, duplicate ids, bad rules, selectors and retry fields, an id of 65 characters, 17 hooks, 17 rules, and a missing, forbidden or unknown member of a hook, rule or `when`; M25, M26 and M30 are valid controls), and `undefined`, `null`, `5`, `"x"`, `[]` and `true` as documents
- **THEN** each of M1 to M24, M27 to M29 and M31 to M36 gives exactly the (code, node, path) rows of that table, all `H_SCHEMA`; M24 (`frob` and `routes: ["nowhere"]`) gives one `H_SCHEMA` and no `H_ROUTE_TARGET`; M25 (a `pre` on the `end` node), M26 (a block hook `with` value `${{ hook.output.vendor_id }}`) and M30 (16 hooks, one id of 64 characters) give no issue; the six non-flow values give `{ errors: [], warnings: [] }`

#### Scenario: Mutated hook flows and deep graphs never throw
- **WHEN** 1,500 seeded mutants (500 each of `s09-onion`, `x3-gate-bypass` and `s06-next-redirect`, each with 1 to 3 random edits, by the harness of `test-plan.md` § Mutation test) run through `checkHooks`, `declaresHooks`, `augmentedSuccessors` and `hookPlacements` (every node id); and `checkHooks` runs on a chain of 5,000 `switch` nodes `n0` to `n4999` (chained by `default`, ending in the `end` node `e`) whose `n0` has a post code hook with `routes: ["e"]`; and `checkHooks` runs on the document `TC` of `test-plan.md` § Throwing catalogue against a catalogue whose `block` throws
- **THEN** no call throws, every issue of the mutants has layer `"H"`, a code in `HOOK_ERROR_CODES` or `HOOK_WARNING_CODES`, a string `path`, a `node` that is `null` or a string, and a non-empty single-line `message`; the chain gives `{ errors: [], warnings: [] }`; `TC` gives no warning and exactly three errors, in order, `H_BLOCK` (node `lookup`, path `/nodes/lookup/post/0/uses`), `H_ROUTE_EFFECT` (`lookup`, `/nodes/lookup/post/1/routes/1`) and `H_RETRY_SCOPE` (`lookup`, `/nodes/lookup/post/2/max_retries`)

### Requirement: The H layer follows L3 for flows that declare a hook
`validateFlow` SHALL run layer `H` after L3 only when L1 to L3 gave no error and `declaresHooks` is true, add `"H"` to `layers_run`, and leave the result of a hookless document as it was.

#### Scenario: Gating and ordering
- **WHEN** `validateFlow` checks RF-1 (`loadTestFlow("rf-1-invoice-intake")`) as it is (A), with the rule `pay_guard` (`match: { effect: ["pay"] }`, a `pre` code hook) (B), with the rule `ghost` (`match: { tags: ["nonexistent"] }`) (C), with a post code hook on `classify` with `routes: ["nowhere"]` (D), D with `pay.with.amount` set to `${{ nodes.ghost.output.x }}` (E), and with `classify.pre = {}` (F)
- **THEN** `declaresHooks` is `false` for A and `true` for the others; A gives `ok: true`, `layers_run: ["L1", "L2", "L3"]` and the one warning `W_LETHAL_TRIFECTA`; B gives `ok: true`, `["L1", "L2", "L3", "H"]`, no error and that one warning; C gives `ok: true`, four layers and two warnings in the order `W_NO_MATCH` (layer `H`, node `null`, path `/hooks/0`) then `W_LETHAL_TRIFECTA` (layer `L3`); D gives `ok: false`, four layers and the one error `H_ROUTE_TARGET`, node `classify`, path `/nodes/classify/post/0/routes/0`; E gives `ok: false`, `["L1", "L2", "L3"]` and the one error `L3_REF_UNKNOWN_NODE` (node `pay`, path `/nodes/pay/with/amount`), with no `H_ROUTE_TARGET`; F gives `ok: false`, `["L1"]` and the one error `L1_TYPE`, node `classify`, path `/nodes/classify/pre`

### Requirement: Hook case files pin each code
`test/support/hook-cases/` SHALL hold `invalid/`, `valid/` and `warnings/` flow files with `ursitoare: "0.1"`, `hookCases(group)` SHALL list them with their `# expect:` and `# expect-warnings:` codes, and each `H_*` code SHALL be expected by some invalid file.

#### Scenario: Each case file yields its codes
- **WHEN** every file of `hookCases("invalid")`, `hookCases("valid")` and `hookCases("warnings")` runs through `validateFlowText(text, "yaml", loadTestCatalogue())`
- **THEN** the 9 invalid files of `test-plan.md` § Case files each give `ok: false`, `layers_run: ["L1", "L2", "L3", "H"]` and exactly one error of layer `"H"` with their `expect` code and the (node, path) of `test-plan.md` § Case files; the union of their `expect` lists is the 8 codes of `HOOK_ERROR_CODES`; the 2 valid files `hooks-onion` and `hooks-retry-read` give `ok: true`, no error, no warning and four layers; `hooks-no-match` gives `ok: true`, `errors: []` and the one warning `W_NO_MATCH` (layer `H`, node `null`, path `/hooks/0`) equal to its `expectWarnings`

### Requirement: The hook codes have their own lists
`HOOK_ERROR_CODES` and `HOOK_WARNING_CODES` SHALL hold the hook codes outside the three `FLOW_*` lists, and `diagnosticLink` SHALL know them.

#### Scenario: Lists and links
- **WHEN** `HOOK_ERROR_CODES`, `HOOK_WARNING_CODES` and `HOOKLESS_KINDS` are read, and `diagnosticLink` gets `H_ROUTE_EFFECT`, `W_NO_MATCH`, `H_CYCLE` and `H_NOPE`
- **THEN** `HOOK_ERROR_CODES`, `HOOK_WARNING_CODES` and `HOOKLESS_KINDS` equal, in order, the arrays written in the Interfaces of `design.md` (eight `H_*` codes from `H_SCHEMA` to `H_DOMINANCE`; `["W_NO_MATCH"]`; `["agent", "foreach", "human.form", "subflow"]`), none of the nine codes is in `FLOW_ERROR_CODES`, `FLOW_WARNING_CODES` or `FLOW_RESERVED_CODES`, and the links are `docs/authoring/diagnostics.md#h_route_effect`, `docs/authoring/diagnostics.md#w_no_match`, `docs/authoring/diagnostics.md#h_cycle` and `null`
