# Codes and case files

The 47 error codes (19 L1, 16 L2, 12 L3, in the order of `FLOW_ERROR_CODES`), the 5 warning codes and the reserved code, each
with the rule that raises it and the number of case files under `test/support/flow-cases/invalid/` that expect it (121 in all
across 115 files). Every case file starts with `# expect: <codes>` (the distinct error codes, sorted) and a `# note:` line. Six
files expect two codes, counted under each: `l2-cycle` and `l2-cycle-self-loop` (`L2_CYCLE`, `L2_UNREACHABLE_NODE`),
`l2-missing-successor`, `l2-unknown-successor` and `l2-unknown-successor-decide-case` (with `L2_UNREACHABLE_NODE`), and
`l2-no-end` (`L2_MISSING_SUCCESSOR`, `L2_NO_END`).

| Code | Raised when | Cases |
|---|---|---|
| `L1_PARSE` | `validateFlowText` only: `parseFlowText` refused the text. Message `<FORMAT_*>: <message>`; node null; path "" (U22's JSON Pointer for `FORMAT_NOT_JSON`). | 3 |
| `L1_REQUIRED` | A field the schema requires is absent; the path is the missing field. | 4 |
| `L1_ADDITIONAL_PROPERTY` | A field the schema does not list (the path is that field). | 3 |
| `L1_TYPE` | A value of the wrong JSON type (`max_steps: "5"`, `with` not an object). | 2 |
| `L1_CONST` | A fixed value differs: `ursitoare` is not the string "0.1", `language` is not "js". | 2 |
| `L1_ENUM` | `end.status` is not `completed` or `failed`. | 1 |
| `L1_UNKNOWN_KIND` | A node `kind` that is a string but not one of the 14 kinds. | 1 |
| `L1_PATTERN` | A string breaks its pattern: flow id, semver `version`, node id (also as a `nodes` key), block or flow ref, role, model profile, ISO duration, `switch.on`, `foreach.items`. | 6 |
| `L1_MIN_ITEMS` | `outcomes` has fewer than 2 entries, or `tools` is empty. | 2 |
| `L1_UNIQUE_ITEMS` | `outcomes` or `tools` repeats an entry. | 1 |
| `L1_RANGE` | `max_steps` outside 1..50, or `max_parallel` below 1. | 2 |
| `L1_MIN_LENGTH` | A required text field is empty (`instructions`, `goal`, `source`, `summary`, `target`, `workflow`). | 1 |
| `L1_MIN_PROPERTIES` | `nodes` is empty, `llm.decide` has fewer than 2 `cases`, or `switch` has none. | 1 |
| `L1_FOREACH_BODY` | A `foreach` has both or neither of `uses` and `subflow`. | 2 |
| `L1_INVALID_JSON_SCHEMA` | `inputs`, an `output_schema` or a `form_schema` fails `jsonSchemaProblem`; the path is that field. | 2 |
| `L1_REF_SYNTAX` | A `${{ }}` in a value field (`valueFields` of each node) is not a reference (unterminated, an expression, an index, an unknown root, `nodes.x` without `.output` or `.outcome`, `.output` without a path). | 6 |
| `L1_REF_NOT_ALLOWED` | `${{` in `instructions` or `goal`, or `${{ inputs`, `${{ nodes` or `${{ item` in a `source`. | 2 |
| `L1_CODE_SYNTAX` | The `source` of a `code` node does not parse as a function body (acorn, latest ECMAScript, script; an `import` declaration fails). | 2 |
| `L1_CODE_NO_RETURN` | The body has no `return` of its own (a `return` in a nested function does not count). | 2 |
| `L2_UNKNOWN_BLOCK` | `uses` of a `block` or `foreach`, or an `agent` `tools` entry: `catalogue.block(ref)` is `undefined`. | 4 |
| `L2_WITH_MISSING_REQUIRED` | `with` lacks an input listed in `required` of the block's `input` schema (a `subflow` or `foreach.subflow`: the flow's `input`); the path is `with`. | 2 |
| `L2_WITH_UNKNOWN_PARAM` | A `with` key is not in the `properties` of that input schema; the path is the key. | 2 |
| `L2_UNKNOWN_ROLE` | `assignee_role`: `catalogue.role(name)` is `undefined`. | 1 |
| `L2_UNKNOWN_DELEGATE_TARGET` | `catalogue.delegateTarget(target, workflow)` is `undefined` and the target is not offered (design D4). | 2 |
| `L2_UNKNOWN_DELEGATE_WORKFLOW` | The target is offered (`delegateWorkflows(target)` is a list) but does not list the workflow. | 1 |
| `L2_UNKNOWN_FLOW` | `subflow.flow` or `foreach.subflow`: `parseVersionedRef` fails or `catalogue.flow(name, major)` is `undefined`. | 2 |
| `L2_UNKNOWN_MODEL_PROFILE` | `model_profile`: `catalogue.modelProfile(ref)` is `undefined` (`profile` is not checked). | 1 |
| `L2_START_UNKNOWN` | `start` names no node (own property). | 1 |
| `L2_UNKNOWN_SUCCESSOR` | A successor id (`next`, `on_timeout`, a `cases` value, `default`; `successorFields`) names no node. | 2 |
| `L2_MISSING_SUCCESSOR` | `requiredSuccessorFields(kind)` lists a field the node lacks (`next`, and `on_timeout` for `human.form` and `delegate`). | 3 |
| `L2_UNREACHABLE_NODE` | A node is not reachable from `start` (checked only when `start` exists). | 6 |
| `L2_CYCLE` | A cycle; one error per distinct cycle, on its smallest node id, message `cycle a -> b -> a`. | 2 |
| `L2_NO_END` | No node of kind `end`; node null, path `/nodes`. | 1 |
| `L2_DECIDE_CASE_MISSING` | An `llm.decide` outcome has no entry in `cases`; the path is `cases`. | 1 |
| `L2_DECIDE_CASE_EXTRA` | A `cases` key is not one of the outcomes; the path is that key. | 1 |
| `L3_REF_UNKNOWN_NODE` | `nodes.<id>` names no node (own property: `constructor` is unknown). | 2 |
| `L3_REF_NOT_DOMINATING` | The producer is not guaranteed to have run: another branch, after the reader, the reader itself, or only over a timeout edge (`human.approval` `timeout` case, `on_timeout` of `human.form` and `delegate`), which carries no output. The message gives a witness path. | 7 |
| `L3_REF_UNKNOWN_PATH` | The path does not resolve in the schema (an input, a node output, an `item`): unknown property, through an array, inside an open object or a primitive, or an `item` path when the element type is not declared. | 7 |
| `L3_REF_NO_OUTPUT` | The referenced node produces no output (`switch`, `wait`, `end`). | 1 |
| `L3_REF_OUTCOME_NOT_DECIDE` | `.outcome` of a node that is not `llm.decide`. | 1 |
| `L3_ITEM_OUTSIDE_FOREACH` | `item.*` anywhere but the `with` of a `foreach` (its own `items` included). | 2 |
| `L3_TYPE_MISMATCH` | A JSON type differs: a single reference against the consumer's schema, a literal (null, number into integer, string into number), a template into a non-string, an array or object literal the type forbids, a required field missing from an object literal, `foreach.items` not an array. | 8 |
| `L3_ENUM_VIOLATION` | A literal, or every value of a referenced enum, is not within the consumer's `enum`. | 3 |
| `L3_SWITCH_ON_TYPE` | `switch.on` has type object or array. | 1 |
| `L3_SWITCH_KEY_INCOMPATIBLE` | A `switch` case key cannot match the value: not in its enum, not an integer for integer, not `true`/`false` for boolean. | 3 |
| `L3_TAINT_TO_CONSEQUENTIAL` | A reference whose taint includes `untrusted` sits in the `with` of a `block` or `foreach` `uses` whose block has effect other than `read` (D6). | 8 |
| `L3_TAINT_TO_AGENT_WITH_EFFECTS` | An untrusted reference in the `input` of an `agent` that has a tool with effect other than `read` (D6). | 1 |

## Warning codes and the reserved code

| Code | Layer | Raised when |
|---|---|---|
| `W_LETHAL_TRIFECTA` | L3 | `flowCapabilities` is true for `reads_untrusted`, `reads_private` and `has_send_or_pay`. Node null, path `/nodes`, message `flow reads untrusted content (<tools>), reads private data (<tools>) and can send or pay (<tools>)`: the distinct non-empty `tool` values of each `capabilityEvidence` list, sorted, joined by `, `. |
| `W_TAINT_TO_OPAQUE_CALL` | L3 | An untrusted reference in the `with` of a `subflow`, a `delegate` or a `foreach` with `subflow` (D6). |
| `W_OPTIONAL_REFERENCE` | L3 | A reference ends at a field its schema does not list in `required` (also `switch.on` and `foreach.items`); the path is the value. |
| `W_SUSPICIOUS_INTERPOLATION` | L1 | Plain text around the references of a value field that U22's `suspiciousInterpolation(text)` reports and that holds no `${{`. |
| `W_CODE_FORBIDDEN_API` | L1 | A `code` source uses `fetch`, `require`, `process`, `XMLHttpRequest`, `WebSocket`, `setTimeout`, `setInterval`, `eval`, `Function`, `Date`, `crypto`, `Atomics` or `globalThis` as an identifier (not as a property name), `Math.random`, or a dynamic `import()`. |
| `INTERNAL_ERROR` | the layer that failed | Reserved (`FLOW_RESERVED_CODES`), not one of the 47: the layer threw (`validator crashed: <message>`) or U23 threw `TaintError` (`taint analysis limit exceeded: ...`). `ok` is false. |

## Valid and warning case files

`valid/` (29 files): zero errors, no warning, all three layers run.

`warnings/` (13 files, zero errors, exactly the listed warnings; a file with none lists none): code-forbidden-api (W_CODE_FORBIDDEN_API), optional-reference-input (W_OPTIONAL_REFERENCE), optional-reference (W_OPTIONAL_REFERENCE), suspicious-interpolation-bare (W_SUSPICIOUS_INTERPOLATION), suspicious-interpolation-mustache (W_SUSPICIOUS_INTERPOLATION), taint-to-opaque-delegate (W_TAINT_TO_OPAQUE_CALL), taint-to-opaque-subflow (W_TAINT_TO_OPAQUE_CALL), trifecta-absent-no-private (none), trifecta-absent-no-send (none), trifecta-absent-no-untrusted (none), trifecta-all-three (W_LETHAL_TRIFECTA), trifecta-via-agent-tools (W_LETHAL_TRIFECTA), trifecta-via-pay (W_LETHAL_TRIFECTA).

## Edits to the seed case files

The 157 files (115 invalid, 29 valid, 13 warnings) are `seed/format/test/fixtures/` with these changes (forced by U24's catalogue and U23's algebra):

1. Roles: `assignee_role: finance-approver` becomes `approver` in `invalid/l1-pattern-duration`, `l1-required-approval-timeout-case`, `l3-not-dominating-timeout-edge` and `valid/taint-untrusted-into-llm-and-human-passes`, `dominance-approval-rejected-branch-has-output`; `support-agent` in `valid/human-form` becomes `author`. `invalid/l2-unknown-role` keeps `cfo`.
2. `valid/taint-via-code-passes` moves to `invalid/l3-taint-via-code` (header `# expect: L3_TAINT_TO_CONSEQUENTIAL`, `# note: code does not launder taint`): U23 makes `code` output the union of its inputs, so untrusted text through `calc` reaches `mail.send`.
3. New `valid/taint-extract-then-code-passes`: `valid/taint-via-extract-passes` with a `code` node `calc` between `extract` and `send` (`extract.next: calc`; `calc` has `input: { text: ${{ nodes.extract.output.summary }} }`, `source: "return { v: input.text.slice(0, 10) };"`, `output_schema` an object with the required string `v`, `next: send`; `send.body` is `${{ nodes.calc.output.v }}`): extracted data stays `extracted` through `code` and passes.
4. `warnings/trifecta-via-agent-tools`: the tool `kb.search@1` becomes `crm.find_customer@1`, because U24 marks `kb.search@1` `data_class: "public"` and only a private read keeps the trifecta.
5. Every other file is copied unchanged.
