## Context

A flow with hooks is checked on the graph with the hook routes added (ADR-16, §7); L1 accepts hook members by shape only and L2 and L3 ignore hook routes. This unit ports the spike's `hooks.ts` and `check.ts`, adds `H_ROUTE_EFFECT` (X3) and the X1 rule, and wires layer `H` into `validateFlow`.

## Decisions

1. **Model** (`model.ts`: pure, never throws, narrows `unknown` inside). `nodeMeta` is `null` unless `nodeId` is an own key (`Object.hasOwn`) of `flow.nodes` with an object value; `kind` is `String(node.kind)`, `effect` is `effectClass(node, catalogue) ?? null` (U23; a throw from the catalogue inside it is caught and gives `null`), `tags` the string-array `tags` else `[]`. `selectorMatches` is `false` for a `null` meta, a non-object selector or a field present but not an array, `true` for `undefined`, else the present fields are AND-ed (`effect` never matches `null`). `whenMatches`: `true` for `undefined`, `false` for a non-object; a set `from`/`next` needs a non-null meta its selector matches, a set `outcome` a non-null outcome in the list.
2. **Placements.** Empty for an unknown node and a `HOOKLESS_KINDS` kind (D13); an `end` has no `post`. A rule without `match` matches every node. `label` is the string `id` (else `""`) of a node hook, `rule.<ruleId>` of a rule hook. Non-object entries and rules without a string `id` are skipped. `hookRoutes`: string entries of `routes` of the `post` placements, first-seen. `augmentedSuccessors`: one key per own node; ids of `successorFields(node)` naming an own node, then `hookRoutes`, deduplicated. `declaresHooks`: `doc.hooks !== undefined` or some node object has `pre` or `post` !== undefined.
3. **`checkHooks`** never reads `doc.ursitoare` (D3) and reads a non-object `doc` or `nodes` as `{}`. Issues have layer `"H"` and each list is sorted by `path`, `code`, `message` (UTF-16). Rules run in this order, and a path is the JSON Pointer of the offending member:
   - `H_SCHEMA` (Decision 4); if any is found, return at once (`W_NO_MATCH` included).
   - `H_BLOCK`, once per block-hook definition, also for a rule matching nothing: `catalogue.block(uses)` absent, or throwing (caught, counted as absent), at `…/uses`, skipping the two checks below; a `with` key not an own key of `input.properties` (`…/with/<key>`); a name of `input.required` absent from `with` (`…/with`).
   - Per `post` placement, `node` the wrapped node: a route that is no own node or is the wrapped node is `H_ROUTE_TARGET`; any other route to a node with effect `write`, `send`, `pay` or `null` (an `agent`, a `subflow`, an unknown block or target) is `H_ROUTE_EFFECT` (X3, failing closed as the retry rule does; `read`, `human`, `none` pass); both at `…/routes/<j>`. Non-empty `routes` on a `human.*` node: `H_ROUTE_HUMAN` at `…/routes`. `max_retries` on a `human.*`, `delegate`, `switch`, `wait` or `end` node: `H_RETRY_SCOPE` at `…/max_retries`. Any other retrying hook is judged by its retry scope, the node's own effect plus the effect (`effectClass`, `null` when unknown or when the catalogue throws) of every `kind: block` placement in the node's `post` list from `hookPlacements`, rules included, because a retry restarts the whole post chain (U42 1.6) and runs no pre-hooks, so `pre` block hooks do not count. If `pay` is in the scope (X1, always: a `pay` node, or a `pay` block hook that a `read` node's retry would run again under a new idempotency key), the issue is at `…/allow_effect_retry` when present, else `…/max_retries`. Else, if `write`, `send` or `null` is in the scope and `allow_effect_retry: true` is absent, it is at `…/max_retries`. One issue per retrying hook.
   - `H_CYCLE`: depth-first search from `start` over `augmentedSuccessors` with an explicit stack (a recursive prototype overflowed at 5,000 nodes), successors in ascending order; each back edge is one issue, `node` `null`, path `/nodes`, message `the augmented graph has a cycle: c0 -> c1 -> … -> c0` rotated to start at its smallest id.
   - `H_DOMINANCE`: iterative dominators from `start` over the reachable augmented graph. Every `nodes.<p>` reference (`scanTemplate`) in the node's `valueFields` and each placement's `hookValueFields` must name an own node `p` that dominates the consumer; in a `post` hook of `p` itself `p` is available, elsewhere a self reference is an issue. One issue per distinct (consumer, path, `p`), `node` the consumer (the wrapped node for a rule hook), path the `walkStrings` pointer.
   - `W_NO_MATCH`: a rule matching no node outside `HOOKLESS_KINDS`; path `/hooks/<i>`, `node` `null`.
4. **`H_SCHEMA`** ports the spike's `check.ts` schema checks minus the version gate, with the member sets of main's `format/types.ts:52-93`, which win where the seed is looser. One issue per offending member, at its JSON Pointer; a missing required member (or a rule with neither `pre` nor `post`, M16) at the pointer of the object lacking it. The contents of an ill-typed, unknown or forbidden member are not examined.
   - **Node:** `tags` a string list; `pre`, `post` lists of hook objects, at most 16 each (with 16 rules, at most 64 placements per node, U42b's trace bound), none on a `HOOKLESS_KINDS` node, no `post` on `end` (`/nodes/<id>/<phase>`).
   - **Code hook:** members `id`, `kind`, `when`, `input`, `source`, `routes`, `max_retries`, `allow_effect_retry`; required `id`, `kind: "code"`, `source` (string); forbidden `uses`, `with`, `on_error`.
   - **Block hook:** members `id`, `kind`, `when`, `input`, `uses`, `with`, `on_error`; required `id`, `kind: "block"`, `uses` (string), `with` (object); forbidden `source`, `routes`, `max_retries`, `allow_effect_retry`; `on_error` is `"fail"` or `"continue"`.
   - **Any hook:** `id` a string matching `^[a-z][a-z0-9_]{0,63}$` (a rule hook may omit it); `input` an object; a `kind` that is neither value is one issue and skips the kind-dependent checks (required, forbidden, post-only); any other member is unknown.
   - **Post only** (an issue at the member on a `pre` hook or a rule's `pre`): `routes` (non-empty string list), `max_retries` (integer 1 to 5) and `allow_effect_retry` (`true`, needs `max_retries`), all code hooks; `when.next` and `when.outcome`, any hook.
   - **Rule** (`hooks` a list of at most 16): members `id`, `match`, `pre`, `post`; required `id` (same pattern) and at least one of `pre`, `post`, each a single hook; `match` optional (absent selects every node), an object when present.
   - **`when`:** an object with members `from`, `next` (selectors), `outcome` (string list), none required.
   - **Selector:** members `kind`, `effect`, `nodes`, `tags`; none required; each a list (a non-list is one issue at the member, a bad entry one at `…/<member>/<i>`) of: the 14 `NodeKind` values (`kind`), `read`, `write`, `send`, `pay`, `human`, `none` (`effect`), own nodes (`nodes`), strings (`tags`).
   - **Ids:** a node's hook ids are unique across `pre` and `post` (M13; `pre` first, the later reported), rule ids across `hooks` (M17), a rule hook's `id` absent or the rule's (M18); a node hook id may equal a rule id.
   - **Also:** an unparsable `${{ }}` in `input` or a block hook's `with`; a `hook.*` reference outside a block hook's `with`; an `item.*` reference in any hook. `node` is the wrapped node for a node hook, `null` for a rule-level problem; the paths are in `test-plan.md` § Malformed documents.
5. **Layer `H`.** `Layer` gains `"H"` (task 2.1; nothing on main switches exhaustively on it). After L3, `validateFlow` runs `if (sink.errors.length === 0 && declaresHooks(doc))`: push `"H"`, then `guarded("H", sink, …)` appends the issues of `checkHooks` to `sink.errors` and `sink.warnings`. `validateFlowText` and `validateVersion` are not edited; `check.ts` imports `Issue` as a type only. Sorting stays layer, path, code, message, so an `H` warning precedes an `L3` one.
6. **Codes and docs.** The lists live in `hooks/codes.ts`, not in the `FLOW_*` lists, which `link-parity.test.ts` iterates and the web (layers `L1` to `L3` only) depends on (D2). `DIAGNOSTICS` lists the five lists in order (62 entries, layer `"H"` for the nine hook entries); `isKnownCode` knows them; the document is regenerated; each `summary` and `fix` is a non-empty single line; the `fix` of `H_ROUTE_EFFECT` says to route to a node before the effect node or to use `cases`, that of `H_RETRY_SCOPE` to drop `max_retries` when a `pay` node or a `pay` post block hook is in the retry scope, or to add `allow_effect_retry: true` for `write` or `send` after review, and that of `H_SCHEMA` and the messages of M27 to M29 name the bound that was passed (16 hooks per phase, 16 rules, ids of 64 characters).
7. **Case files.** `test/support/hook-cases/{invalid,valid,warnings}/*.yaml` and `index.ts` with `hookCases`, shaped like U25's `flowCases` (`# expect:` and `# expect-warnings:` headers, codes split on commas or spaces, sorted, `none` ignored, files sorted by name, `format` `"yaml"`), and a README row.

## Interfaces

```ts
// src/authoring/hooks/: index.ts re-exports model.ts, check.ts and codes.ts; src/authoring/index.ts re-exports index.ts
export type HookPhase = "pre" | "post";
export type { EffectClass } from "../taint/hooks.ts";    // "read" | "write" | "send" | "pay" | "human" | "none"
export interface NodeMeta { id: string; kind: string; effect: EffectClass | null; tags: string[] }
export interface HookPlacement { phase: HookPhase; hook: HookDef; ruleId: string | null; label: string }
export const HOOKLESS_KINDS: readonly NodeKind[];        // ["agent", "foreach", "human.form", "subflow"]
export const HOOK_ERROR_CODES: readonly string[];
  // ["H_SCHEMA", "H_BLOCK", "H_ROUTE_TARGET", "H_ROUTE_HUMAN", "H_ROUTE_EFFECT", "H_RETRY_SCOPE", "H_CYCLE", "H_DOMINANCE"]
export const HOOK_WARNING_CODES: readonly string[];      // ["W_NO_MATCH"]
export function nodeMeta(flow: Flow, nodeId: string, catalogue: Catalogue): NodeMeta | null;
export function selectorMatches(selector: HookSelector | undefined, meta: NodeMeta | null): boolean;
export function whenMatches(when: HookWhen | undefined, from: NodeMeta | null, next: NodeMeta | null, outcome: string | null): boolean;
export function hookPlacements(flow: Flow, nodeId: string, catalogue: Catalogue): { pre: HookPlacement[]; post: HookPlacement[] };
export function hookRoutes(flow: Flow, nodeId: string, catalogue: Catalogue): string[];
export function augmentedSuccessors(flow: Flow, catalogue: Catalogue): ReadonlyMap<string, readonly string[]>;
export function declaresHooks(doc: unknown): boolean;
export function checkHooks(doc: unknown, catalogue: Catalogue): { errors: Issue[]; warnings: Issue[] };
// Not scaffolded: src/authoring/validate/types.ts  Layer = "L1" | "L2" | "L3" | "H"
// test/support/hook-cases/index.ts (cases in invalid/, valid/, warnings/ beside it)
export type HookCaseGroup = "invalid" | "valid" | "warnings";
export interface HookCase { group: HookCaseGroup; name: string; path: string; text: string; format: FlowFormat; expect: string[]; expectWarnings: string[] }
export function hookCases(group: HookCaseGroup, namePrefix?: string): HookCase[];
```

## Failure cases

- Any value is accepted by the model and `checkHooks`; they answer empty lists, `null` or `false` and never throw. `__proto__` is an unknown id (`Object.hasOwn`).
- A malformed hook stops every later rule. Through `validateFlow` a throwing catalogue fails L2 first. `checkHooks` catches the throw at each catalogue call: `block` gives `H_BLOCK`, `effectClass` gives effect `null`, which `H_ROUTE_EFFECT` and `H_RETRY_SCOPE` count as an effect (fail closed); it never throws. L3 refuses more than 5,000 nodes before `H`; `H_DOMINANCE` is quadratic (about 0.5 s on a 5,000-node chain).
- Until U44 the web refuses layer `H`; no journey validates a hooked flow before.

## Security

No endpoint, PEP action, table, tenant data or secret: pure functions; messages hold ids, paths and block refs only. Taint on block-hook edges stays unchecked (D14; the PEP checks block hooks, U50). Abuse cases: a route into an effect node, a retried payment ("Effect routes and effect retries"); hooks on hookless kinds, smuggled `item.*` or `hook.*` ("Malformed documents"); a cycle or skipped producer ("The 45 hook flows"); `__proto__` ids and a deep chain ("Mutated hook flows and deep graphs never throw").

## Test plan

Fixtures: `test-plan.md`; test files: `tasks.md`.

## Decisions made while writing

- This unit makes `HookRule.match` optional (`match?: HookSelector`, `format/types.ts:88-93`, task 2.1); an absent `match` selects every node, as main's readers already treat it (`taint/capabilities.ts:142`, `taint/hooks.ts:102`).
- `H_CYCLE` has no node and the path `/nodes`, so key order cannot change the result. `H_ROUTE_HUMAN` on an `end` is subsumed by D13's `H_SCHEMA`.
- `max_retries` is always refused (X1) when `pay` is in the retry scope, on a `pay` node or through a `pay` post block hook; `allow_effect_retry` on a node with a `read` scope is harmless; an unknown effect (`null`) counts as an effect.
- `H_BLOCK` and rule-level `H_SCHEMA` are reported once per hook definition. Not checked here: a code hook's `source` syntax, `inputs.*` paths in hooks, `hook.output` in a `pre` hook.
- `hookCases`, `HookCase` and `HookCaseGroup` are in Interfaces (the card names them only in prose) so the scaffold stubs them.

## Verification

Run on 2026-11-06 (Node 26.8.1; the gates use 24) in a scratch copy of main@a6b5fb37. The seed `check.ts` on the 45 U24 flows reproduces `seed/node-hooks/tests/check-static.mjs` (nothing for `x1a`, `x1b`, `x3`; only `H_ROUTE_HUMAN` for `s18d`). A port of this design (not delivered) gave the rows of `test-plan.md` up to M30 and ran the case files, variants, mutations, gating cases, 2,100 mutants and the 5,000-node chain; the 61 existing `validate` and `taint` tests pass with layer `H` wired. `x1b-retry-raise` (UNVERIFIED in the card) gives `H_RETRY_SCOPE`: its `pay_raise` hook wraps `pay` with `allow_effect_retry`. The scope extension (review round 1, C2) ran on the same port: V11 to V14 and the 45 flows (none has a retrying hook beside a post block hook) give the rows. The optional `match` typechecks (`tsc -p tsconfig.json --noEmit`: exit 0 before and after, scratch copy of main@cf34c628, Node 24). Unverified: the delivered `.ts` and case files, `pnpm run typecheck` (`web` half) and the derived rows (M31 to M36, § Throwing catalogue, the `…/uses` path).
