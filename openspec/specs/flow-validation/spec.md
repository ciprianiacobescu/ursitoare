# flow-validation Specification

## Purpose
Decide whether a flow document is well formed, uses only known blocks, roles and flows, and moves data and untrusted content safely, reporting every problem as a coded, located diagnostic that a person can look up.

## Requirements

### Requirement: The code lists
`FLOW_ERROR_CODES` SHALL hold the 47 error codes, `FLOW_WARNING_CODES` the 5 warning codes and `FLOW_RESERVED_CODES` the reserved `INTERNAL_ERROR`, as `codes.md` lists them.

#### Scenario: The code lists are exact
- **WHEN** `FLOW_ERROR_CODES`, `FLOW_WARNING_CODES` and `FLOW_RESERVED_CODES` are read
- **THEN** `FLOW_ERROR_CODES` has 47 distinct entries, the first 19 starting `L1_`, the next 16 `L2_`, the last 12 `L3_`; `FLOW_WARNING_CODES` equals `["W_LETHAL_TRIFECTA", "W_TAINT_TO_OPAQUE_CALL", "W_OPTIONAL_REFERENCE", "W_SUSPICIOUS_INTERPOLATION", "W_CODE_FORBIDDEN_API"]`; `FLOW_RESERVED_CODES` equals `["INTERNAL_ERROR"]`; no code is in two lists

### Requirement: validateFlow runs three gated layers
`validateFlow` SHALL run L1, then L2 only when L1 produced no error, then L3 only when L2 produced none, and return issues sorted by layer, path, code and message with `layers_run` naming the layers that ran.

#### Scenario: RF-1 and its variants validate
- **WHEN** `validateFlow` checks `loadTestFlow("rf-1-invoice-intake")`, `"rf-1-core"` and `"rf-1-core-approval"` against `loadTestCatalogue()`
- **THEN** each result has `ok: true`, `errors: []` and `layers_run: ["L1", "L2", "L3"]`; the RF-1 result has exactly one warning, `W_LETHAL_TRIFECTA`, with node `null`, path `/nodes` and a message that contains `invoices.get@1` and `erp.create_payment@1`

#### Scenario: Layers gate, order is stable, non-objects fail in L1
- **WHEN** `validateFlowText` checks `l1-required-start` and `l2-unknown-block` (case files), RF-1 with its `nodes` keys reversed, and `validateFlow` is given `null`, `5`, `"x"`, `[]`, `true` and `{}`
- **THEN** the first has `layers_run: ["L1"]`, the second `["L1", "L2"]`; the reversed RF-1 result deep-equals the original; each of the six values gives `ok: false`, at least one error, every error `layer: "L1"`, and no call throws

### Requirement: Every error code has a case file
Each file in `test/support/flow-cases/invalid/` SHALL yield exactly the distinct error codes in its `# expect:` header, all from one layer, with that layer last in `layers_run`; each of the 47 codes SHALL be expected by some file.

#### Scenario: Each invalid case yields exactly its codes
- **WHEN** every invalid case file (115) is run through `validateFlowText(text, "yaml", caseCatalogue())`
- **THEN** for each, `ok` is false, the sorted distinct codes of `errors` equal `expect`, all errors share one layer and each code starts with `<layer>_`, `layers_run` ends with that layer, `message` is non-empty, `node` is null or a string, `path` is a string; every code of `FLOW_ERROR_CODES` appears in some `expect` and every expected code is in `FLOW_ERROR_CODES`

### Requirement: Valid and warning cases hold
Each file in `valid/` SHALL give no error and no warning, each file in `warnings/` no error and exactly the warnings in its `# expect-warnings:` header, and each of the 5 warning codes SHALL be expected by at least one file.

#### Scenario: Valid cases pass and warning cases warn
- **WHEN** the 29 valid and 13 warning case files are validated against `caseCatalogue()`
- **THEN** every valid file has `errors: []`, `warnings: []` and `layers_run: ["L1", "L2", "L3"]` (including `taint-extract-then-code-passes`); every warning file has `errors: []` and distinct warning codes equal to `expectWarnings`; every code of `FLOW_WARNING_CODES` is expected by a warning file

### Requirement: Text that does not parse is one L1 error
`validateFlowText` SHALL turn a parse refusal into a single `L1_PARSE` issue that carries U22's `FORMAT_*` code, and otherwise validate the parsed document.

#### Scenario: Parse failures become L1_PARSE
- **WHEN** `validateFlowText` gets `l1-parse-custom-tag`, `l1-parse-duplicate-key` and `l1-parse-invalid-yaml` as YAML, `"{"` as JSON, and RF-1 as JSON text (`JSON.stringify` of the loaded flow)
- **THEN** the first three give `ok: false`, `layers_run: ["L1"]`, one error with code `L1_PARSE`, node `null`, and a message starting `FORMAT_UNSUPPORTED_TAG: `, `FORMAT_DUPLICATE_KEY: ` and `FORMAT_YAML_SYNTAX: `; the JSON `"{"` gives `L1_PARSE` with a message starting `FORMAT_JSON_SYNTAX: `; the JSON form of RF-1 has the same errors and warnings as the YAML form

### Requirement: Taint uses the shared algebra
L3 SHALL take every taint decision from `analyzeTaint` and `flowCapabilities`: an `untrusted` reference into a non-read block or an effectful agent is an error, `extracted` data is not, and `code` output keeps its input's taint.

#### Scenario: Code no longer launders
- **WHEN** `l3-taint-via-code` (a fetch, a `code` node over `nodes.fetch.output.content`, then `mail.send@1` with the code output as `body`) and `taint-extract-then-code-passes` (an `llm.extract` between the fetch and the code) are validated
- **THEN** the first has exactly one error, `L3_TAINT_TO_CONSEQUENTIAL`, node `send`, path `/nodes/send/with/body`; the second has no error and no warning

#### Scenario: Trifecta and opaque-call warnings come from U23's results
- **WHEN** `trifecta-all-three`, `trifecta-via-agent-tools`, `trifecta-absent-no-private`, `taint-to-opaque-delegate` and `taint-to-opaque-subflow` are validated, and `taint-via-extract-passes` is given, on its `extract` node, `pre: [{ id: h, kind: block, uses: "mail.send@1", with: { to: "a@example.com", subject: "s", body: "${{ nodes.fetch.output.content }}" } }]`
- **THEN** the first two give exactly the warning `W_LETHAL_TRIFECTA`, the third none, the next two exactly `W_TAINT_TO_OPAQUE_CALL`; the hooked flow has no error and no warning (hook edges are not checked here)

### Requirement: Catalogue lookups follow the Catalogue interface
L2 SHALL report an unknown block, role, flow or model profile from the `Catalogue` it is given, and SHALL tell an unknown delegate target from an unknown workflow only when the catalogue offers `delegateWorkflows`.

#### Scenario: The two delegate codes
- **WHEN** `l2-unknown-delegate-target` (target `zapier`), `l2-unknown-delegate-workflow` (`n8n`, workflow `do-everything`) and `l2-unknown-delegate-target-prototype-name` (target `constructor`) are validated against `caseCatalogue()`, and the second again against `loadTestCatalogue()` (no `delegateWorkflows`)
- **THEN** the first and third give exactly `L2_UNKNOWN_DELEGATE_TARGET`, the second exactly `L2_UNKNOWN_DELEGATE_WORKFLOW`, and the second against `loadTestCatalogue()` gives exactly `L2_UNKNOWN_DELEGATE_TARGET`; no message holds the text `available`

### Requirement: The validator never crashes into a pass
`validateFlow` SHALL never throw and SHALL report a failure of its own as an `INTERNAL_ERROR` issue and `ok: false`.

#### Scenario: Crashes, limits and mutations
- **WHEN** a catalogue whose `block` throws `new Error("boom")` validates RF-1; a `switch` `s` on `${{ inputs.k }}` (a required string input) with cases `k0` to `k4999` leading to the `end` nodes `e0` to `e4999` and `default: e0` (5,001 nodes) is validated; a flow whose input property `x` is `{ anyOf: [{ $ref: "#/properties/x" }] }` is read as `${{ inputs.x }}` into a string parameter; and 1,000 random mutations of RF-1 (a seeded xorshift, 1 to 3 edits each: delete a value or set it to `null`, `0`, `""`, `{}`, `[]`, `"${{"`, `"__proto__"`) are validated
- **THEN** the first has `ok: false` and exactly one error, layer `L2`, code `INTERNAL_ERROR`, message starting `validator crashed: boom`; the second has an `INTERNAL_ERROR` of layer `L3` whose message starts `taint analysis limit exceeded: nodes 5001`; the third and every mutation return without throwing and without `INTERNAL_ERROR`, with `ok === (errors.length === 0)`

### Requirement: jsonSchemaProblem checks embedded schemas
`jsonSchemaProblem` SHALL return `null` for a JSON Schema 2020-12 object and a one-line string for anything else.

#### Scenario: Valid and invalid schemas
- **WHEN** `jsonSchemaProblem` gets `{ type: "object", properties: { a: { type: "string" } }, required: ["a"] }`, `{ type: "nope" }`, `{ $schema: "http://json-schema.org/draft-07/schema#" }`, `{ x: { $ref: "https://example.com/s.json" }, "x-vendor": 1 }`, `[]`, `null` and `true`
- **THEN** the first and fourth give `null`; the others give a non-empty string without a newline, and the fifth to seventh give `schema must be a JSON object`

### Requirement: Diagnostics are documented
`docs/authoring/diagnostics.md` SHALL be the exact output of `renderDiagnosticsDoc()` and document every code under the heading `### <CODE>`, whose anchor `diagnosticLink` returns.

#### Scenario: The document covers every code
- **WHEN** `renderDiagnosticsDoc()` is compared with the committed file, and `DIAGNOSTICS`, the three code lists and the headings of the file are compared
- **THEN** the two texts are equal and end with one newline; `DIAGNOSTICS` has 53 entries, one per code of the three lists in that order, each with non-empty single-line `summary` and `fix`; the file holds exactly one `### <CODE>` line per code; `diagnosticLink("L1_REQUIRED")` is `docs/authoring/diagnostics.md#l1_required`, `diagnosticAnchor("L3_REF_UNKNOWN_PATH")` is `l3_ref_unknown_path`, and `diagnosticLink("L9_NOPE")` is `null`

### Requirement: flow validate checks a file
`ursitoare flow validate --file <path>` SHALL print the verdict, the errors and the warnings, and exit 0 for a valid flow, 1 for an invalid one and 2 for a usage error or an unreadable file.

#### Scenario: flow validate prints a verdict
- **WHEN** `cliMain` (default registry) runs `["flow", "validate", "--file", rf1, "--catalogue", cat]` and the same with `--json`, then the same on the case file `l3-taint-raw-fetch-into-mail-body`, then on a JSON copy of RF-1 in which the node `pay` is renamed to `pay\u001b[31m` everywhere, where `rf1` is `test/support/catalogue/flows/rf-1-invoice-intake.yaml` and `cat` is `test/support/catalogue/blocks.v0.json` (both U24's)
- **THEN** the first exits 0 with stdout `OK <rf1> (layers run: L1 L2 L3) 0 error(s), 1 warning(s)\n` then one line starting `  warning L3 W_LETHAL_TRIFECTA /nodes: `; the `--json` run exits 0 with one line that parses to an object with `file: rf1`, `ok: true`, `errors: []`, one warning and `layers_run: ["L1","L2","L3"]`; the third exits 1 with stdout starting `INVALID `, `1 error(s)` and a line `  L3 L3_TAINT_TO_CONSEQUENTIAL /nodes/send/with/body [send]: `; the fourth exits 1 and its stdout holds no byte below 0x20 other than `\n`; stderr is empty throughout

#### Scenario: Usage and unreadable files exit 2
- **WHEN** `cliMain` runs `["flow", "validate"]`, `["flow", "validate", "--file", "/nonexistent/x.yaml"]`, `["flow", "validate", rf1]`, a directory and a 1,048,577-byte file as `--file`, `--catalogue` naming a missing file and a file holding `{"blocks":{"a\u001b@1":{"effect":"x"}}}`, then `["flow", "validate", "--file", rf1]` with no catalogue, `["flow"]` and `["help"]`
- **THEN** the first exits 2 with stderr `CLI_USAGE: missing required option --file\n`; the second `CLI_USAGE: cannot read --file (ENOENT)\n`; the third `CLI_USAGE: invalid arguments; run with --help\n`; the directory `CLI_USAGE: cannot read --file (EISDIR)\n`, the large file `CLI_USAGE: cannot read --file (too large)\n`; the missing catalogue `CLI_USAGE: cannot read --catalogue (ENOENT)\n`; the bad one stderr starting `CLI_USAGE: --catalogue is not a usable catalogue file: /blocks/a?@1/effect: `; the no-catalogue run exits 1 with an `L2_UNKNOWN_BLOCK` line; `["flow"]` exits 0 listing `flow validate`; stdout is empty for every exit 2; `help` exits 0 and lists `flow validate` and the five `admin` commands

### Requirement: A catalogue file feeds the command
`catalogueFromJson` SHALL turn the JSON catalogue document into a `Catalogue` and refuse a malformed one with a `CatalogueFileError`.

#### Scenario: Reading a catalogue file
- **WHEN** `catalogueFromJson` gets the text of `test/support/catalogue/blocks.v0.json`, `"{}"`, `"[]"`, `"nope"` and `{"roles":[1]}`
- **THEN** the first answers `block("invoices.get@1")` with effect `read`, `role("approver")` as `{ name: "approver" }`, `delegateTarget("n8n", "sync-crm")` as `{ effect: "send", untrusted_result: true }`, `delegateWorkflows("n8n")` as the three workflows, `flow("notify-customer", 1)` with `input` and `output`, and `block("__proto__")`, `role("constructor")`, `delegateWorkflows("toString")` as `undefined`; `"{}"` answers `undefined` to every lookup; the others throw `CatalogueFileError` (code `CATALOGUE_FILE_INVALID`) with messages `invalid JSON`, `/: must be an object`, `invalid JSON`, `/roles/0: must be a string`
