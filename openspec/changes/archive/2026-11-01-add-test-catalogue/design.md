## Context

M3 units test against one shared world, reused by M5 to M12. This unit is that world as test-support code and data: the seed's 20-block catalogue, RF-1 and two variants, and 45 hook flows. It is ordinary code written in green; its `*.test.ts` files are frozen after red. It imports from `src/authoring/index.ts` (U22) and, in one test, `DEFAULT_ROLES` from `src/identity/index.ts` (U17). Nothing is imported from `seed/`: the data is copied once, with the changes listed under "Decisions made while writing". Validating these flows is U25's, U23's and U41's job; this unit proves that the loader answers the `Catalogue` interface, that every file parses with `parseFlowText`, and that every name a flow uses is in the catalogue.

## Interfaces

Declarations omit `export`. The first block is the proposal's "Interfaces given" word for word. Every module is imported by its own path. The scaffold stubs each function (`throw new Error("not implemented")`) and gives the constants empty values (`""`, `[]`), which this change fills.

```ts
// test/support/catalogue/errors.ts
type CatalogueDataErrorCode = "CATALOGUE_READ" | "CATALOGUE_INVALID" | "CATALOGUE_UNKNOWN_FLOW" | "CATALOGUE_FLOW_PARSE"
class CatalogueDataError extends Error { readonly code: CatalogueDataErrorCode; constructor(code: CatalogueDataErrorCode, message: string) }
// test/support/catalogue/document.ts
const TEST_CATALOGUE_PATH: string
interface CatalogueDocument { catalogue: string; version: string; notes?: string; blocks: { [ref: string]: BlockDef }; model_profiles: string[]; roles: string[]; delegate_targets: { [target: string]: string[] }; flows_registry: { [ref: string]: { inputs: JsonSchema; outputs: JsonSchema } } }
function parseCatalogueDocument(text: string): CatalogueDocument
function readCatalogueDocument(path?: string): CatalogueDocument
// test/support/catalogue/loader.ts
interface TestCatalogue extends Catalogue { blockRefs(): string[]; modelProfileRefs(): string[]; roleNames(): string[] }
function catalogueFromDocument(doc: CatalogueDocument): TestCatalogue
function loadTestCatalogue(path?: string): TestCatalogue
// test/support/catalogue/references.ts
function unresolvedReferences(flow: unknown, catalogue: Catalogue): string[]
function canReach(flow: unknown, target: string, avoid?: string): boolean
// test/support/catalogue/flows.ts
type TestFlowName = "rf-1-invoice-intake" | "rf-1-core" | "rf-1-core-approval"
const TEST_FLOW_NAMES: readonly TestFlowName[]
function testFlowPath(name: string): string
function readTestFlowText(name: string): string
function parseCatalogueFlow(text: string, label: string): Flow
function loadTestFlow(name: string): Flow
// test/support/hook-flows/index.ts
type HookFlowGroup = "scenario" | "static"
function hookFlowNames(group?: HookFlowGroup): string[]
function hookFlowPath(name: string): string
function readHookFlowText(name: string): string
function hookFlowTitle(name: string): string
function loadHookFlow(name: string): Flow
```

Names taken from `add-flow-format-model` (U22; all from `src/authoring/index.ts`) and `add-roles-and-memberships` (U17) are restated in proposal.md "Interfaces taken" exactly as those changes define them. Three of U22's behaviours matter here: `parseFlowText(text, "yaml")` returns `{ ok: true, doc }` or `{ ok: false, error }` and never throws; `parseVersionedRef("invoices.get@1")` is `{ name: "invoices.get", major: 1 }` and is `undefined` for anything not matching `name@major`; `successorFields(node)` lists the node ids a node can go to next (`/next`, `/on_timeout`, every value of `/cases`, `/default`).

## Data layout

```
test/support/catalogue/blocks.v0.json                    the catalogue document (seed shape)
test/support/catalogue/flows/{rf-1-invoice-intake,rf-1-core,rf-1-core-approval}.yaml
test/support/hook-flows/flows/<name>.yaml                36 scenario flows
test/support/hook-flows/flows/static/<name>.yaml         9 flows for the static hook checker
```

Copy every `*.yaml` of `seed/node-hooks/flows/` (36 files) and of its `static/` subdirectory (9); the 45 names are in the spec (scenario "The hook flows are listed, titled and readable"). A name is the file name without `.yaml` and equals the file's `flow:` value, except `rf-1-invoice-intake` (flow id `invoice-intake`, as in the seed). The document keeps the seed's keys: `catalogue`, `version`, `notes`, `blocks` (20 refs; 9 `read`, 6 `write`, 3 `send`, 2 `pay`; five carry `untrusted_fields`), `model_profiles`, `roles`, `delegate_targets` and `flows_registry`. How RF-1 and its two variants are made: `derived-flows.md` in this folder.

## Decisions

1. **Where data lives and how it is read.** The JSON and the YAML sit next to the code that reads them. Paths are built with `fileURLToPath(new URL("./blocks.v0.json", import.meta.url))` (and likewise `./flows/` and `./flows/static/`), so they do not depend on the working directory, and `readFileSync` reads them; there is no network and no environment variable. `TEST_CATALOGUE_PATH` is the absolute path of `blocks.v0.json`.
2. **The two changes to the block JSON.** `blocks.v0.json` is the seed file with exactly two changes: `"roles"` is `["tenant_admin", "author", "approver", "auditor"]` (the seed had six hyphenated roles that the engine cannot create), and each of the nine `read` blocks gains `"data_class"` (Decisions made while writing). Everything else, `notes` included, stays byte for byte.
3. **Document checks** (`parseCatalogueDocument`, first problem wins, in this order). The text must be JSON (else `invalid JSON: <first line of the engine message>`) and an object (pointer `/`). Then `catalogue` and `version` are strings, `notes` (if present) is a string, `blocks` is an object whose every key satisfies `parseVersionedRef(key) !== undefined`, and every block is an object with `effect` in `read|write|send|pay`, `input` and `output` plain objects (not arrays), `description` (if present) a string, `untrusted_fields` (if present) an array of strings, `data_class` (if present) `"public"` or `"private"`, and `untrusted_result`, `unsafe_to_retry` (if present) booleans. Then `model_profiles` and `roles` are arrays of strings, `delegate_targets` is an object of arrays of strings, `flows_registry` is an object whose keys satisfy `parseVersionedRef` and whose values have `inputs` and `outputs` plain objects. A problem throws `CatalogueDataError("CATALOGUE_INVALID", "<pointer>: <reason>")` with the pointer of the offending value (`/blocks/mail.send@1/effect`, `/roles/0`, keys used as written); a JSON syntax error has no pointer. Extra top-level keys are kept. The result is the parsed object itself (nothing is dropped or added). `readCatalogueDocument(path = TEST_CATALOGUE_PATH)` reads the file as UTF-8 and calls `parseCatalogueDocument`; a read failure throws `CatalogueDataError("CATALOGUE_READ", ...)`.
4. **Lookups.** `catalogueFromDocument(doc)` answers from `doc` only. Every keyed lookup uses `Object.hasOwn(map, key)` (never `map[key]`), so `__proto__`, `constructor`, `toString` and `hasOwnProperty` give `undefined`. Each answer is a fresh copy (`structuredClone`), so a caller that changes a returned definition cannot change the next answer. A non-string argument gives `undefined`.
5. **What each lookup returns.** `block(ref)`: the block under that exact ref (`invoices.get@1`), else `undefined`. `modelProfile(ref)`: `{ ref }` when `model_profiles` includes `ref`. `role(name)`: `{ name }` when `roles` includes `name`. `delegateTarget(target, workflow)`: `{ effect: "send", untrusted_result: true }` when `delegate_targets` has the own key `target` and its list includes `workflow` (U22's design asks this unit to treat every delegate as a `send` with an untrusted result; the JSON keeps the seed's shape and the loader supplies the two values). `flow(ref, major)`: with `major` a non-negative safe integer and the own key `ref + "@" + major` in `flows_registry`, `{ input: inputs, output: outputs }` (the seed's `inputs` and `outputs` renamed to U22's `FlowSignature`); `ref` is the flow name without `@major` (`"notify-customer"`, so `"notify-customer@1"` with major 1 finds nothing). `blockRefs()`, `modelProfileRefs()` and `roleNames()` return the document's keys or lists in file order.
6. **Flow files.** `TEST_FLOW_NAMES` is `["rf-1-invoice-intake", "rf-1-core", "rf-1-core-approval"]`. `testFlowPath(name)` and `hookFlowPath(name)` accept a name only if it is in `TEST_FLOW_NAMES` (hook flows: in `hookFlowNames()`, read from the directories at call time), else throw `CatalogueDataError("CATALOGUE_UNKNOWN_FLOW", ...)`; this is the only way a name becomes a path, so `..`, a slash, an extension or `__proto__` cannot reach the file system. `parseCatalogueFlow(text, label)` calls `parseFlowText(text, "yaml")`; a refusal throws `CATALOGUE_FLOW_PARSE` with message `<label>: <code>: <message>` (for example `rf-1-core: FORMAT_YAML_SYNTAX: ...`), and a result that is not a plain object (empty text, a list, a scalar) throws `CATALOGUE_FLOW_PARSE` with `<label>: the root is not a mapping`. The object is returned as `Flow` without checking its fields (U25 checks them).
7. **Hook flows.** `hookFlowNames(group?)` lists the file stems of `flows/*.yaml` (group `scenario`) and `flows/static/*.yaml` (group `static`), sorted by code unit; without a group, both lists sorted together. `hookFlowTitle(name)` is the first line of the file without its prefix `# generated by tests/gen-flows.mjs: ` (the seed's generator named each flow there; for the static flows it starts with the expected `H_*` or `W_*` code: `H_BLOCK: missing required input`); a first line without that prefix throws `CATALOGUE_INVALID`. The hook flows keep `ursitoare: 0.2-draft` as in the seed; U41 decides what the hook checker accepts.
8. **References** (`unresolvedReferences(flow, catalogue)`, never throws; a non-object gives `[]`). It collects: `uses` of every node that has a string `uses` (kinds `block` and `foreach`) and every string of an `agent` node's `tools` as block refs, answered by `catalogue.block`; the `uses` of every hook of kind `block` found in a node's `pre` and `post` lists and in `flow.hooks[*].pre` and `.post`; `assignee_role` strings, answered by `catalogue.role`; `model_profile` strings, answered by `catalogue.modelProfile`; `delegate` nodes' `target` and `workflow`, answered by `catalogue.delegateTarget`; `subflow` nodes' `flow` and `foreach` nodes' `subflow`, which must satisfy `parseVersionedRef` and then `catalogue.flow(name, major)`. Each name the catalogue lacks yields one string, deduplicated and sorted by code unit: `block:<ref>`, `role:<name>`, `model_profile:<ref>`, `delegate:<target>/<workflow>`, `flow:<ref as written>`. The v0.2 `profile` field is not checked (node profiles belong to `add-model-profiles`).
9. **Reachability** (`canReach(flow, target, avoid?)`, never throws). From `flow.start`, follow the ids that `successorFields(node)` gives for each node in `flow.nodes` (ids that name no node are ignored; a visited set ends cycles). It is `true` when `target` is reached without entering the node `avoid`; a node reaches itself; if `start` is `avoid`, or is not a node, the answer is `false`; a non-object `flow` gives `false`. The test uses it to prove that in `rf-1-core-approval` no path to `pay` skips `approval`.
10. **Content hash.** Flows are hashed by U22's `contentHash`. Tests assert that two loads hash alike, that the three RF-1 hashes differ, and that the JSON surface of a flow hashes like its YAML; they state no golden, because the algorithm is U22's. For information, computed with the algorithm U22 specifies (the same procedure reproduces U22's three golden hashes): `rf-1-invoice-intake` `sha256:ae1769c758c6d6a12bfda384d0821907d6f06c0f0e044f6354408bf388a0fae5`, `rf-1-core` `sha256:474f75f4f34e39187f6558597ba3e3af81a6af3597e24eb2d0687b1e7f85aeae`, `rf-1-core-approval` `sha256:fbfb0d28ed5a8d0c2e2142c3a81a42ec6c6b2179a81bd4a512a0e5d11d44a551` (for the files of `derived-flows.md`).

## Failure cases

- A catalogue document that is not JSON, not an object, or has a wrong shape: `CATALOGUE_INVALID` with the pointer; a missing or unreadable file: `CATALOGUE_READ`. Nothing is partly loaded.
- A flow name that is not shipped (empty, unknown, with an extension or a path, `__proto__`): `CATALOGUE_UNKNOWN_FLOW`. Flow text that `parseFlowText` refuses, or whose root is not a mapping: `CATALOGUE_FLOW_PARSE`, naming the file.
- Absence: every `Catalogue` lookup of an unknown name answers `undefined`; `unresolvedReferences` and `canReach` given a non-object answer `[]` and `false`.
- Dependency down: none at run time (files and pure functions); a throw from U22's functions passes through unchanged. Every function is synchronous and keeps no state, so parallel tests cannot disturb one another.

## Security

1. No endpoint and no PEP action: test-support code, outside the engine's build (`tsconfig.build.json` covers `src/`).
2. No table or query; no two-tenant test applies.
3. Input is data shipped in the repository, plus text that tests pass in. The document and flow text are parsed with `JSON.parse` and U22's safe parser; names are checked against lists before they become paths (Decision 6), and lookups use `Object.hasOwn`. Taint sources are data: five blocks list `untrusted_fields`, which U23 reads.
4. No secret exists in the data (the arch secret scan covers `test/`): the only address is `ap@example.com`. Error messages carry file labels and pointers, never file contents beyond U22's first line.
5. Abuse: a test or a later unit asking for `../../etc/passwd`, `rf-1-core.yaml` or `__proto__` as a flow name fails with `CATALOGUE_UNKNOWN_FLOW` ("Unknown flow names are refused"); `block("__proto__")` and `role("constructor")` answer `undefined` ("Block lookups answer exactly"); a role the engine does not create (`finance-approver`) is reported by `unresolvedReferences`, so seed data cannot creep back unnoticed ("Every shipped flow resolves").

## Test plan

Node tests beside the code, `node:assert/strict`, no database, network or clock. A test calls the function inside `assert.doesNotThrow(() => { r = f(x); })` and asserts on `r`, or uses `assert.throws(() => f(x), { code })`, so that red fails by assertion against the scaffold's `Error("not implemented")`. No test reads a data file itself: it reaches data only through a function of this unit, because at red the data files do not exist. Test names contain no `.`, `[` or `::` (write "blocks v0 json" never "blocks.v0.json"). Inline samples (a tiny catalogue text, a five-node flow) are declared in the test that uses them. Files: `document.test.ts`, `loader.test.ts`, `references.test.ts`, `flows.test.ts` in `test/support/catalogue/`, and `hook-flows.test.ts` in `test/support/hook-flows/`. The exact-optional rule (`exactOptionalPropertyTypes`) applies to code: leave an absent optional member out of an object, never set it to `undefined`.

## Decisions made while writing

- **Roles.** The catalogue's roles are U17's four default roles, not the seed's six (the engine cannot create hyphenated roles; U25 validates these flows against this catalogue). `finance-approver` becomes `approver` in the approval node of all three RF-1 flows and in the 42 hook flows that have one (one line each; `f-eff`, `f-ret` and `f-ret-exhausted` have none), so every shipped flow resolves.
- **Data class (seed-data change).** The nine `read` blocks gain `data_class`, following the seed's own classification in `seed/policy-cedar/config/private-blocks.json`: `"public"` for `docs.fetch@1`, `http.get@1` and `kb.search@1`; `"private"` for `invoices.get@1`, `erp.lookup_vendor@1`, `crm.find_customer@1`, `orders.get@1`, `mail.read_inbox@1` and `calendar.find_slots@1`. Reason: U23 counts an unmarked `read` block as private, so without the three `public` markers the seed's trifecta results would not hold. No other block has the field.
- **Delegate targets.** The JSON keeps the seed shape; the loader supplies `{ effect: "send", untrusted_result: true }` (U22 Decision 9).
- **Flow ids and versions.** RF-1 keeps `flow: invoice-intake`; the variants are `rf-1-core` and `rf-1-core-approval`, the roadmap's names. Versions stay `1.0.0`.
- **`rf-1-core`** has no `approval` and no `archive`, sends `needs_review` to `notify_rejection` and ends `pay` at `done`, because M9 needs a `pay` with an LLM-extracted amount and no approval on its path. **`rf-1-core-approval`** drops `archive` only and sends `auto_approve` to `approval` too, so `approval` is on every path to `pay` (M11: the clean invoice pays after the approver's decision); `classify` stays so the flow keeps an LLM decision.
- **One document.** Roles, profiles, delegate targets and the flow registry stay in `blocks.v0.json` beside the blocks, as in the seed. `loadTestCatalogue` replaces the seed's `loadCatalogue`; the seed's untyped `Catalogue` record is `CatalogueDocument`. There is no barrel file, because a barrel would be changed by every task.
- **Hook flows** are copied as written (comments, `ursitoare: 0.2-draft`) apart from the role line; the `static/` ones are meant to fail U41's checker and here only parse and resolve. The seed's generator and scenario table are not ported. No hook-flow hash is stated: U22 also normalises references inside hook values, which the seed did not.
- **`unresolvedReferences`** is a data check that stops at names; types, data flow and taint are U25's and U23's.
