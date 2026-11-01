# Verification: openspec:add-flow-validator: PASS (round 1)

traceability: 15/15 criteria covered by a discriminating test

- Base: `0b89cc652e46ed23dc2f0b531b8e81ce39cb570d`
- Head: `d17393ba3ce99db8bcbe7a226adfb6171c867b8c`
- Implementer profiles: deepseek-free, claude-sonnet
- Judge: nemotron-judge, 5 call(s), judged in 5 parts, prompt sha256 `d2a8d1982521eede4fe363565916ec967969f53f3522594c0432226e80f4ba1c`
  - part 1: 32 file(s), 104131 characters, profile nemotron-judge, reply valid
  - part 2: 62 file(s), 103395 characters, profile nemotron-judge, reply valid
  - part 3: 50 file(s), 103889 characters, profile nemotron-judge, reply repaired
  - part 4: 43 file(s), 100201 characters, profile nemotron-judge, reply valid
  - part 5: 2 file(s), 13263 characters, profile nemotron-judge, reply repaired
- Judge replies of nemotron-judge (this unit, all rounds): valid 3, repaired 2, retried 0, discarded 0; this round: repaired
- independence: declared (unverified): nemotron-judge nvidia (declared), deepseek-free deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $0.0000

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.5 | base merged: main@0b89cc652e as d17393ba3c (7 commits) |
| 1 | integrity | ok | 308.2 | 11 sub-checks (+1 unfrozen by human answers); scope: 193 changed file(s) |
| 2 | build | ok | 29.9 |  |
| 3 | tests | ok | 138.1 |  |
| 4 | traceability | ok | 0.1 | 15/15 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/authoring/format/catalogue.ts, src/authoring/index.ts, src/authoring/validate/catalogue-file.ts, src/authoring/validate/codes.ts, src/authoring/validate/diagnostics.ts and 13 more |
| 8 | s1 judge | ok | 1.1 | 15/15 criteria judged by jev |
| 9 | judge | ok | 745.9 | 5 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261101T1252Z-3bf3/018-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261101T1252Z-3bf3/019-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261101T1252Z-3bf3/020-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261101T1252Z-3bf3/021-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261101T1252Z-3bf3/022-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261101T1252Z-3bf3/023-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261101T1252Z-3bf3/024-e2e.log |

## Files by part

- part 1: test/support/flow-cases/valid/agent-readonly-and-wait.yaml (2034 characters)
- part 1: test/support/flow-cases/valid/agent-with-effects-and-trusted-input.yaml (1819 characters)
- part 1: src/cli/builtin.ts (578 characters)
- part 1: src/authoring/validate/cases-l1.test.ts (2323 characters)
- part 1: src/authoring/validate/cases-l2.test.ts (4266 characters)
- part 1: src/authoring/validate/cases-l3.test.ts (2545 characters)
- part 1: src/authoring/format/catalogue.ts (659 characters)
- part 1: src/authoring/validate/catalogue-file.test.ts (3081 characters)
- part 1: src/authoring/validate/catalogue-file.ts (7121 characters)
- part 1: test/support/flow-cases/warnings/code-forbidden-api.yaml (1844 characters)
- part 1: src/authoring/validate/codes.test.ts (3388 characters)
- part 1: src/authoring/validate/codes.ts (1960 characters)
- part 1: test/support/flow-cases/valid/delegate-with-outputs-and-timeout-branch.yaml (1928 characters)
- part 1: docs/authoring/diagnostics.md (8165 characters)
- part 1: src/authoring/validate/diagnostics.test.ts (2501 characters)
- part 1: src/authoring/validate/diagnostics.ts (13865 characters)
- part 1: test/support/flow-cases/valid/dominance-approval-rejected-branch-has-output.yaml (2431 characters)
- part 1: test/support/flow-cases/valid/dominance-before-branch-ok.yaml (2309 characters)
- part 1: test/support/flow-cases/valid/dominance-join-after-both-branches-same-producer.yaml (2239 characters)
- part 1: test/support/flow-cases/valid/foreach-bare-item-primitive-array.yaml (982 characters)
- part 1: test/support/flow-cases/valid/foreach-block-items-and-results.yaml (1474 characters)
- part 1: test/support/flow-cases/valid/foreach-subflow.yaml (1114 characters)
- part 1: src/authoring/validate/graph.ts (5476 characters)
- part 1: test/support/flow-cases/valid/human-form.yaml (1987 characters)
- part 1: src/authoring/index.ts (352 characters)
- part 1: src/cli/flow/index.ts (695 characters)
- part 1: test/support/flow-cases/index.ts (2663 characters)
- part 1: test/support/flow-cases/valid/json-literals-in-values.yaml (1873 characters)
- part 1: src/authoring/validate/jsonschema.test.ts (1530 characters)
- part 1: src/authoring/validate/jsonschema.ts (8408 characters)
- part 1: src/authoring/validate/l1.ts (10915 characters)
- part 1: test/support/flow-cases/invalid/l1-additional-property-end-next.yaml (1606 characters)
- part 2: test/support/flow-cases/invalid/l1-additional-property-node.yaml (1584 characters)
- part 2: test/support/flow-cases/invalid/l1-additional-property-top.yaml (1581 characters)
- part 2: test/support/flow-cases/invalid/l1-code-no-return.yaml (1797 characters)
- part 2: test/support/flow-cases/invalid/l1-code-return-only-nested.yaml (1863 characters)
- part 2: test/support/flow-cases/invalid/l1-code-syntax.yaml (1778 characters)
- part 2: test/support/flow-cases/invalid/l1-code-syntax-import.yaml (1834 characters)
- part 2: test/support/flow-cases/invalid/l1-const-language.yaml (1790 characters)
- part 2: test/support/flow-cases/invalid/l1-const-ursitoare-number.yaml (1562 characters)
- part 2: test/support/flow-cases/invalid/l1-enum-end-status.yaml (1545 characters)
- part 2: test/support/flow-cases/invalid/l1-foreach-body-both.yaml (1140 characters)
- part 2: test/support/flow-cases/invalid/l1-foreach-body-neither.yaml (1089 characters)
- part 2: test/support/flow-cases/invalid/l1-invalid-json-schema-inputs.yaml (1323 characters)
- part 2: test/support/flow-cases/invalid/l1-invalid-json-schema-output.yaml (1237 characters)
- part 2: test/support/flow-cases/invalid/l1-min-items-outcomes.yaml (2111 characters)
- part 2: test/support/flow-cases/invalid/l1-min-items-tools.yaml (1687 characters)
- part 2: test/support/flow-cases/invalid/l1-min-length-instructions.yaml (1517 characters)
- part 2: test/support/flow-cases/invalid/l1-min-properties-nodes.yaml (767 characters)
- part 2: test/support/flow-cases/invalid/l1-parse-custom-tag.yaml (383 characters)
- part 2: test/support/flow-cases/invalid/l1-parse-duplicate-key.yaml (362 characters)
- part 2: test/support/flow-cases/invalid/l1-parse-invalid-yaml.yaml (364 characters)
- part 2: test/support/flow-cases/invalid/l1-pattern-block-ref.yaml (1532 characters)
- part 2: test/support/flow-cases/invalid/l1-pattern-duration.yaml (2244 characters)
- part 2: test/support/flow-cases/invalid/l1-pattern-flow-id.yaml (1544 characters)
- part 2: test/support/flow-cases/invalid/l1-pattern-node-id.yaml (1540 characters)
- part 2: test/support/flow-cases/invalid/l1-pattern-switch-on-bare.yaml (1663 characters)
- part 2: test/support/flow-cases/invalid/l1-pattern-version.yaml (1533 characters)
- part 2: test/support/flow-cases/invalid/l1-range-max-parallel.yaml (1109 characters)
- part 2: test/support/flow-cases/invalid/l1-range-max-steps.yaml (1689 characters)
- part 2: test/support/flow-cases/invalid/l1-ref-not-allowed-instructions.yaml (1578 characters)
- part 2: test/support/flow-cases/invalid/l1-ref-not-allowed-source.yaml (1855 characters)
- part 2: test/support/flow-cases/invalid/l1-ref-syntax-expression.yaml (1577 characters)
- part 2: test/support/flow-cases/invalid/l1-ref-syntax-index.yaml (1096 characters)
- part 2: test/support/flow-cases/invalid/l1-ref-syntax-nodes-no-output-segment.yaml (1664 characters)
- part 2: test/support/flow-cases/invalid/l1-ref-syntax-output-no-path.yaml (1625 characters)
- part 2: test/support/flow-cases/invalid/l1-ref-syntax-unknown-root.yaml (1582 characters)
- part 2: test/support/flow-cases/invalid/l1-ref-syntax-unterminated.yaml (1557 characters)
- part 2: test/support/flow-cases/invalid/l1-required-approval-timeout-case.yaml (2300 characters)
- part 2: test/support/flow-cases/invalid/l1-required-block-uses.yaml (1518 characters)
- part 2: test/support/flow-cases/invalid/l1-required-kind.yaml (1508 characters)
- part 2: test/support/flow-cases/invalid/l1-required-start.yaml (1508 characters)
- part 2: test/support/flow-cases/invalid/l1-type-max-steps-string.yaml (1720 characters)
- part 2: test/support/flow-cases/invalid/l1-type-with-not-object.yaml (1517 characters)
- part 2: test/support/flow-cases/invalid/l1-unique-items-outcomes.yaml (2128 characters)
- part 2: test/support/flow-cases/invalid/l1-unknown-kind.yaml (1525 characters)
- part 2: src/authoring/validate/l2.ts (9167 characters)
- part 2: test/support/flow-cases/invalid/l2-cycle.yaml (1528 characters)
- part 2: test/support/flow-cases/invalid/l2-cycle-self-loop.yaml (1629 characters)
- part 2: test/support/flow-cases/invalid/l2-decide-case-extra.yaml (2145 characters)
- part 2: test/support/flow-cases/invalid/l2-decide-case-missing.yaml (2153 characters)
- part 2: test/support/flow-cases/invalid/l2-missing-successor.yaml (1576 characters)
- part 2: test/support/flow-cases/invalid/l2-missing-successor-delegate-on-timeout.yaml (1743 characters)
- part 2: test/support/flow-cases/invalid/l2-no-end.yaml (1462 characters)
- part 2: test/support/flow-cases/invalid/l2-start-unknown.yaml (1532 characters)
- part 2: test/support/flow-cases/invalid/l2-unknown-block.yaml (1536 characters)
- part 2: test/support/flow-cases/invalid/l2-unknown-block-agent-tool.yaml (1760 characters)
- part 2: test/support/flow-cases/invalid/l2-unknown-block-foreach.yaml (1121 characters)
- part 2: test/support/flow-cases/invalid/l2-unknown-block-major.yaml (1557 characters)
- part 2: test/support/flow-cases/invalid/l2-unknown-delegate-target.yaml (1737 characters)
- part 2: test/support/flow-cases/invalid/l2-unknown-delegate-target-prototype-name.yaml (1797 characters)
- part 2: test/support/flow-cases/invalid/l2-unknown-delegate-workflow.yaml (1737 characters)
- part 2: test/support/flow-cases/invalid/l2-unknown-flow-foreach.yaml (1110 characters)
- part 2: test/support/flow-cases/invalid/l2-unknown-flow-subflow.yaml (1679 characters)
- part 3: test/support/flow-cases/invalid/l2-unknown-model-profile.yaml (1597 characters)
- part 3: test/support/flow-cases/invalid/l2-unknown-role.yaml (2233 characters)
- part 3: test/support/flow-cases/invalid/l2-unknown-successor.yaml (1593 characters)
- part 3: test/support/flow-cases/invalid/l2-unknown-successor-decide-case.yaml (2212 characters)
- part 3: test/support/flow-cases/invalid/l2-unreachable-node.yaml (1580 characters)
- part 3: test/support/flow-cases/invalid/l2-with-missing-required.yaml (1536 characters)
- part 3: test/support/flow-cases/invalid/l2-with-missing-required-foreach.yaml (1127 characters)
- part 3: test/support/flow-cases/invalid/l2-with-unknown-param.yaml (1577 characters)
- part 3: test/support/flow-cases/invalid/l2-with-unknown-param-subflow.yaml (1737 characters)
- part 3: src/authoring/validate/l3.ts (23700 characters)
- part 3: test/support/flow-cases/invalid/l3-enum-violation-decide-outcome.yaml (2199 characters)
- part 3: test/support/flow-cases/invalid/l3-enum-violation-literal.yaml (1739 characters)
- part 3: test/support/flow-cases/invalid/l3-enum-violation-ref.yaml (1072 characters)
- part 3: test/support/flow-cases/invalid/l3-item-in-foreach-items.yaml (1121 characters)
- part 3: test/support/flow-cases/invalid/l3-item-outside-foreach.yaml (1564 characters)
- part 3: test/support/flow-cases/invalid/l3-item-unknown-path.yaml (1103 characters)
- part 3: test/support/flow-cases/invalid/l3-not-dominating-after-join.yaml (2224 characters)
- part 3: test/support/flow-cases/invalid/l3-not-dominating-delegate-timeout-edge.yaml (1855 characters)
- part 3: test/support/flow-cases/invalid/l3-not-dominating-downstream.yaml (1605 characters)
- part 3: test/support/flow-cases/invalid/l3-not-dominating-one-branch.yaml (2224 characters)
- part 3: test/support/flow-cases/invalid/l3-not-dominating-self.yaml (2114 characters)
- part 3: test/support/flow-cases/invalid/l3-not-dominating-sibling-branch.yaml (2174 characters)
- part 3: test/support/flow-cases/invalid/l3-not-dominating-timeout-edge.yaml (2330 characters)
- part 3: test/support/flow-cases/invalid/l3-ref-no-output.yaml (1641 characters)
- part 3: test/support/flow-cases/invalid/l3-ref-outcome-not-decide.yaml (1633 characters)
- part 3: test/support/flow-cases/invalid/l3-ref-unknown-node.yaml (1613 characters)
- part 3: test/support/flow-cases/invalid/l3-ref-unknown-node-prototype-name.yaml (1652 characters)
- part 3: test/support/flow-cases/invalid/l3-ref-unknown-path-block-output.yaml (1588 characters)
- part 3: test/support/flow-cases/invalid/l3-ref-unknown-path-inputs.yaml (1569 characters)
- part 3: test/support/flow-cases/invalid/l3-ref-unknown-path-node.yaml (1635 characters)
- part 3: test/support/flow-cases/invalid/l3-ref-unknown-path-open-object.yaml (1850 characters)
- part 3: test/support/flow-cases/invalid/l3-ref-unknown-path-prototype-key.yaml (1602 characters)
- part 3: test/support/flow-cases/invalid/l3-ref-unknown-path-through-array.yaml (1651 characters)
- part 3: test/support/flow-cases/invalid/l3-switch-key-boolean.yaml (1731 characters)
- part 3: test/support/flow-cases/invalid/l3-switch-key-enum.yaml (2083 characters)
- part 3: test/support/flow-cases/invalid/l3-switch-key-integer.yaml (1734 characters)
- part 3: test/support/flow-cases/invalid/l3-switch-on-type-object.yaml (1718 characters)
- part 3: test/support/flow-cases/invalid/l3-taint-foreach-item.yaml (1165 characters)
- part 3: test/support/flow-cases/invalid/l3-taint-in-template.yaml (1114 characters)
- part 3: test/support/flow-cases/invalid/l3-taint-nested-in-object-param.yaml (1150 characters)
- part 3: test/support/flow-cases/invalid/l3-taint-raw-fetch-into-mail-body.yaml (1154 characters)
- part 3: test/support/flow-cases/invalid/l3-taint-to-agent-with-effects.yaml (1281 characters)
- part 3: test/support/flow-cases/invalid/l3-taint-via-code.yaml (1376 characters)
- part 3: test/support/flow-cases/invalid/l3-taint-via-decide-rationale.yaml (1505 characters)
- part 3: test/support/flow-cases/invalid/l3-taint-via-generate.yaml (1375 characters)
- part 3: test/support/flow-cases/invalid/l3-taint-write-effect.yaml (1436 characters)
- part 3: test/support/flow-cases/invalid/l3-type-mismatch-array-into-string.yaml (1588 characters)
- part 3: test/support/flow-cases/invalid/l3-type-mismatch-array-items.yaml (2136 characters)
- part 3: test/support/flow-cases/invalid/l3-type-mismatch-foreach-items-not-array.yaml (1140 characters)
- part 3: test/support/flow-cases/invalid/l3-type-mismatch-literal-null.yaml (1553 characters)
- part 4: test/support/flow-cases/invalid/l3-type-mismatch-literal-string-into-integer.yaml (1172 characters)
- part 4: test/support/flow-cases/invalid/l3-type-mismatch-number-into-integer.yaml (1190 characters)
- part 4: test/support/flow-cases/invalid/l3-type-mismatch-string-into-number.yaml (1792 characters)
- part 4: test/support/flow-cases/invalid/l3-type-mismatch-template-into-integer.yaml (1178 characters)
- part 4: src/cli/main.test.ts (627 characters)
- part 4: test/support/flow-cases/valid/model-profiles.yaml (1819 characters)
- part 4: test/support/flow-cases/warnings/optional-reference.yaml (1711 characters)
- part 4: test/support/flow-cases/warnings/optional-reference-input.yaml (1656 characters)
- part 4: test/support/flow-cases/valid/ref-whitespace-variants.yaml (1540 characters)
- part 4: test/support/flow-cases/valid/rf-1-like-minimal.yaml (1502 characters)
- part 4: src/authoring/validate/schema.ts (8491 characters)
- part 4: src/authoring/validate/sink.ts (771 characters)
- part 4: test/support/flow-cases/valid/subflow-and-output.yaml (1734 characters)
- part 4: test/support/flow-cases/warnings/suspicious-interpolation-bare.yaml (1594 characters)
- part 4: test/support/flow-cases/warnings/suspicious-interpolation-mustache.yaml (1768 characters)
- part 4: test/support/flow-cases/valid/switch-boolean.yaml (1696 characters)
- part 4: test/support/flow-cases/valid/switch-integer-and-string.yaml (1733 characters)
- part 4: test/support/flow-cases/valid/switch-on-decide-outcome.yaml (2053 characters)
- part 4: src/authoring/validate/taint.test.ts (5947 characters)
- part 4: test/support/flow-cases/valid/taint-agent-readonly-with-untrusted-input.yaml (1299 characters)
- part 4: src/authoring/validate/taint-checks.ts (3716 characters)
- part 4: test/support/flow-cases/valid/taint-decide-outcome-is-clean.yaml (1457 characters)
- part 4: test/support/flow-cases/valid/taint-extract-then-code-passes.yaml (2027 characters)
- part 4: test/support/flow-cases/valid/taint-generate-from-extracted-passes.yaml (2018 characters)
- part 4: test/support/flow-cases/warnings/taint-to-opaque-delegate.yaml (1138 characters)
- part 4: test/support/flow-cases/warnings/taint-to-opaque-subflow.yaml (1098 characters)
- part 4: test/support/flow-cases/valid/taint-untrusted-into-llm-and-human-passes.yaml (2323 characters)
- part 4: test/support/flow-cases/valid/taint-untrusted-into-read-block-passes.yaml (1066 characters)
- part 4: test/support/flow-cases/valid/taint-via-extract-passes.yaml (1750 characters)
- part 4: openspec/changes/add-flow-validator/tasks.md (10002 characters)
- part 4: test/support/flow-cases/warnings/trifecta-absent-no-private.yaml (1045 characters)
- part 4: test/support/flow-cases/warnings/trifecta-absent-no-send.yaml (1115 characters)
- part 4: test/support/flow-cases/warnings/trifecta-absent-no-untrusted.yaml (1126 characters)
- part 4: test/support/flow-cases/warnings/trifecta-all-three.yaml (1166 characters)
- part 4: test/support/flow-cases/warnings/trifecta-via-agent-tools.yaml (1183 characters)
- part 4: test/support/flow-cases/warnings/trifecta-via-pay.yaml (1156 characters)
- part 4: test/support/flow-cases/valid/types-decide-outcome-into-enum-subset.yaml (2175 characters)
- part 4: test/support/flow-cases/valid/types-integer-into-number.yaml (1747 characters)
- part 4: test/support/flow-cases/valid/types-literals-and-enum.yaml (2007 characters)
- part 4: src/authoring/validate/validate.test.ts (2998 characters)
- part 4: src/authoring/validate/validate.ts (3578 characters)
- part 4: src/cli/flow/validate.test.ts (8629 characters)
- part 4: src/cli/flow/validate.ts (4408 characters)
- part 5: src/authoring/validate/whole.test.ts (12354 characters)
- part 5: test/support/flow-cases/valid/yaml-unquoted-keys.yaml (909 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 1 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 10 task(s): red and green compared (+1 unfrozen by a delegate or an agent) |
| test path freeze | ok | 10 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/authoring/format/catalogue.ts, src/authoring/index.ts, src/authoring/validate/cases-l1.test.ts, src/authoring/validate/cases-l2.test.ts, src/authoring/validate/cases-l3.test.ts (+25 more) |
| tdd history | ok | 10 task(s); red tests passing at head: step 3 |
| python encoding | skipped | no Python file added or changed |
| pre-existing tests still pass | ok | 1200 of 1200 base tests pass on the unit's code with its 11 test and support files at the base (base: base worktree) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/cli/flow/validate.test.ts kept at head for the run (task 5.2: unfrozen by Q-002)
- src.cli.main.test.ts::C-2687097e registerAdminCommands and createDefaultRegistry list the five admin commands (named by the task text, plan:m3@5803cc3afe1d8b1a)

## Tests unfrozen by a delegate or an agent (allowed, L4-IMP-002)

- src/cli/flow/validate.test.ts (task 5.2, unfrozen by Q-002 (delegate_override, claude-fable-5-1))

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-8919e1d9 | flow-validation › The code lists › The code lists are exact | covered | src.authoring.validate.codes.test.ts::C-8919e1d9 The code lists are exact (passed, red_assertion) | - | 0.93 |
| C-7fc61336 | flow-validation › validateFlow runs three gated layers › RF-1 and its variants validate | covered | src.authoring.validate.whole.test.ts::C-7fc61336 RF-1 validates with one trifecta warning (passed, red_assertion); src.authoring.validate.whole.test.ts::C-7fc61336 the RF-1 variants validate (passed, red_assertion) | - | 0.92 |
| C-a609469d | flow-validation › validateFlow runs three gated layers › Layers gate, order is stable, non-objects fail in L1 | covered | src.authoring.validate.whole.test.ts::C-a609469d layers gate (passed, red_assertion); src.authoring.validate.whole.test.ts::C-a609469d node key order does not change the result (passed, red_assertion); src.authoring.validate.whole.test.ts::C-a609469d non-object documents fail in L1 (passed, red_asse... | - | 0.93 |
| C-7dd08673 | flow-validation › Every error code has a case file › Each invalid case yields exactly its codes | covered | src.authoring.validate.cases-l1.test.ts::C-7dd08673 Each l1 case yields exactly its codes in layer L1 (passed, red_assertion); src.authoring.validate.cases-l1.test.ts::C-7dd08673 The l1 case files are listed with their expected codes (passed, red_assertion); src.authoring.validate.cases-l2.test.ts::... | - | 0.92 |
| C-9d912054 | flow-validation › Valid and warning cases hold › Valid cases pass and warning cases warn | covered | src.authoring.validate.taint.test.ts::C-9d912054 Valid cases give no error and no warning (passed, red_assertion); src.authoring.validate.taint.test.ts::C-9d912054 Warning cases warn exactly as expected (passed, red_assertion); src.authoring.validate.whole.test.ts::C-9d912054 valid cases have no iss... | - | 0.86 |
| C-9c15634e | flow-validation › Text that does not parse is one L1 error › Parse failures become L1_PARSE | covered | src.authoring.validate.validate.test.ts::C-9c15634e A custom YAML tag is one L1_PARSE error (passed, red_assertion); src.authoring.validate.validate.test.ts::C-9c15634e A duplicate YAML key is one L1_PARSE error (passed, red_assertion); src.authoring.validate.validate.test.ts::C-9c15634e Broken JSON... | - | 0.95 |
| C-44cdb55f | flow-validation › Taint uses the shared algebra › Code no longer launders | covered | src.authoring.validate.taint.test.ts::C-44cdb55f code output keeps the taint of its input (passed, red_assertion); src.authoring.validate.taint.test.ts::C-44cdb55f extracted data through code passes (passed, red_assertion) | - | 0.93 |
| C-f97887e5 | flow-validation › Taint uses the shared algebra › Trifecta and opaque-call warnings come from U23's results | covered | src.authoring.validate.taint.test.ts::C-f97887e5 hook edges are not checked (passed, red_assertion); src.authoring.validate.taint.test.ts::C-f97887e5 trifecta warnings come from the capabilities (passed, red_assertion); src.authoring.validate.taint.test.ts::C-f97887e5 untrusted data into a delegate ... | - | 0.90 |
| C-69e1a698 | flow-validation › Catalogue lookups follow the Catalogue interface › The two delegate codes | covered | src.authoring.validate.cases-l2.test.ts::C-69e1a698 Delegate target and workflow are told apart from the catalogue (passed, red_assertion) | - | 0.92 |
| C-c6bddbec | flow-validation › The validator never crashes into a pass › Crashes, limits and mutations | covered | src.authoring.validate.whole.test.ts::C-c6bddbec 1000 random mutations never crash (passed, red_assertion); src.authoring.validate.whole.test.ts::C-c6bddbec a 5001 node flow hits the taint limit (passed, red_assertion); src.authoring.validate.whole.test.ts::C-c6bddbec a self-referencing input schema... | - | 0.96 |
| C-3a87587c | flow-validation › jsonSchemaProblem checks embedded schemas › Valid and invalid schemas | covered | src.authoring.validate.jsonschema.test.ts::C-3a87587c Invalid embedded schemas are reported (passed, red_assertion); src.authoring.validate.jsonschema.test.ts::C-3a87587c Valid embedded schemas are accepted (passed, red_assertion); src.authoring.validate.whole.test.ts::C-3a87587c jsonSchemaProblem a... | - | 0.93 |
| C-73b013e5 | flow-validation › Diagnostics are documented › The document covers every code | covered | src.authoring.validate.diagnostics.test.ts::C-73b013e5: DIAGNOSTICS has one entry per code in list order with single-line text (passed, red_assertion); src.authoring.validate.diagnostics.test.ts::C-73b013e5: links and anchors (passed, red_assertion); src.authoring.validate.diagnostics.test.ts::C-73b... | - | 0.95 |
| C-a95014a0 | flow-validation › flow validate checks a file › flow validate prints a verdict | covered | src.cli.flow.validate.test.ts::C-a95014a0 flow validate prints an INVALID verdict and escapes control bytes (passed, red_assertion); src.cli.flow.validate.test.ts::C-a95014a0 flow validate prints an OK verdict and a JSON verdict (passed, red_assertion) | - | 0.94 |
| C-0aa97fa7 | flow-validation › flow validate checks a file › Usage and unreadable files exit 2 | covered | src.cli.flow.validate.test.ts::C-0aa97fa7 flow validate usage errors exit 2 and listings mention the command (passed, red_assertion) | - | 0.93 |
| C-a47d7ddd | flow-validation › A catalogue file feeds the command › Reading a catalogue file | covered | src.authoring.validate.catalogue-file.test.ts::C-a47d7ddd a catalogue file answers every lookup (passed, red_assertion); src.authoring.validate.catalogue-file.test.ts::C-a47d7ddd a malformed catalogue file is refused (passed, red_assertion); src.authoring.validate.catalogue-file.test.ts::C-a47d7ddd ... | - | 0.94 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `docs/authoring/diagnostics.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-flow-validator/.l4/ledger/r-20261101T0952Z-d8c1.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-flow-validator/.l4/ledger/r-20261101T1219Z-efa1.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-flow-validator/.l4/ledger/r-20261101T1252Z-3bf3.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-flow-validator/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-flow-validator/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `src/authoring/format/catalogue.ts` | authoring | relevant | named in the spec |
| `src/authoring/index.ts` | authoring | relevant | named in the spec |
| `src/authoring/validate/cases-l1.test.ts` |  | relevant | new test file |
| `src/authoring/validate/cases-l2.test.ts` |  | relevant | new test file |
| `src/authoring/validate/cases-l3.test.ts` |  | relevant | new test file |
| `src/authoring/validate/catalogue-file.test.ts` |  | relevant | new test file |
| `src/authoring/validate/catalogue-file.ts` | authoring | relevant | named in the spec |
| `src/authoring/validate/codes.test.ts` |  | relevant | new test file |
| `src/authoring/validate/codes.ts` | authoring | relevant | named in the spec |
| `src/authoring/validate/diagnostics.test.ts` |  | relevant | new test file |
| `src/authoring/validate/diagnostics.ts` | authoring | relevant | named in the spec |
| `src/authoring/validate/graph.ts` | authoring | relevant | named in the spec |
| `src/authoring/validate/jsonschema.test.ts` |  | relevant | new test file |
| `src/authoring/validate/jsonschema.ts` | authoring | relevant | named in the spec |
| `src/authoring/validate/l1.ts` | authoring | relevant | named in the spec |
| `src/authoring/validate/l2.ts` | authoring | relevant | named in the spec |
| `src/authoring/validate/l3.ts` | authoring | relevant | named in the spec |
| `src/authoring/validate/schema.ts` | authoring | relevant | named in the spec |
| `src/authoring/validate/sink.ts` | authoring | relevant | named in the spec |
| `src/authoring/validate/taint-checks.ts` | authoring | relevant | named in the spec |
| `src/authoring/validate/taint.test.ts` |  | relevant | new test file |
| `src/authoring/validate/validate.test.ts` |  | relevant | new test file |
| `src/authoring/validate/validate.ts` | authoring | relevant | named in the spec |
| `src/authoring/validate/whole.test.ts` |  | relevant | new test file |
| `src/cli/builtin.ts` | cli | relevant | named in the spec |
| `src/cli/flow/index.ts` | cli | relevant | named in the spec |
| `src/cli/flow/validate.test.ts` |  | relevant | new test file |
| `src/cli/flow/validate.ts` | cli | relevant | named in the spec |
| `src/cli/main.test.ts` |  | relevant | named in the spec |
| `test/support/flow-cases/index.ts` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-additional-property-end-next.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-additional-property-node.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-additional-property-top.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-code-no-return.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-code-return-only-nested.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-code-syntax-import.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-code-syntax.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-const-language.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-const-ursitoare-number.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-enum-end-status.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-foreach-body-both.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-foreach-body-neither.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-invalid-json-schema-inputs.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-invalid-json-schema-output.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-min-items-outcomes.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-min-items-tools.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-min-length-instructions.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-min-properties-nodes.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-parse-custom-tag.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-parse-duplicate-key.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-parse-invalid-yaml.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-pattern-block-ref.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-pattern-duration.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-pattern-flow-id.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-pattern-node-id.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-pattern-switch-on-bare.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-pattern-version.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-range-max-parallel.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-range-max-steps.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-ref-not-allowed-instructions.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-ref-not-allowed-source.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-ref-syntax-expression.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-ref-syntax-index.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-ref-syntax-nodes-no-output-segment.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-ref-syntax-output-no-path.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-ref-syntax-unknown-root.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-ref-syntax-unterminated.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-required-approval-timeout-case.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-required-block-uses.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-required-kind.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-required-start.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-type-max-steps-string.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-type-with-not-object.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-unique-items-outcomes.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l1-unknown-kind.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-cycle-self-loop.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-cycle.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-decide-case-extra.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-decide-case-missing.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-missing-successor-delegate-on-timeout.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-missing-successor.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-no-end.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-start-unknown.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-unknown-block-agent-tool.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-unknown-block-foreach.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-unknown-block-major.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-unknown-block.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-unknown-delegate-target-prototype-name.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-unknown-delegate-target.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-unknown-delegate-workflow.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-unknown-flow-foreach.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-unknown-flow-subflow.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-unknown-model-profile.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-unknown-role.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-unknown-successor-decide-case.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-unknown-successor.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-unreachable-node.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-with-missing-required-foreach.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-with-missing-required.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-with-unknown-param-subflow.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l2-with-unknown-param.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-enum-violation-decide-outcome.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-enum-violation-literal.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-enum-violation-ref.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-item-in-foreach-items.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-item-outside-foreach.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-item-unknown-path.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-not-dominating-after-join.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-not-dominating-delegate-timeout-edge.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-not-dominating-downstream.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-not-dominating-one-branch.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-not-dominating-self.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-not-dominating-sibling-branch.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-not-dominating-timeout-edge.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-ref-no-output.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-ref-outcome-not-decide.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-ref-unknown-node-prototype-name.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-ref-unknown-node.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-ref-unknown-path-block-output.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-ref-unknown-path-inputs.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-ref-unknown-path-node.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-ref-unknown-path-open-object.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-ref-unknown-path-prototype-key.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-ref-unknown-path-through-array.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-switch-key-boolean.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-switch-key-enum.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-switch-key-integer.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-switch-on-type-object.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-taint-foreach-item.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-taint-in-template.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-taint-nested-in-object-param.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-taint-raw-fetch-into-mail-body.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-taint-to-agent-with-effects.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-taint-via-code.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-taint-via-decide-rationale.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-taint-via-generate.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-taint-write-effect.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-type-mismatch-array-into-string.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-type-mismatch-array-items.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-type-mismatch-foreach-items-not-array.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-type-mismatch-literal-null.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-type-mismatch-literal-string-into-integer.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-type-mismatch-number-into-integer.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-type-mismatch-string-into-number.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/invalid/l3-type-mismatch-template-into-integer.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/agent-readonly-and-wait.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/agent-with-effects-and-trusted-input.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/delegate-with-outputs-and-timeout-branch.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/dominance-approval-rejected-branch-has-output.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/dominance-before-branch-ok.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/dominance-join-after-both-branches-same-producer.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/foreach-bare-item-primitive-array.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/foreach-block-items-and-results.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/foreach-subflow.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/human-form.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/json-literals-in-values.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/model-profiles.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/ref-whitespace-variants.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/rf-1-like-minimal.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/subflow-and-output.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/switch-boolean.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/switch-integer-and-string.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/switch-on-decide-outcome.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/taint-agent-readonly-with-untrusted-input.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/taint-decide-outcome-is-clean.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/taint-extract-then-code-passes.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/taint-generate-from-extracted-passes.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/taint-untrusted-into-llm-and-human-passes.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/taint-untrusted-into-read-block-passes.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/taint-via-extract-passes.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/types-decide-outcome-into-enum-subset.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/types-integer-into-number.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/types-literals-and-enum.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/valid/yaml-unquoted-keys.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/warnings/code-forbidden-api.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/warnings/optional-reference-input.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/warnings/optional-reference.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/warnings/suspicious-interpolation-bare.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/warnings/suspicious-interpolation-mustache.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/warnings/taint-to-opaque-delegate.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/warnings/taint-to-opaque-subflow.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/warnings/trifecta-absent-no-private.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/warnings/trifecta-absent-no-send.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/warnings/trifecta-absent-no-untrusted.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/warnings/trifecta-all-three.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/warnings/trifecta-via-agent-tools.yaml` | test | relevant | named in the spec |
| `test/support/flow-cases/warnings/trifecta-via-pay.yaml` | test | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/authoring/format/catalogue.ts, src/authoring/index.ts, src/authoring/validate/catalogue-file.ts, src/authoring/validate/codes.ts, src/authoring/validate/diagnostics.ts and 13 more

### Tests

1301 of 1301 passed, 0 failed, 0 errored, 0 skipped.
48 of 48 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-8919e1d9 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7fc61336 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a609469d | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-7dd08673 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9d912054 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9c15634e | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-44cdb55f | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f97887e5 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-69e1a698 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c6bddbec | ok | 0.960 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-3a87587c | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-73b013e5 | ok | 0.950 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a95014a0 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-0aa97fa7 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a47d7ddd | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-8919e1d9 | flow-validation › The code lists › The code lists are exact | pass | pass | the judge passed it and a discriminating test passes |
| C-7fc61336 | flow-validation › validateFlow runs three gated layers › RF-1 and its variants validate | pass | pass | the judge passed it and a discriminating test passes |
| C-a609469d | flow-validation › validateFlow runs three gated layers › Layers gate, order is stable, non-objects fail in L1 | pass | pass | the judge passed it and a discriminating test passes |
| C-7dd08673 | flow-validation › Every error code has a case file › Each invalid case yields exactly its codes | pass | pass | the judge passed it and a discriminating test passes |
| C-9d912054 | flow-validation › Valid and warning cases hold › Valid cases pass and warning cases warn | pass | pass | the judge passed it and a discriminating test passes |
| C-9c15634e | flow-validation › Text that does not parse is one L1 error › Parse failures become L1_PARSE | pass | pass | the judge passed it and a discriminating test passes |
| C-44cdb55f | flow-validation › Taint uses the shared algebra › Code no longer launders | pass | pass | the judge passed it and a discriminating test passes |
| C-f97887e5 | flow-validation › Taint uses the shared algebra › Trifecta and opaque-call warnings come from U23's results | pass | pass | the judge passed it and a discriminating test passes |
| C-69e1a698 | flow-validation › Catalogue lookups follow the Catalogue interface › The two delegate codes | pass | pass | the judge passed it and a discriminating test passes |
| C-c6bddbec | flow-validation › The validator never crashes into a pass › Crashes, limits and mutations | pass | pass | the judge passed it and a discriminating test passes |
| C-3a87587c | flow-validation › jsonSchemaProblem checks embedded schemas › Valid and invalid schemas | pass | pass | the judge passed it and a discriminating test passes |
| C-73b013e5 | flow-validation › Diagnostics are documented › The document covers every code | pass | pass | the judge passed it and a discriminating test passes |
| C-a95014a0 | flow-validation › flow validate checks a file › flow validate prints a verdict | pass | pass | the judge passed it and a discriminating test passes |
| C-0aa97fa7 | flow-validation › flow validate checks a file › Usage and unreadable files exit 2 | pass | pass | the judge passed it and a discriminating test passes |
| C-a47d7ddd | flow-validation › A catalogue file feeds the command › Reading a catalogue file | pass | pass | the judge passed it and a discriminating test passes |

## Findings

None.

## New tests (red then green, `task.red_ok` in the ledger)

- `src.authoring.validate.cases-l1.test.ts::C-7dd08673 Each l1 case yields exactly its codes in layer L1` (task 2.1): passed
- `src.authoring.validate.cases-l1.test.ts::C-7dd08673 The l1 case files are listed with their expected codes` (task 2.1): passed
- `src.authoring.validate.cases-l2.test.ts::C-69e1a698 Delegate target and workflow are told apart from the catalogue` (task 2.2): passed
- `src.authoring.validate.cases-l2.test.ts::C-7dd08673 Each l2 case yields exactly its codes in layer L2` (task 2.2): passed
- `src.authoring.validate.cases-l2.test.ts::C-7dd08673 The l2 case files are listed with their expected codes` (task 2.2): passed
- `src.authoring.validate.cases-l3.test.ts::C-7dd08673 Each l3 case yields exactly its codes in layer L3` (task 2.3): passed
- `src.authoring.validate.cases-l3.test.ts::C-7dd08673 The l3 case files are listed with their expected codes` (task 2.3): passed
- `src.authoring.validate.catalogue-file.test.ts::C-a47d7ddd a catalogue file answers every lookup` (task 5.1): passed
- `src.authoring.validate.catalogue-file.test.ts::C-a47d7ddd a malformed catalogue file is refused` (task 5.1): passed
- `src.authoring.validate.catalogue-file.test.ts::C-a47d7ddd an empty catalogue document answers undefined to every lookup` (task 5.1): passed
- `src.authoring.validate.codes.test.ts::C-8919e1d9 The code lists are exact` (task 1.1): passed
- `src.authoring.validate.diagnostics.test.ts::C-73b013e5: DIAGNOSTICS has one entry per code in list order with single-line text` (task 4.1): passed
- `src.authoring.validate.diagnostics.test.ts::C-73b013e5: links and anchors` (task 4.1): passed
- `src.authoring.validate.diagnostics.test.ts::C-73b013e5: the committed document equals renderDiagnosticsDoc and ends with one newline` (task 4.1): passed
- `src.authoring.validate.diagnostics.test.ts::C-73b013e5: the file holds exactly one heading per code` (task 4.1): passed
- `src.authoring.validate.jsonschema.test.ts::C-3a87587c Invalid embedded schemas are reported` (task 1.2): passed
- `src.authoring.validate.jsonschema.test.ts::C-3a87587c Valid embedded schemas are accepted` (task 1.2): passed
- `src.authoring.validate.taint.test.ts::C-44cdb55f code output keeps the taint of its input` (task 2.4): passed
- `src.authoring.validate.taint.test.ts::C-44cdb55f extracted data through code passes` (task 2.4): passed
- `src.authoring.validate.taint.test.ts::C-7dd08673 Each l3 taint case yields exactly its codes` (task 2.4): passed
- `src.authoring.validate.taint.test.ts::C-9d912054 Valid cases give no error and no warning` (task 2.4): passed
- `src.authoring.validate.taint.test.ts::C-9d912054 Warning cases warn exactly as expected` (task 2.4): passed
- `src.authoring.validate.taint.test.ts::C-f97887e5 hook edges are not checked` (task 2.4): passed
- `src.authoring.validate.taint.test.ts::C-f97887e5 trifecta warnings come from the capabilities` (task 2.4): passed
- `src.authoring.validate.taint.test.ts::C-f97887e5 untrusted data into a delegate or subflow is an opaque-call warning` (task 2.4): passed
- `src.authoring.validate.validate.test.ts::C-9c15634e A custom YAML tag is one L1_PARSE error` (task 2.1): passed
- `src.authoring.validate.validate.test.ts::C-9c15634e A duplicate YAML key is one L1_PARSE error` (task 2.1): passed
- `src.authoring.validate.validate.test.ts::C-9c15634e Broken JSON text is one L1_PARSE error` (task 2.1): passed
- `src.authoring.validate.validate.test.ts::C-9c15634e Invalid YAML is one L1_PARSE error` (task 2.1): passed
- `src.authoring.validate.validate.test.ts::C-9c15634e RF-1 as JSON text validates like RF-1 as YAML` (task 2.1): passed
- `src.authoring.validate.whole.test.ts::C-3a87587c jsonSchemaProblem accepts and refuses schemas` (task 3.1): passed
- `src.authoring.validate.whole.test.ts::C-7dd08673 each invalid case yields exactly its codes` (task 3.1): passed
- `src.authoring.validate.whole.test.ts::C-7fc61336 RF-1 validates with one trifecta warning` (task 3.1): passed
- `src.authoring.validate.whole.test.ts::C-7fc61336 the RF-1 variants validate` (task 3.1): passed
- `src.authoring.validate.whole.test.ts::C-9c15634e parse failures become one L1_PARSE` (task 3.1): passed
- `src.authoring.validate.whole.test.ts::C-9c15634e the JSON form of RF-1 matches the YAML form` (task 3.1): passed
- `src.authoring.validate.whole.test.ts::C-9d912054 valid cases have no issue` (task 3.1): passed
- `src.authoring.validate.whole.test.ts::C-9d912054 warning cases warn exactly as expected` (task 3.1): passed
- `src.authoring.validate.whole.test.ts::C-a609469d layers gate` (task 3.1): passed
- `src.authoring.validate.whole.test.ts::C-a609469d node key order does not change the result` (task 3.1): passed
- `src.authoring.validate.whole.test.ts::C-a609469d non-object documents fail in L1` (task 3.1): passed
- `src.authoring.validate.whole.test.ts::C-c6bddbec 1000 random mutations never crash` (task 3.1): passed
- `src.authoring.validate.whole.test.ts::C-c6bddbec a 5001 node flow hits the taint limit` (task 3.1): passed
- `src.authoring.validate.whole.test.ts::C-c6bddbec a self-referencing input schema does not crash` (task 3.1): passed
- `src.authoring.validate.whole.test.ts::C-c6bddbec a throwing catalogue is one INTERNAL_ERROR` (task 3.1): passed
- `src.cli.flow.validate.test.ts::C-0aa97fa7 flow validate usage errors exit 2 and listings mention the command` (task 5.2): passed
- `src.cli.flow.validate.test.ts::C-a95014a0 flow validate prints an INVALID verdict and escapes control bytes` (task 5.2): passed
- `src.cli.flow.validate.test.ts::C-a95014a0 flow validate prints an OK verdict and a JSON verdict` (task 5.2): passed

## Guard events

- guard.violation: test/support/flow-cases/invalid/l1-additional-property-end-next.yaml
- guard.violation: test/support/flow-cases/invalid/l1-additional-property-node.yaml
- guard.violation: test/support/flow-cases/invalid/l1-additional-property-top.yaml
- guard.violation: test/support/flow-cases/invalid/l1-code-no-return.yaml
- guard.violation: test/support/flow-cases/invalid/l1-code-return-only-nested.yaml
- guard.violation: test/support/flow-cases/invalid/l1-code-syntax-import.yaml
- guard.violation: test/support/flow-cases/invalid/l1-code-syntax.yaml
- guard.violation: test/support/flow-cases/invalid/l1-const-language.yaml
- guard.violation: test/support/flow-cases/invalid/l1-const-ursitoare-number.yaml
- guard.violation: test/support/flow-cases/invalid/l1-enum-end-status.yaml
- guard.violation: test/support/flow-cases/invalid/l1-foreach-body-both.yaml
- guard.violation: test/support/flow-cases/invalid/l1-foreach-body-neither.yaml
- guard.violation: test/support/flow-cases/invalid/l1-invalid-json-schema-inputs.yaml
- guard.violation: test/support/flow-cases/invalid/l1-invalid-json-schema-output.yaml
- guard.violation: test/support/flow-cases/invalid/l1-min-items-outcomes.yaml
- guard.violation: test/support/flow-cases/invalid/l1-min-items-tools.yaml
- guard.violation: test/support/flow-cases/invalid/l1-min-length-instructions.yaml
- guard.violation: test/support/flow-cases/invalid/l1-min-properties-nodes.yaml
- guard.violation: test/support/flow-cases/invalid/l1-parse-custom-tag.yaml
- guard.violation: test/support/flow-cases/invalid/l1-parse-duplicate-key.yaml
- guard.violation: test/support/flow-cases/invalid/l1-parse-invalid-yaml.yaml
- guard.violation: test/support/flow-cases/invalid/l1-pattern-block-ref.yaml
- guard.violation: test/support/flow-cases/invalid/l1-pattern-duration.yaml
- guard.violation: test/support/flow-cases/invalid/l1-pattern-flow-id.yaml
- guard.violation: test/support/flow-cases/invalid/l1-pattern-node-id.yaml
- guard.violation: test/support/flow-cases/invalid/l1-pattern-switch-on-bare.yaml
- guard.violation: test/support/flow-cases/invalid/l1-pattern-version.yaml
- guard.violation: test/support/flow-cases/invalid/l1-range-max-parallel.yaml
- guard.violation: test/support/flow-cases/invalid/l1-range-max-steps.yaml
- guard.violation: test/support/flow-cases/invalid/l1-ref-not-allowed-instructions.yaml
- guard.violation: test/support/flow-cases/invalid/l1-ref-not-allowed-source.yaml
- guard.violation: test/support/flow-cases/invalid/l1-ref-syntax-expression.yaml
- guard.violation: test/support/flow-cases/invalid/l1-ref-syntax-index.yaml
- guard.violation: test/support/flow-cases/invalid/l1-ref-syntax-nodes-no-output-segment.yaml
- guard.violation: test/support/flow-cases/invalid/l1-ref-syntax-output-no-path.yaml
- guard.violation: test/support/flow-cases/invalid/l1-ref-syntax-unknown-root.yaml
- guard.violation: test/support/flow-cases/invalid/l1-ref-syntax-unterminated.yaml
- guard.violation: test/support/flow-cases/invalid/l1-required-approval-timeout-case.yaml
- guard.violation: test/support/flow-cases/invalid/l1-required-block-uses.yaml
- guard.violation: test/support/flow-cases/invalid/l1-required-kind.yaml
- guard.violation: test/support/flow-cases/invalid/l1-required-start.yaml
- guard.violation: test/support/flow-cases/invalid/l1-type-max-steps-string.yaml
- guard.violation: test/support/flow-cases/invalid/l1-type-with-not-object.yaml
- guard.violation: test/support/flow-cases/invalid/l1-unique-items-outcomes.yaml
- guard.violation: test/support/flow-cases/invalid/l1-unknown-kind.yaml
- guard.violation: test/support/flow-cases/invalid/l2-cycle-self-loop.yaml
- guard.violation: test/support/flow-cases/invalid/l2-cycle.yaml
- guard.violation: test/support/flow-cases/invalid/l2-decide-case-extra.yaml
- guard.violation: test/support/flow-cases/invalid/l2-decide-case-missing.yaml
- guard.violation: test/support/flow-cases/invalid/l2-missing-successor-delegate-on-timeout.yaml
- guard.violation: test/support/flow-cases/invalid/l2-missing-successor.yaml
- guard.violation: test/support/flow-cases/invalid/l2-no-end.yaml
- guard.violation: test/support/flow-cases/invalid/l2-start-unknown.yaml
- guard.violation: test/support/flow-cases/invalid/l2-unknown-block-agent-tool.yaml
- guard.violation: test/support/flow-cases/invalid/l2-unknown-block-foreach.yaml
- guard.violation: test/support/flow-cases/invalid/l2-unknown-block-major.yaml
- guard.violation: test/support/flow-cases/invalid/l2-unknown-block.yaml
- guard.violation: test/support/flow-cases/invalid/l2-unknown-delegate-target-prototype-name.yaml
- guard.violation: test/support/flow-cases/invalid/l2-unknown-delegate-target.yaml
- guard.violation: test/support/flow-cases/invalid/l2-unknown-delegate-workflow.yaml
- guard.violation: test/support/flow-cases/invalid/l2-unknown-flow-foreach.yaml
- guard.violation: test/support/flow-cases/invalid/l2-unknown-flow-subflow.yaml
- guard.violation: test/support/flow-cases/invalid/l2-unknown-model-profile.yaml
- guard.violation: test/support/flow-cases/invalid/l2-unknown-role.yaml
- guard.violation: test/support/flow-cases/invalid/l2-unknown-successor-decide-case.yaml
- guard.violation: test/support/flow-cases/invalid/l2-unknown-successor.yaml
- guard.violation: test/support/flow-cases/invalid/l2-unreachable-node.yaml
- guard.violation: test/support/flow-cases/invalid/l2-with-missing-required-foreach.yaml
- guard.violation: test/support/flow-cases/invalid/l2-with-missing-required.yaml
- guard.violation: test/support/flow-cases/invalid/l2-with-unknown-param-subflow.yaml
- guard.violation: test/support/flow-cases/invalid/l2-with-unknown-param.yaml
