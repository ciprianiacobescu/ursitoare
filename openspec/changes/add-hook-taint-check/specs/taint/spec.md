## MODIFIED Requirements

### Requirement: Hooks add taint and never remove it
`analyzeTaint` SHALL add the references of applying code hooks to a node's input; SHALL, when a code hook applies to a node of kind `block`, `code`, `llm.extract`, `llm.generate` or `delegate` (or the hook structure of that node is malformed), give the node's `output` and each of its `fields` the join of its input, its output and every one of its field taints, so that no label a hook could carry into a mutated output is missing; SHALL leave nodes unchanged by block hooks while reporting their references as edges; and SHALL resolve `hook.input.*` to the node's input, `hook.output.*` to its output (a field's taint for a name in `fields`, else the output's) and `hook.node.*`, `hook.next.*`, `hook.from.*` to trusted metadata.

#### Scenario: Hook references, widening and flow rules
- **WHEN** the test analyzes the hook sample with catalogue C (test-plan.md § Hook sample: nodes `fetch`, `ex`, `ex2`, `lk`, `pay`, `done` and the rules `guard`, `audit`, `idle`)
- **THEN** `ex` (post code hook) has `input` `["untrusted"]` and `output` `["extracted", "untrusted"]`; `ex2` (pre block hook only) has `["untrusted"]` and `["extracted"]`; `pay` has `["untrusted"]` and `["untrusted"]`; `fetch`, `lk` and `done` have `[]` and `[]`, so `idle` changed nothing and `guard` did not reach `lk`
- **THEN** `edges` has 12 entries; the seven with a non-null `hook` are, in order, as `to` `path` (`ref`, `from`, `taint`, `hook`): `done` `/hooks/1/pre/with/v` (`nodes.fetch.output.raw_text`, `fetch`, `["untrusted"]`, `a`); `done` `/hooks/1/pre/with/s` (`hook.input.x`, `null`, `[]`, `a`); `ex2` `/nodes/ex2/pre/0/with/z` (`hook.input.t`, `null`, `["untrusted"]`, `note`); `fetch` `/nodes/fetch/post/0/with/text` (`hook.output.raw_text`, `fetch`, `["untrusted"]`, `tell`), `.../with/id` (`hook.output.id`, `fetch`, `[]`, `tell`) and `.../with/who` (`hook.node.id`, `null`, `[]`, `tell`); `pay` `/hooks/0/pre/input/raw` (`nodes.fetch.output.raw_text`, `fetch`, `["untrusted"]`, `g`); all have `resolved` `true`

#### Scenario: A code hook widens a block node with every produced label
- **WHEN** the test analyzes `widen` (test-plan.md § Widening samples) with `loadTestCatalogue()`: `hooked` (`docs.fetch@1` with a post code hook), `plain` (the same block, no hook), `blockonly` (the same block with a post block hook) and `use` (a code node reading the trusted field `content_type` of each)
- **THEN** `hooked` is `{ input: [], output: ["untrusted"], fields: { content: ["untrusted"] } }`, while `plain` and `blockonly` are `{ input: [], output: [], fields: { content: ["untrusted"] } }`; `use` has `input` and `output` `["untrusted"]`; the edge at `/nodes/use/input/a` has taint `["untrusted"]` and those at `b` and `c` have `[]`

## ADDED Requirements

### Requirement: Static taint includes runtime taint on hooked flows
For every flow of `hookRunNames()` and for `taint-hook-bare` (the flow `taint-hook` whose hook `sanitise` has no `input`), run to its final state with `executeRun` on `memoryWorkflowOps`, the memory run store, a real `createWorkerSandbox` pool and an invoker that answers each tool from a fixed table, the `taint` of every step row SHALL be included (`taintIncludes`) in `analyzeTaint(flow, catalogue).nodes[row.nodeId].input`, so a flow that passes the validator cannot be denied at run time for taint alone on the strength of a hook.

#### Scenario: Hooked runs stay inside the static input
- **WHEN** the test reads `hookRunNames()`, then runs the ten flows of test-plan.md § Hooked runs (each with its input, a fresh store and the table's invoker answers) and collects the rows of each run
- **THEN** `hookRunNames()` sorted equals `["end-pre", "fail", "mutate", "onion", "redirect", "skip-pay", "skip-read", "taint-hook", "undeclared"]`; each run ends in the table's final state (`skip-pay` failed `HOOK_ACTION_FORBIDDEN`, `undeclared` failed `HOOK_ROUTE_UNDECLARED`, the other eight completed) with the table's rows in `seq` order and row taints; the `violations` list of every flow is `[]`; for `taint-hook-bare` the rows `fetch`, `use_id`, `done` have `taint` `[]`, `["untrusted"]`, `["untrusted"]` and the static `input` of `fetch`, `use_id` and `done` is `[]`, `["untrusted"]` and `["untrusted"]` (for `taint-hook` all three are `["untrusted"]`)
