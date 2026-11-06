## MODIFIED Requirements

### Requirement: validateFlow runs three gated layers
`validateFlow` SHALL run L1, then L2 only when L1 produced no error, then L3 only when L2 produced none, then layer `H` (capability `hooks-static`) only when L1 to L3 produced no error and the document declares a hook, and return issues sorted by layer, path, code and message with `layers_run` naming the layers that ran; a document that declares no hook gets `layers_run` `["L1", "L2", "L3"]` and the result it always had.

#### Scenario: RF-1 and its variants validate
- **WHEN** `validateFlow` checks `loadTestFlow("rf-1-invoice-intake")`, `"rf-1-core"` and `"rf-1-core-approval"` against `loadTestCatalogue()`
- **THEN** each result has `ok: true`, `errors: []` and `layers_run: ["L1", "L2", "L3"]`; the RF-1 result has exactly one warning, `W_LETHAL_TRIFECTA`, with node `null`, path `/nodes` and a message that contains `invoices.get@1` and `erp.create_payment@1`

#### Scenario: Layers gate, order is stable, non-objects fail in L1
- **WHEN** `validateFlowText` checks `l1-required-start` and `l2-unknown-block` (case files), RF-1 with its `nodes` keys reversed, and `validateFlow` is given `null`, `5`, `"x"`, `[]`, `true` and `{}`
- **THEN** the first has `layers_run: ["L1"]`, the second `["L1", "L2"]`; the reversed RF-1 result deep-equals the original; each of the six values gives `ok: false`, at least one error, every error `layer: "L1"`, and no call throws

### Requirement: Diagnostics are documented
`docs/authoring/diagnostics.md` SHALL be the exact output of `renderDiagnosticsDoc()` and document every code of the five lists `FLOW_ERROR_CODES`, `FLOW_WARNING_CODES`, `FLOW_RESERVED_CODES`, `HOOK_ERROR_CODES` and `HOOK_WARNING_CODES` under the heading `### <CODE>`, whose anchor `diagnosticLink` returns.

#### Scenario: The document covers every code
- **WHEN** `renderDiagnosticsDoc()` is compared with the committed file, and `DIAGNOSTICS`, the five code lists and the headings of the file are compared
- **THEN** the two texts are equal and end with one newline; `DIAGNOSTICS` has 62 entries, one per code of `FLOW_ERROR_CODES`, `FLOW_WARNING_CODES`, `FLOW_RESERVED_CODES`, `HOOK_ERROR_CODES` and `HOOK_WARNING_CODES` in that order, each with non-empty single-line `summary` and `fix`, `layer` `"H"` for the nine hook entries and `null` for `INTERNAL_ERROR`; the file holds exactly one `### <CODE>` line per code; `diagnosticLink("L1_REQUIRED")` is `docs/authoring/diagnostics.md#l1_required`, `diagnosticAnchor("L3_REF_UNKNOWN_PATH")` is `l3_ref_unknown_path`, and `diagnosticLink("L9_NOPE")` is `null`

### Requirement: The code lists
`FLOW_ERROR_CODES` SHALL hold the 47 layer codes of L1, L2 and L3, `FLOW_WARNING_CODES` the 5 warning codes and `FLOW_RESERVED_CODES` the reserved `INTERNAL_ERROR`, as `codes.md` lists them; the hook codes of layer `H` live in `HOOK_ERROR_CODES` and `HOOK_WARNING_CODES` (capability `hooks-static`), never in these three lists.

#### Scenario: The code lists are exact
- **WHEN** `FLOW_ERROR_CODES`, `FLOW_WARNING_CODES` and `FLOW_RESERVED_CODES` are read
- **THEN** `FLOW_ERROR_CODES` has 47 distinct entries, the first 19 starting `L1_`, the next 16 `L2_`, the last 12 `L3_`; `FLOW_WARNING_CODES` equals `["W_LETHAL_TRIFECTA", "W_TAINT_TO_OPAQUE_CALL", "W_OPTIONAL_REFERENCE", "W_SUSPICIOUS_INTERPOLATION", "W_CODE_FORBIDDEN_API"]`; `FLOW_RESERVED_CODES` equals `["INTERNAL_ERROR"]`; no code is in two lists
