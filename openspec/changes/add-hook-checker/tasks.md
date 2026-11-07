Specs: `specs/hooks-static`, `specs/flow-validation`; rules: `design.md`; fixtures: `test-plan.md`. Every test file starts with `assert.equal(typeof <the function it tests>, "function")`, wraps calls that reach a scaffold stub in `assert.doesNotThrow`, asserts on values with `node:assert/strict`, has no `.`, `[` or `::` in test names, and imports from `src/authoring/hooks/index.ts`.

## 1. The hook model

- [x] 1.1 Write `src/authoring/hooks/model.test.ts` first (scenarios "Metas and selectors" and "when conditions", and the lists part of "Lists and links"), then implement the model types, `HOOKLESS_KINDS`, `nodeMeta`, `selectorMatches` and `whenMatches` in `src/authoring/hooks/model.ts` and the two lists in `src/authoring/hooks/codes.ts`, implementing requirements "Node metas and selectors" and "The hook codes have their own lists"
- [x] 1.2 Write `src/authoring/hooks/placements.test.ts` first (scenarios "Order, labels and exclusions" and "Routes, augmented successors and declaresHooks"), then implement `hookPlacements`, `hookRoutes`, `augmentedSuccessors` and `declaresHooks` in `src/authoring/hooks/model.ts`, implementing requirements "Hook placements follow the onion order" and "Hook routes extend the successor graph"

## 2. The checker

- [ ] 2.1 Write `src/authoring/hooks/check-schema.test.ts` first (scenarios "Malformed documents" with the 36 mutations M1 to M36 of `test-plan.md`, and "Mutated hook flows and deep graphs never throw" with the harness inside the test file, and the 5,000-node chain), then add `"H"` to `Layer` in `src/authoring/validate/types.ts`, make `HookRule.match` optional (`match?: HookSelector`, `src/authoring/format/types.ts:88-93`), and implement `checkHooks` in `src/authoring/hooks/check.ts` with the `H_SCHEMA` rules (design.md Decision 4), implementing requirement "Malformed hooks give H_SCHEMA and never throw"
- [ ] 2.2 Write `src/authoring/hooks/check.test.ts` first (scenarios "The 45 hook flows" and "Effect routes and effect retries", and the throwing-catalogue case of "Mutated hook flows and deep graphs never throw"), then complete `checkHooks` with `H_BLOCK`, `H_ROUTE_TARGET`, `H_ROUTE_EFFECT`, `H_ROUTE_HUMAN`, `H_RETRY_SCOPE`, `H_CYCLE` (explicit stack), `H_DOMINANCE` and `W_NO_MATCH`, implementing requirement "The checker reports each hook rule with its code"

## 3. The H layer

- [ ] 3.1 Write `src/authoring/hooks/layer.test.ts` first (scenario "Gating and ordering"; B, C and D fail by assertion at red, because `layers_run` lacks `"H"`), then add the gated `guarded("H", …)` block (design.md Decision 5) to `validateFlow` in `src/authoring/validate/validate.ts`, and `export * from "./hooks/index.ts";` to `src/authoring/index.ts`, implementing requirement "The H layer follows L3 for flows that declare a hook" and the modified requirement "validateFlow runs three gated layers"

## 4. Case files

- [ ] 4.1 Write `src/authoring/hooks/cases.test.ts` first (scenario "Each case file yields its codes", group sizes 9, 2 and 1), then create `test/support/hook-cases/index.ts` (`HookCaseGroup`, `HookCase`, `hookCases`), the 12 files under `test/support/hook-cases/invalid/`, `valid/` and `warnings/` built from the base flow of `test-plan.md`, and a `hook-cases/` row (owner `add-hook-checker`) in `test/support/README.md`, implementing requirement "Hook case files pin each code"

## 5. Diagnostics

- [ ] 5.1 Write `src/authoring/hooks/diagnostics-hooks.test.ts` first (the links part of "Lists and links" and "The document covers every code"), change in place `src/authoring/validate/diagnostics.test.ts::C-73b013e5: DIAGNOSTICS has one entry per code in list order with single-line text` (length 62, `allCodes()` over the five lists) and `src/authoring/validate/diagnostics.test.ts::C-73b013e5: the file holds exactly one heading per code` (headings equal to the five lists), both failing by assertion until green, then add the nine entries to `ENTRIES` and the hook lists to `isKnownCode` in `src/authoring/validate/diagnostics.ts` and regenerate `docs/authoring/diagnostics.md`, implementing the modified requirements "Diagnostics are documented" and "The code lists" and the links part of "The hook codes have their own lists"
