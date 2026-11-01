## Purpose

The flow format v0 model shared by every authoring unit: typed documents, a safe parser for YAML and JSON text, one canonical JSON form with a content hash, the `${{ }}` reference grammar, node-structure helpers and the `Catalogue` interface.

## ADDED Requirements

### Requirement: Flow text is parsed into a plain document or refused with a code
`parseFlowText(text, format, limits?)` SHALL return `{ ok: true, doc }` holding only plain JSON values, or `{ ok: false, error }` with one `ParseError` whose `code` is one of the `FORMAT_*` codes; it SHALL NOT throw for any string.

#### Scenario: YAML and JSON parse to the same document
- **WHEN** the test parses a four-node sample as YAML (with an anchor `&o` on one `output_schema` and two `*o` aliases, a `${{ inputs.invoice_id }}` reference, a `# comment`), as `JSON.stringify` of the expected object, and as that JSON text prefixed with U+FEFF; and parses the empty text `""` as YAML; and calls `formatOf("flow.JSON")`, `formatOf("flow.yaml")`, `formatOf("flow.yml")`, `formatOf("flow")`
- **THEN** all three results equal `{ ok: true, doc: <the expected object, aliases expanded to equal copies> }`, the empty text gives `{ ok: true, doc: null }`, and `formatOf` gives `"json"`, `"yaml"`, `"yaml"`, `"yaml"`

#### Scenario: Malformed text is refused with a code and a position
- **WHEN** the test parses the YAML texts `a: 1\nb: [1, 2\n`, `a: 1\na: 2\n`, `a: !foo 1\n` and `a: 1\n---\nb: 2\n`, and the JSON text `{"a": 1,}`
- **THEN** each result has `ok` false and `error.code` equal to `FORMAT_YAML_SYNTAX` (line 3, column 1), `FORMAT_DUPLICATE_KEY` (line 2, column 1), `FORMAT_UNSUPPORTED_TAG` (line 1, column 4), `FORMAT_YAML_SYNTAX` and `FORMAT_JSON_SYNTAX`; every `message` is a non-empty string without a newline, and the JSON error has no `line`

#### Scenario: Values that are not JSON are refused
- **WHEN** the test parses the YAML texts `a: !!binary abc`, `a: !!timestamp 2020-01-01`, `a: !!set {x}`, `a: .nan`, `l: [1, .inf]`, `a: "x\u0000y"` and `a: "\ud800"` (the last two use YAML escapes), and the JSON text `{"a":"\ud800"}`
- **THEN** each result has `ok` false and `error.code` `FORMAT_NOT_JSON`, with `error.path` equal to `/a`, `/a`, `/a`, `/a`, `/l/1`, `/a`, `/a` and `/a`

### Requirement: Parsing is bounded in size, depth and aliases
`parseFlowText` SHALL refuse text larger than `maxBytes` bytes before parsing, containers nested deeper than `maxDepth`, and alias expansion beyond `maxAliasCount`, with `FORMAT_TOO_LARGE`, `FORMAT_TOO_DEEP` and `FORMAT_ALIAS_LIMIT`; the defaults are `DEFAULT_PARSE_LIMITS` and a caller can only lower a limit.

#### Scenario: Size is measured in bytes before parsing
- **WHEN** the test parses the YAML comment text `"#" + "a".repeat(1048575)` (1,048,576 bytes) with no limits and with `{ maxBytes: -1 }`, `"#" + "a".repeat(1048576)` with no limits and with `{ maxBytes: 5000000 }`, and the text `#éééé` (9 bytes, 5 characters) with `{ maxBytes: 8 }` and with `{ maxBytes: 9 }`
- **THEN** the results are `{ ok: true, doc: null }` twice, then `FORMAT_TOO_LARGE` three times (the last for `#éééé` with 8), then `{ ok: true, doc: null }`

#### Scenario: Deep and self-referencing documents are refused
- **WHEN** the test parses YAML `"a: " + "[".repeat(63) + "]".repeat(63)` and the same with 64 brackets, JSON `"[".repeat(64) + "]".repeat(64)` and the same with 65, YAML `"a: " + "[".repeat(100000) + "]".repeat(100000)`, JSON `"[".repeat(100000) + "]".repeat(100000)`, and YAML `a: &x [*x]`; and parses `{"a":[[[1]]]}` as JSON with `{ maxDepth: 4 }` and with `{ maxDepth: 3 }`
- **THEN** the first and third succeed (depth 64), the second, fourth, fifth, sixth and seventh give `FORMAT_TOO_DEEP`, and the last two give `{ ok: true }` then `FORMAT_TOO_DEEP`

#### Scenario: Alias expansion is bounded
- **WHEN** the test parses a YAML alias bomb (anchor `l0` of nine scalars, then anchors `l1` to `l9`, each a list of nine aliases of the previous), a document with one anchor and 10 aliases of it, and the YAML `a: &x 1\nb: *x\n` with `{ maxAliasCount: 0 }` and with no limits
- **THEN** the bomb gives `FORMAT_ALIAS_LIMIT`, the 10 aliases give `{ ok: true }` with ten equal copies, and the last two give `FORMAT_ALIAS_LIMIT` then `{ ok: true, doc: { a: 1, b: 1 } }`

### Requirement: Canonical JSON is one string per meaning
`canonicalJson(doc)` SHALL return compact JSON with keys sorted at every depth, array order kept and every reference in a value field re-printed as `${{ <ref> }}`, and SHALL throw `FormatError` for a value that is not JSON; `canonicalizeFlow` SHALL return the same tree without mutating its input.

#### Scenario: Canonical JSON ignores order, surface and reference spacing
- **WHEN** the test takes a sample flow with a `fetch` block (`with: { invoice_id: "${{inputs.invoice_id}}" }`), an `extract` node (`input: { text: "Total ${{  nodes.fetch.output.raw_text }} due" }`, `instructions: "keep   ${{ spaced }}   as is"`), a node-level `post` block hook (`with: { text: "${{hook.output.summary}}" }`), a flow-level rule in `hooks` whose `pre` code hook has `input: { a: "${{inputs.x}}" }` and `source: "return   ${{ b }}"`, and a `description: "d ${{  inputs.x }}"`; it builds the document as YAML, as JSON with every object's keys reversed, and as a JS object whose `nodes` are inserted in reverse order, and calls `canonicalJson` on each
- **THEN** the three strings are equal; they contain `${{ inputs.invoice_id }}`, `${{ nodes.fetch.output.raw_text }}`, `${{ hook.output.summary }}` and `${{ inputs.x }}`, and contain unchanged `keep   ${{ spaced }}   as is`, `return   ${{ b }}` and `d ${{  inputs.x }}`; `canonicalEqual` is true for each pair

#### Scenario: Canonical JSON keeps real differences and unusual keys
- **WHEN** the test changes one thing at a time in a copy of the sample (a `with` literal; the order of `outcomes`; a trailing space in `source`; the `description` deleted; `expose: "mcp"` added; a `routes` entry of a code hook), and compares `canonicalJson(JSON.parse('{"__proto__":{"x":1},"a":1}'))` with `canonicalJson({ a: 1 })`; and calls `canonicalizeFlow` on a sample it then compares with a `structuredClone` taken before
- **THEN** every changed copy gives a string different from the original and `canonicalEqual` false; the `__proto__` document gives exactly `{"__proto__":{"x":1},"a":1}`, which is not `{"a":1}`; the input is deep-equal to its clone and `canonicalizeFlow` returns a different object

#### Scenario: Canonical form refuses what is not JSON
- **WHEN** the test calls `canonicalJson` with `{ a: NaN }`, `{ a: [1, Infinity] }`, `{ a: 10n }`, `{ a: new Date(0) }`, `{ a: new Uint8Array(1) }`, `{ a: "x\u0000" }`, `{ a: "\ud800" }`, `{ a: [undefined] }`, a self-referencing object, and 65 nested arrays; and `canonicalJson({ a: undefined, b: 1 })`
- **THEN** the first eight throw `FormatError` with `code` `FORMAT_NOT_JSON` and `path` `/a`, `/a/1`, `/a`, `/a`, `/a`, `/a`, `/a`, `/a/0`; the last two throw `FormatError` with `code` `FORMAT_TOO_DEEP`; and the final call returns `{"b":1}`

### Requirement: The content hash identifies a canonical flow
`contentHash(doc)` SHALL return `sha256:` followed by the 64 lowercase hex digits of the SHA-256 of the UTF-8 bytes of `canonicalJson(doc)`, and `isContentHash` SHALL accept exactly that form.

#### Scenario: The hash is sha256 of the canonical JSON
- **WHEN** the test (importing from `src/authoring/index.ts`) calls `contentHash` on `{ a: 1 }`, `{}`, the tiny flow `{ ursitoare: "0.1", flow: "tiny", version: "1.0.0", inputs: { type: "object" }, start: "done", nodes: { done: { kind: "end", status: "completed" } } }`, that flow with `description: "x"` added, and the sample from the canonical scenarios as YAML, as key-reversed JSON and with the references in its value fields written without spaces, and with `expose: "mcp"` added; and calls `isContentHash` on each result, on the same string upper-cased after the prefix, on a 63-digit form, on the digits without prefix, on the hash plus `"\n"`, and on `42` and `null`
- **THEN** the first three hashes are `sha256:015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862`, `sha256:44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a` and `sha256:0d2c3f8cef5b486e5c594843f5712c8ce7e9e234206ad8adeefa1a6fff70f1c9`; the `description` and `expose` variants differ from their originals; the three sample forms give one hash; `isContentHash` is true for the real hashes and false for the other six inputs

### Requirement: References are parsed by one grammar
`parseRef`, `scanTemplate`, `isSingleRef`, `refToString`, `suspiciousInterpolation`, `walkStrings` and `escapePointer` SHALL implement the reference grammar of format v0 with the added `hook` root, never throwing.

#### Scenario: A reference is parsed or explained
- **WHEN** the test calls `parseRef` on `inputs.invoice_id`, `nodes.fetch.output.raw_text`, `nodes.classify.outcome`, `item`, `item.id`, `hook.input.amount`, `hook.from.id`, and on `inputs`, `nodes.a.foo`, `nodes.a.outcome.x`, `nodes.A.output.x`, `x.y`, `hook.foo.x`, `hook.input`, `hook`, `inputs..a`, `inputs.a-b`, `""`
- **THEN** the valid ones return `{ ref }` equal to `{ root: "inputs", path: ["invoice_id"] }`, `{ root: "node", id: "fetch", field: "output", path: ["raw_text"] }`, `{ root: "node", id: "classify", field: "outcome", path: [] }`, `{ root: "item", path: [] }`, `{ root: "item", path: ["id"] }`, `{ root: "hook", scope: "input", path: ["amount"] }`, `{ root: "hook", scope: "from", path: ["id"] }`, and `refToString` of each gives the input back; the others return `{ error }` equal, in order, to `"inputs" needs a path, e.g. inputs.<name>`; `"nodes.a.foo" is not a reference; use nodes.a.output.<path> or nodes.a.outcome`; `nodes.<id>.outcome takes no further path`; `invalid node id "A" in reference`; `unknown reference root "x" (expected inputs, nodes, item or hook)`; `unknown hook scope "foo" (expected input, output, node, next or from)`; `"hook.input" needs a path, e.g. hook.input.<field>`; `"hook" needs a scope and a path, e.g. hook.input.<field>`; `malformed reference "inputs..a"`; `invalid path segment in "inputs.a-b"`; `malformed reference ""`

#### Scenario: Templates are scanned into segments
- **WHEN** the test scans `Pay ${{ inputs.amount }} to ${{nodes.q.output.name}}!`, `${{ inputs.a }}`, `x ${{ inputs.a }}`, `plain`, `""`, `${{ inputs.a`, `${{ a{b }}` and `${{ nope }}`; calls `suspiciousInterpolation` on `inputs.invoice_id`, `{{ inputs.x }}`, `${x}` and `hello`; walks `{ "a/b": ["x", { "c~d": "y" }], "n": 1 }` from path `""` with `walkStrings`; and calls `escapePointer("a/b~")`
- **THEN** the first scan is the text `Pay `, the reference `${{ inputs.amount }}` (`{ root: "inputs", path: ["amount"] }`), the text ` to `, the reference `${{nodes.q.output.name}}` (`{ root: "node", id: "q", field: "output", path: ["name"] }`) and the text `!`; `isSingleRef` is true for the second, sixth, seventh and eighth scans and false for the others; `""` gives `[]`; the unterminated one is one reference segment with `error` `unterminated ${{ (missing }})`; the brace one has `error` `unexpected brace inside reference "a{b"`; the last has the `unknown reference root "nope"` message of the previous scenario; `suspiciousInterpolation` returns `"inputs.invoice_id" looks like a reference but is not wrapped in ${{ }}; it will be treated as literal text`, `"{{ ... }}" is not reference syntax; references are written ${{ ... }}`, `"${ ... }" is not reference syntax; references are written ${{ ... }}` and `null`; the walk visits `("x", "/a~1b/0")` then `("y", "/a~1b/1/c~0d")` and nothing else; `escapePointer` returns `a~1b~0`

### Requirement: Node structure is read through shared helpers
`valueFields` and `hookValueFields` SHALL list the value-holding fields of a node or hook, and `successorFields` and `requiredSuccessorFields` SHALL list a node's successor fields, so that no other unit repeats the per-kind tables.

#### Scenario: Value fields and successors per node kind
- **WHEN** the test calls `valueFields` on a `block` node with `with`, a `foreach` with `items` and `with`, an `end` with and without `output`, `human.approval`, `switch`, `llm.decide`, `agent`, `{ kind: "nope" }`, `null` and `"x"`; `hookValueFields` on a code hook with `input` and `source`, a block hook with `input` and `with`, and `{ kind: "block" }`; `successorFields` on a `block` with `next: "b"`, a `human.form` with `next: "a"` and `on_timeout: "t"`, an `llm.decide` with `cases: { ok: "a", "x/y": "b" }`, a `switch` with `cases: { k: "a" }` and `default: "d"`, a `human.approval` with `cases: { approved: "a", rejected: "r", timeout: "t" }`, an `end`, a `block` without `next`, and `null`; and `requiredSuccessorFields` on `block`, `human.form`, `delegate`, `switch` and `end`
- **THEN** `valueFields` returns the fields `with`; `items` then `with`; `output`; none; `summary`; `on`; `input`; `input`; and `[]` for the last three, each as `{ field, value }`; `hookValueFields` returns `input`; `input` then `with`; `[]`; `successorFields` returns `[{ path: "/next", id: "b", producesOutput: true }]`; `/next` with `true` then `/on_timeout` with `false`; `/cases/ok` and `/cases/x~1y`, both `true`; `/cases/k` then `/default`; `/cases/approved` and `/cases/rejected` with `true` and `/cases/timeout` with `false`; `[]` for the `end`, the `block` without `next` and `null`; and `requiredSuccessorFields` returns `["next"]`, `["next", "on_timeout"]`, `["next", "on_timeout"]`, `[]` and `[]`

### Requirement: The catalogue is an interface with a versioned-reference helper
The module SHALL define `Catalogue` as five synchronous lookups that return a definition or `undefined`, `emptyCatalogue` SHALL answer `undefined` to all of them, and `parseVersionedRef` SHALL split `name@major` or return `undefined`.

#### Scenario: Empty catalogue and versioned references
- **WHEN** the test calls `emptyCatalogue.block("invoices.get@1")`, `.modelProfile("default")`, `.role("approver")`, `.delegateTarget("n8n", "archive-invoice")` and `.flow("notify-customer", 1)`; and `parseVersionedRef` on `invoices.get@1`, `notify-customer@12`, `x@0`, `invoices.get`, `@1`, `a@`, `A@1`, `a@01`, `a@-1`, `a@1@2`, `a@1 ` and `a@1234567890`
- **THEN** the five lookups return `undefined`; the first three refs give `{ name: "invoices.get", major: 1 }`, `{ name: "notify-customer", major: 12 }` and `{ name: "x", major: 0 }`; the other nine give `undefined`

### Requirement: The format is documented and the documentation is checked
`docs/authoring/format.md` SHALL name every top-level field, node kind, v0.2 field, hook field, reference root and scope, `FORMAT_*` code and parse limit the module defines, as inline code spans, and `missingDocTerms` SHALL report the terms it lacks.

#### Scenario: The documentation names every term
- **WHEN** the test checks that `docs/authoring/format.md` exists, reads it and calls `documentedTerms()` and `missingDocTerms` on the file, on `""`, and on the file with every `` `hooks` `` removed
- **THEN** the file exists; `documentedTerms()` has no duplicates and includes the 14 kinds (`block`, `code`, `llm.extract`, `llm.generate`, `llm.decide`, `agent`, `switch`, `human.approval`, `human.form`, `foreach`, `subflow`, `delegate`, `wait`, `end`), the 9 top-level fields (`ursitoare`, `flow`, `version`, `description`, `inputs`, `start`, `nodes`, `hooks`, `expose`), `skill_mode`, `context_budget`, `max_retries`, `hook`, `FORMAT_NOT_JSON`, `sha256`, `maxBytes`, `1048576`, `maxDepth` and `maxAliasCount`; `missingDocTerms` of the file is `[]`, of `""` equals `documentedTerms()`, and of the file without `` `hooks` `` equals `["hooks"]`
