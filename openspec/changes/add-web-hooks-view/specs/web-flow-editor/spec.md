## Purpose

The editor's diagnostics understand the hook layer `H` that the engine adds for flows with hooks, and link every hook code to its guide section.

## ADDED Requirements

### Requirement: Diagnostics accept layer H and link hook codes
`parseValidation` SHALL accept the layer `H` in an issue and in `layers_run`, as it accepts `L1`, `L2` and `L3`, and still refuse any other layer name; `diagnosticHref` SHALL link a code that starts with `H_` followed by one or more of `A-Z`, `0-9` and `_`; `diagnosticRows` and `diagnosticsSummary` SHALL show an `H` issue and the layer list like any other. For every code of `HOOK_ERROR_CODES` and `HOOK_WARNING_CODES`, `diagnosticHref(code)` SHALL equal `REPO_DOCS_BASE` plus `diagnosticLink(code)`.

#### Scenario: Layer H is parsed, shown and linked
- **WHEN** `parseValidation` gets `V` of test-plan.md, `V` with `layers_run: ["L9"]`, `V` with its error's `layer` set to `"L9"`, and `V` with `layers_run: ["h"]`; `diagnosticRows` and `diagnosticsSummary(V, null)` run on the first result; `diagnosticHref` gets `H_ROUTE_EFFECT`, `H_CYCLE`, `W_NO_MATCH`, `H_`, `H_lower`, `HOOK_X` and `X_ROUTE`
- **THEN** the first result deep-equals `V`; the next three give `null`; the rows are `{ key: "error:0", severity: "error", code: "H_ROUTE_EFFECT", message: "hook rush may route to pay", where: "Node classify · /nodes/classify/post/0/routes/0", href: REPO_DOCS_BASE + "docs/authoring/diagnostics.md#h_route_effect", linkText: "Guide for H_ROUTE_EFFECT (opens in a new tab)", path: "/nodes/classify/post/0/routes/0", position: null }` and `warning:0` for `W_NO_MATCH` with `where` "/hooks/0" and `linkText` "Guide for W_NO_MATCH (opens in a new tab)"; the summary is "Not valid. 1 error, 1 warning. Layers run: L1, L2, L3, H."; the hrefs are the base plus `docs/authoring/diagnostics.md#h_route_effect`, `#h_cycle` and `#w_no_match`, then four times `null`

#### Scenario: Every hook code has a guide link
- **WHEN** `test/web-flow-editor/hook-link-parity.test.ts` reads `HOOK_ERROR_CODES` and `HOOK_WARNING_CODES` from `src/authoring/index.ts` and compares `diagnosticHref(code)` with `REPO_DOCS_BASE + diagnosticLink(code)` for each
- **THEN** the lists hold 8 and 1 codes (`H_SCHEMA`, `H_BLOCK`, `H_ROUTE_TARGET`, `H_ROUTE_HUMAN`, `H_ROUTE_EFFECT`, `H_RETRY_SCOPE`, `H_CYCLE`, `H_DOMINANCE`, and `W_NO_MATCH`), every comparison is equal, and no `diagnosticLink` answer is `null`
