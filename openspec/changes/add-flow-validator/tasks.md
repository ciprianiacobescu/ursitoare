## 1. Codes and schema helpers

- [ ] 1.1 Implement `src/authoring/validate/types.ts` and `src/authoring/validate/codes.ts` (`Layer`, `Issue`, `ValidationResult`, `FLOW_ERROR_CODES`, `FLOW_WARNING_CODES`, `FLOW_RESERVED_CODES`, in the order of `codes.md`), tested first by `src/authoring/validate/codes.test.ts`, implementing requirement "The code lists"
- [ ] 1.2 Implement `src/authoring/validate/jsonschema.ts` (`jsonSchemaProblem` on the shared `Ajv2020` settings, plus the seed's `deref`, `typeSet`, `enumValues`, `admits`, `resolvePath`, `compat` with the depth cap of design D5), tested first by `src/authoring/validate/jsonschema.test.ts`, implementing requirement "jsonSchemaProblem checks embedded schemas"

## 2. The three layers

- [ ] 2.1 Implement `test/support/flow-cases/index.ts` (`flowCases`, `caseCatalogue`), `src/authoring/validate/schema.ts`, `src/authoring/validate/l1.ts` and `src/authoring/validate/validate.ts` (`validateFlow` with the gating, sorting, de-duplication and guard of D1 and D2, running L1 only; `validateFlowText` with the `L1_PARSE` mapping), and copy the `l1-*` invalid case files into `test/support/flow-cases/invalid/`, tested first by `src/authoring/validate/validate.test.ts` (the parse failures of the scenario) and `src/authoring/validate/cases-l1.test.ts`, implementing requirements "Text that does not parse is one L1 error" and "Every error code has a case file"
- [ ] 2.2 Implement `src/authoring/validate/graph.ts` and `src/authoring/validate/l2.ts`, run L2 from `src/authoring/validate/validate.ts`, add the optional member `delegateWorkflows` to `Catalogue` in `src/authoring/format/catalogue.ts`, and copy the `l2-*` invalid case files, tested first by `src/authoring/validate/cases-l2.test.ts` (the case table and the delegate scenario), implementing requirements "Every error code has a case file" and "Catalogue lookups follow the Catalogue interface"
- [ ] 2.3 Implement `src/authoring/validate/l3.ts` (references, dominance, types, switch keys, item scope, per D5), run it from `src/authoring/validate/validate.ts`, and copy the invalid `l3-*` case files that are not taint cases, tested first by `src/authoring/validate/cases-l3.test.ts`, implementing requirement "Every error code has a case file"
- [ ] 2.4 Implement `src/authoring/validate/taint-checks.ts` (the sinks of D6 over `analyzeTaint`, and `W_LETHAL_TRIFECTA` from `flowCapabilities`), call it from `src/authoring/validate/l3.ts`, and copy the `l3-taint-*` invalid case files, `l3-taint-via-code`, and the `valid/` and `warnings/` case files with the edits of `codes.md`, tested first by `src/authoring/validate/taint.test.ts`, implementing requirement "Taint uses the shared algebra"

## 3. The whole validator

- [ ] 3.1 Add the export line to `src/authoring/index.ts`, create `src/authoring/validate/index.ts`, and finish `validateFlow` (the `INTERNAL_ERROR` guard for a throwing catalogue and `TaintError`), tested first by `src/authoring/validate/whole.test.ts` (RF-1 and its variants, the JSON form of RF-1, gating, key order, the valid and warning case tables and the coverage of all 47 and 5 codes, the mutations and the recursive schema), implementing requirements "validateFlow runs three gated layers", "Every error code has a case file", "Valid and warning cases hold" and "The validator never crashes into a pass"

## 4. Diagnostics document

- [ ] 4.1 Implement `src/authoring/validate/diagnostics.ts` (`DIAGNOSTICS`, `diagnosticAnchor`, `diagnosticLink`, `renderDiagnosticsDoc`) and create `docs/authoring/diagnostics.md` as its exact output, tested first by `src/authoring/validate/diagnostics.test.ts`, implementing requirement "Diagnostics are documented"

## 5. The command

- [ ] 5.1 Implement `src/authoring/validate/catalogue-file.ts` (`catalogueFromJson`, `CatalogueFileError`) tested first by `src/authoring/validate/catalogue-file.test.ts`, implementing requirement "A catalogue file feeds the command"
- [ ] 5.2 Implement `src/cli/flow/validate.ts` (`flowValidateCommand`) and `src/cli/flow/index.ts` (`registerFlowCommands`), call `registerFlowCommands(registry)` from `createDefaultRegistry()` in `src/cli/builtin.ts`, and change the test `src/cli/main.test.ts::C-2687097e registerAdminCommands and createDefaultRegistry list the five admin commands` so the default registry expects the five admin commands and then `flow validate`, tested first by `src/cli/flow/validate.test.ts`, implementing requirement "flow validate checks a file"
