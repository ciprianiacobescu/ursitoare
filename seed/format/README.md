# format/ — Ursitoare format v0 tooling (M4a)

JSON Schema, a three-layer validator, a rubric checker and a canonical form for flows written in format v0 (`ursitoare: "0.1"`, design.md section 4). Node 26, ESM, TypeScript run with `tsx`. Dependencies are pinned exactly: `ajv` 8.20.0 (draft 2020-12), `yaml` 2.9.1, `acorn` 8.19.0.

```bash
cd format
npm ci
npm test            # 221 tests, ~3 s
npm run typecheck
```

## CLI

```bash
npx tsx src/cli.ts validate <file.(yaml|json)> [--json] [--catalogue <file>]
npx tsx src/cli.ts rubric   <flow> <rubric.json> [--seed <file>] [--json]
npx tsx src/cli.ts canonical <file> [--pretty]
```

Exit codes: `0` valid / all checks pass, `1` validation errors / failed checks, `2` usage or I/O error. The catalogue defaults to `../shared/catalogue/blocks.v0.json`.

`validate --json` prints `{file, ok, errors:[{layer, code, node, path, message}], warnings:[...], layers_run:["L1","L2","L3"]}`.

YAML is parsed with the `yaml` package in YAML 1.2 *core schema*, with no custom tags (an unresolved tag such as `!!python/object` is an error `L1_PARSE`), duplicate mapping keys are an error, merge keys (`<<`) are off. `.json` files are parsed with `JSON.parse` (duplicate keys in JSON are not detected).

## API

```ts
import { validate, loadCatalogue } from "./src/validate.ts";
import { checkRubric } from "./src/rubric.ts";
import { canonicalize, canonicalJson, canonicalEqual } from "./src/canonical.ts";
import { parseFlowText, readFlowFile } from "./src/io.ts";

validate(doc: unknown, catalogue: Catalogue): {
  ok: boolean;
  errors: Issue[];            // {layer: "L1"|"L2"|"L3", code, node: string|null, path: JSON-Pointer, message}
  warnings: Issue[];          // same shape, code starts with "W_"
  layers_run: ("L1"|"L2"|"L3")[];   // NOT in the spec: see below
}

checkRubric(doc: unknown, rubric: Check[] | {checks: Check[]}, opts?: {seed?: unknown}): {
  passed: number; total: number; ok: boolean;
  results: {check: string /* the check's key, e.g. "precedes" */, pass: boolean, detail: string, spec: unknown /* the raw check */}[];
}

canonicalize(doc): unknown            // sorted keys + normalised references
canonicalJson(doc, {pretty?}): string
canonicalEqual(a, b): boolean

parseFlowText(text, "yaml"|"json"): {doc?, errors: Issue[]}   // safe parse; errors are L1_PARSE
```

`validate` never throws. If an internal bug is hit it returns an `INTERNAL_ERROR` error for that layer (a crash can never look like a pass). `validate` is deterministic: issues are sorted by `(layer, path, code, message)` in code-unit order, and results do not depend on object key order or locale.

### Layers are gated

L2 runs only when L1 reports no errors, and L3 only when L1 and L2 report none (dominance and typing are ill-defined on a broken graph). `layers_run` says what actually ran. **A scorer must not count a skipped layer as passed**: report "L3 pass" only when `layers_run` includes `"L3"` and `errors` is empty. `ok` is true iff there are no errors in any layer.

## Layers (design 4.4)

* **L1**: `schema/flow.v0.schema.json` (JSON Schema 2020-12, discriminated on `node.kind`, `additionalProperties: false` on every node) plus static string checks: reference syntax, `${{` in plain-text fields, embedded JSON Schemas (`inputs`, `output_schema`, `form_schema`) are valid 2020-12 schemas, `code.source` parses as a function body and contains a `return`.
* **L2**: registry (blocks and majors, `with` keys, roles, delegate targets and workflows, flows, model profiles), `start` and successor existence, required successors, reachability, cycles, `llm.decide` outcome/case agreement.
* **L3**: reference resolution against producer output schemas, strict dominance (timeout edges carry no output), JSON-type compatibility, `switch` key compatibility, `item.*` scoping, taint, lethal trifecta.

## Error codes

Every code has at least one fixture in `test/fixtures/invalid/` (the header comment `# expect: CODE[, CODE]` is the exact expected set).

* **L1**: `L1_PARSE` `L1_REQUIRED` `L1_ADDITIONAL_PROPERTY` `L1_TYPE` `L1_CONST` `L1_ENUM` `L1_UNKNOWN_KIND` `L1_PATTERN` `L1_MIN_ITEMS` `L1_UNIQUE_ITEMS` `L1_RANGE` `L1_MIN_LENGTH` `L1_MIN_PROPERTIES` `L1_FOREACH_BODY` `L1_INVALID_JSON_SCHEMA` `L1_REF_SYNTAX` `L1_REF_NOT_ALLOWED` `L1_CODE_SYNTAX` `L1_CODE_NO_RETURN`
* **L2**: `L2_UNKNOWN_BLOCK` `L2_WITH_MISSING_REQUIRED` `L2_WITH_UNKNOWN_PARAM` `L2_UNKNOWN_ROLE` `L2_UNKNOWN_DELEGATE_TARGET` `L2_UNKNOWN_DELEGATE_WORKFLOW` `L2_UNKNOWN_FLOW` `L2_UNKNOWN_MODEL_PROFILE` `L2_START_UNKNOWN` `L2_UNKNOWN_SUCCESSOR` `L2_MISSING_SUCCESSOR` `L2_UNREACHABLE_NODE` `L2_CYCLE` `L2_NO_END` `L2_DECIDE_CASE_MISSING` `L2_DECIDE_CASE_EXTRA`
* **L3**: `L3_REF_UNKNOWN_NODE` `L3_REF_NOT_DOMINATING` `L3_REF_UNKNOWN_PATH` `L3_REF_NO_OUTPUT` `L3_REF_OUTCOME_NOT_DECIDE` `L3_ITEM_OUTSIDE_FOREACH` `L3_TYPE_MISMATCH` `L3_ENUM_VIOLATION` `L3_SWITCH_ON_TYPE` `L3_SWITCH_KEY_INCOMPATIBLE` `L3_TAINT_TO_CONSEQUENTIAL` `L3_TAINT_TO_AGENT_WITH_EFFECTS`
* **Warnings** (never fail a flow): `W_LETHAL_TRIFECTA` `W_TAINT_TO_OPAQUE_CALL` `W_OPTIONAL_REFERENCE` `W_SUSPICIOUS_INTERPOLATION` `W_CODE_FORBIDDEN_API`
* **Internal guard**: `INTERNAL_ERROR` (a validator bug; the fuzz test asserts it never occurs).

## Rubric DSL (design 8)

A rubric is a JSON array of checks, or `{"checks": [...]}`. Each check has exactly one main key from: `has_kind` `no_kind` `uses` `no_uses` `precedes` `decide_outcomes` `param_equals` `param_from` `approval_role` `timeout_max` `foreach_over` `agent_tools` `preserves` `absent`; `has_kind` and `uses` also take `min` (default **1**) and `max`. A malformed check (unknown key, wrong shape) **fails** with `detail: "malformed check: ..."`; it never throws and never passes. `checkRubric` throws `TypeError` only if the rubric envelope itself is not an array or `{checks: [...]}`.

Semantics worth knowing (details in REPORT.md "Interpretations"): `uses` counts `block.uses` and `foreach.uses` (not agent tools); `precedes` is an all-paths analysis and fails if nothing matches `after` or `before`; `timeout_max` fails if there is no node of the kind; `preserves` without a seed fails.

## Canonical form (for M4b round-trips)

`canonicalize(doc)` = object keys sorted at every depth + every `${{ ... }}` in a value position re-printed as `${{ <ref> }}` (single spaces). Nothing else: array order is kept, defaults (`model_profile: default`, `max_parallel: 1`) are neither added nor removed, strings are not trimmed. A printer that reproduces the authored document therefore compares equal.

## Interpretations: where this tool is stricter than, or adds to, design.md

design.md was silent or ambiguous at these points; the stricter reading was chosen. **Any golden, seed or guide written without knowing these must be re-run through `validate` and `checkRubric`.** Items marked (extra) go beyond the letter of design 4.4.

**Result shape and layering**
1. (extra) Layers are gated and the result carries `layers_run`. L2 runs only if L1 is clean, L3 only if L1 and L2 are clean. A scorer reports "L3 pass" only when `layers_run` includes `"L3"` and `errors` is empty; a skipped layer is not a pass.
2. `node` is `null` for document-level issues. `path` is a JSON Pointer.
3. No separate termination pass: acyclic + all successors present and existing implies every path ends at an `end`; `L2_NO_END` covers a flow with no end node.
4. Required successors (`next`; `delegate` and `human.form` also `on_timeout`) are an L2 rule (`L2_MISSING_SUCCESSOR`), not L1, because design 4.2 does not list them among required fields.
5. `llm.decide` outcomes vs `cases` keys agreement is L2 (`L2_DECIDE_CASE_MISSING`, `L2_DECIDE_CASE_EXTRA`).

**L1 beyond JSON Schema (extra)**
6. `L1_REF_SYNTAX`: every `${{ }}` in a value position (`with`, `input`, `items`, `on`, `summary`, `end.output`, nested) must be one of the four reference forms; expressions, `[0]`, unterminated `${{`, `nodes.x.output` without a path are errors.
7. `L1_REF_NOT_ALLOWED`: `${{` inside `instructions`/`goal`, or `${{ inputs|nodes|item` inside a code `source`, is an error (such text is never interpolated).
8. `L1_INVALID_JSON_SCHEMA`: `inputs`, `output_schema`, `form_schema` must be valid 2020-12 schemas with `type: object`.
9. `L1_CODE_SYNTAX` / `L1_CODE_NO_RETURN`: `code.source` is parsed (never executed) as a function body of `input`; syntax errors (incl. `import`) and a missing `return` in the function's own scope are errors.
10. Strict schema: `version` is semver; `flow` kebab-case; `ursitoare` must be the string `"0.1"`; `end` rejects `next`; keys of `with`/`input`/`output` maps match `^[A-Za-z_][A-Za-z0-9_]*$` (so a delegate key `invoice-id` fails `L1_PATTERN`); `llm.decide.cases` needs at least 2 keys; durations are ISO-8601 (fractions allowed).
11. `delegate.target` is checked against the catalogue in L2; `delegate.with` keys are not checked (no schema in the catalogue).

**L3 references, dominance, types**
12. Strict dominance: a node cannot read its own output; the producer must be on every path from `start`, also for `end` nodes.
13. **Timeout edges carry no output** (`human.approval.cases.timeout`, `human.form.on_timeout`, `delegate.on_timeout`): a node reached through such an edge, or by a join with one, cannot read the waiting node's output (`L3_REF_NOT_DOMINATING`). Most likely cause of golden failures: both delegate branches converging on one `end` that reads the delegate's output.
14. Paths are dotted names. No array indexing; resolution never descends through an array (`L3_REF_UNKNOWN_PATH`); an object without declared `properties` is opaque (`delegate.output.result.<x>` cannot be resolved); `nodes.<id>.output` needs a path; `switch`/`wait`/`end` have no output (`L3_REF_NO_OUTPUT`); `.outcome` only on `llm.decide` (`L3_REF_OUTCOME_NOT_DECIDE`); `nodes.x.output.outcome` also resolves.
15. `item` only inside `foreach.with` (`L3_ITEM_OUTSIDE_FOREACH`). **Bare `item` (no path) is accepted** so lists of strings can be iterated (the grammar says `item.<path>`).
16. Types: a single reference keeps its type; `integer` fits `number`, **`number` into `integer` is `L3_TYPE_MISMATCH`**; a single numeric reference into a string parameter is a mismatch (a template is required); a template into a non-string parameter is a mismatch; nullable producers into non-null parameters mismatch; an untyped producer is accepted; literals are type-checked (`"5"` into an integer fails); array element types are compared. Applies where the consumer declares a schema (block `with`, foreach-block `with`, subflow `with`); `code`/`llm.*`/`agent` `input`, `delegate.with`, `end.output` have no schema.
17. (extra) `L3_ENUM_VIOLATION`: a literal must be in the parameter enum; a reference with an enum (catalogue enum or decide outcome labels) must be a subset of the parameter enum; a free-string producer into an enum parameter is accepted.
18. (extra warning) `W_OPTIONAL_REFERENCE`: reference through a property not in `required` (including optional flow inputs).
19. `switch.on` must reference a string/number/integer/boolean (`L3_SWITCH_ON_TYPE`); boolean keys are `"true"`/`"false"`; integer/number keys must be numeric; if the producer has an enum (incl. decide outcomes) every key must be in it (`L3_SWITCH_KEY_INCOMPATIBLE`).

**Taint**
20. Sources: `untrusted_fields` by top-level prefix (so every `item.*` over `messages` is untrusted; `foreach` results over an untrusted block are untrusted).
21. Clears: `llm.extract` and `code` only (label `extracted`). `code` launders taint by design (spec); not detected.
22. Propagates: `llm.generate` (iff an input is untrusted), `llm.decide.rationale`; `outcome` is always trusted. **`agent` output is untrusted if its input is, or if any tool has `untrusted_fields`.** Human outputs, flow `inputs`, `delegate` and `subflow` outputs are trusted (no catalogue annotation). Block outputs are tainted only by their own `untrusted_fields`, never by tainted inputs.
23. Sinks (errors): any untrusted reference (alone, in a template, nested in a literal) in `with` of an `effect != read` block, including `foreach.uses`: `L3_TAINT_TO_CONSEQUENTIAL`; untrusted `agent.input` when any tool is `effect != read`: `L3_TAINT_TO_AGENT_WITH_EFFECTS`. Subflow and delegate inputs are a warning only (`W_TAINT_TO_OPAQUE_CALL`).
24. `W_LETHAL_TRIFECTA`: flow uses a block with `untrusted_fields` (as block, `foreach.uses` or agent tool) AND a `read` block whose input has no `url` parameter (heuristic for private data; override with `private: true|false` on a catalogue block) AND a `send`/`pay` block. RF-1 and the support-triage example both warn.

**Rubric**
25. Envelope: array or `{checks}`; result `check` is the main key, raw check in `spec`.
26. `has_kind`/`uses` default `min` 1; `uses` counts `block.uses` and `foreach.uses`, not agent tools.
27. `precedes`: all paths, all edge types; a node does not precede itself; fails if nothing matches `before` or `after`.
28. `timeout_max`: `timeout` or `callback_timeout`; fails if no node of the kind; Y=365 d, M=30 d, W=7 d.
29. `param_equals` compares canonicalised JSON (type-sensitive); `param_from` matches single refs, refs in templates and nested refs to `nodes.<id>...`; `foreach_over`/`agent_tools` fail if there is no foreach/agent.
30. `preserves` without a seed fails (does not throw); an id absent from the seed fails; `absent` needs no seed; a malformed check fails with `malformed check: ...`.

**Input and canonical form**
31. YAML 1.2 core schema, no custom tags (unresolved tag is `L1_PARSE`), duplicate keys are `L1_PARSE`, merge keys off, aliases allowed; unquoted `true:`/`1:`/`on:` keys are plain strings. `.json` uses `JSON.parse` (duplicate keys undetected).
32. Canonical: sorted keys + reference whitespace only. Defaults are neither injected nor removed (`model_profile: default` differs from omitted). **`nodes.x.outcome` and `nodes.x.output.outcome` are both valid but canonicalise differently**: a printer must keep the spelling it was given. Array order is preserved; strings are not trimmed.

## Layout

```
schema/flow.v0.schema.json   L1 schema
src/validate.ts              L1/L2/L3          src/rubric.ts     rubric checker
src/refs.ts                  reference syntax  src/graph.ts      successors, cycles, dominance
src/jsonschema.ts            path + type helpers  src/canonical.ts canonical form
src/io.ts                    safe parsing      src/codes.ts      the code lists
src/cli.ts                   CLI
test/                        node:test suites; fixtures/{invalid,valid,warnings}/
scripts/gen-fixtures.ts      regenerates the fixtures (deterministic)
scripts/gen-guide.ts         regenerates ../eval/guides/yaml.md from guide-template.md
```
