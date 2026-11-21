## MODIFIED Requirements

### Requirement: Complete module graph as data
`test/arch/modules.ts` SHALL export `MODULES`, the complete Phase-1 module graph of the roadmap appendix including modules that do not exist yet, and `checkGraphIntegrity` SHALL report any inconsistency in it with code `ARCH_GRAPH_INVALID`.

#### Scenario: The graph holds the 30 modules
- **WHEN** a test first asserts `checkGraphIntegrity()` is `[]`, then reads `Object.keys(MODULES)`, `MODULES.core.allowed`, `MODULES.api.allowed`, `MODULES.cli.allowed`, the `egress` values and `collectImports` of the entry for `src/cli/flow/test.ts` in `readSnapshot()`
- **THEN** the keys are, in this order, `core`, `config`, `observability`, `db`, `tenancy`, `audit`, `identity`, `pdp`, `authoring`, `authority`, `registry`, `grants`, `durable`, `runs`, `sandbox`, `gateway`, `tools`, `credentials`, `llm`, `interpreter`, `runtimes`, `tasks`, `publish`, `triggers`, `assist`, `eval`, `mcp`, `templates`, `api`, `cli`; `core.allowed` is `[]`; `sandbox.allowed` is `["core","config"]`; `api.allowed` has 26 names and lacks `sandbox`, `runtimes`, `api` and `cli`; `cli.allowed` equals `api.allowed` followed by `sandbox` (27 names, `sandbox` last); `egress` is `otlp` for `observability`, `oidc` for `identity`, `tools` for `gateway` and absent elsewhere; the imports of `src/cli/flow/test.ts` include one with specifier `../../sandbox/index.ts` and `typeOnly` false, so the new edge is used

#### Scenario: The graph carries the version 3 edges
- **WHEN** a test reads the `allowed` lists of `registry`, `llm`, `runtimes`, `mcp`, `triggers`, `eval`, `runs` and `publish`
- **THEN** `registry` includes `identity`; `llm` includes `tools`; `runtimes` includes `registry` and `grants`; `mcp` and `triggers` include `publish`; `eval` and `runs` include `durable`; `publish` has the 12 names `core`, `db`, `tenancy`, `audit`, `registry`, `grants`, `authority`, `tasks`, `pdp`, `runs`, `durable`, `identity`; no key is named `runtime`

#### Scenario: The shipped graph is consistent
- **WHEN** `checkGraphIntegrity()` runs on `MODULES`
- **THEN** it returns `[]` (every allowed name is a key, no self reference, no duplicate, no cycle, egress set as pinned)

#### Scenario: Inconsistent graphs are reported
- **WHEN** `checkGraphIntegrity` runs on `{ a: { allowed: ["b"] }, b: { allowed: ["a"] } }`, then on `{ a: { allowed: ["zzz"] } }`, then on `{ a: { allowed: ["a"] } }`, then on `{ a: { allowed: ["b", "b"] }, b: { allowed: [] } }`
- **THEN** each call returns violations with code `ARCH_GRAPH_INVALID` at `test/arch/modules.ts:1`, and some message of each contains respectively `cycle`, `zzz`, `itself` and `twice`; each result also carries the egress-pin violations (these fixtures name no egress module), so the test asserts with `some`, not on the length

#### Scenario: A new egress capability is refused
- **WHEN** `checkGraphIntegrity` runs on a copy of `MODULES` where `db` has `egress: "tools"`, and on a copy where `gateway` has `egress` removed
- **THEN** each returns a violation with code `ARCH_GRAPH_INVALID` naming the module (`db` or `gateway`), and an `egress` value outside `tools`, `oidc`, `otlp` is reported too
