Tests follow `test-plan.md` and `test-plan-rows.md`. Every Node test starts, inside its body, with a `typeof` assertion per function it calls and an `existsSync` assertion per file it reads, and wraps each call under test in `attempt` (the value or `{ thrown }`) so a throwing stub fails by assertion. Red tests import from the files `design.md` § Interfaces names. The runtime half of every criterion (`test-plan.md` § STACK-ONLY) is the delegate's. The e2e gate runs `e2e/test_stack_seeding.py` at green and fails the attempt if it fails, but no red run can cite its criteria: `C-9f2ca313`, `C-96935fd5` and `C-78c649be` reach verify as `needs_human`, answered by the e2e report (the file passes at head, fails at base).

## 1. The control server

- [ ] 1.1 Write `test/support/stack/control.test.ts` first (both control scenarios), then replace the scaffold stub of `startStackControl` in `test/support/stack/control.ts` (decision 1). Run `pnpm run test test/support/stack/control.test.ts`

## 2. The sign-in helper

- [ ] 2.1 Write `test/support/stack/keycloak-login.test.ts` first (both sign-in scenarios; rows F1 to F7 build two loopback servers in the test), then replace the scaffold stubs of `StackLoginError` and `signInThroughKeycloak` in `test/support/stack/keycloak-login.ts` (decisions 4 and 5). Run `pnpm run test test/support/stack/keycloak-login.test.ts`

## 3. The seed plan

- [ ] 3.1 Write `test/support/stack/seed-plan.test.ts` first (scenario "The seed plan in order", the table of `test-plan-rows.md` § Seed plan), then replace the scaffold stubs of `STACK_SEED` and `seedPlan` in `test/support/stack/seed.ts`. Run `pnpm run test test/support/stack/seed-plan.test.ts`

## 4. The seeder

- [ ] 4.1 Write `test/support/stack/seed-stack.test.ts` first (both seed scenarios on the in-process stack of `test-plan.md` § Fixtures; the second test runs rows E1 to E10 on the first test's stack, closed in the file's top-level `after`), then replace the scaffold stubs of `SeedError` and `seedStack` in `test/support/stack/seed.ts` (decisions 7 and 8; the U59a commands run through `runCli`). Run `pnpm run test test/support/stack/seed-stack.test.ts` and `pnpm run test test/support/stack/seed-plan.test.ts`

## 5. The settings and the control composition

- [ ] 5.1 Write `test/support/stack/seed-settings.test.ts` first (scenario "Settings from files and the control composition"; it imports `readCompose` from `test/deploy/compose.ts`, `SECRET_FILES` from `src/cli/init-secrets.ts` and reads `deploy/compose.e2e.yaml` as YAML), then replace the scaffold stubs of `STACK_ISSUER`, `stackSeedDeps` and `stackControlOptions` in `test/support/stack/seed.ts`. Run `pnpm run test test/support/stack/seed-settings.test.ts`

## 6. The runner entry

- [ ] 6.1 Write `test/support/stack/runner-control.test.ts` first (scenario "Control on, off and on a busy port"), then edit `test/support/stack/runner-main.ts`: add the optional `control` member to `runnerMain`'s `opts` (started after the forwarders, closed in every case, `runner: the stack control server could not start (<code>)` and exit 1 when it cannot listen) and change its entry guard to pass `stackControlOptions(process.env.STACK_DIR ?? "/run/stack-e2e")`. Run `pnpm run test test/support/stack/runner-control.test.ts` and `pnpm run test test/support/stack/forward.test.ts` (frozen, green on arrival)

## 7. The conftest, the step and the README

- [ ] 7.1 Write `test/support/stack/journeys-step.test.ts` (scenario "The committed step, an altered copy and the README row") and `e2e/test_stack_seeding.py` (the three Python scenarios, `test-plan-rows.md` § Python rows; each test imports `conftest` with `importlib` and asserts the names it uses) first. Then edit `e2e/conftest.py`, which this task names: add the `L4_E2E_BASE_URL` mirror, `STACK_RESET_TIMEOUT_S`, `FAKE_ONLY_TESTS`, `is_fake_only`, `pytest_configure`, `pytest_collection_modifyitems` (matching `originalname`), `reset_state` and `seed_users` (the bodies of `fresh_state` and `users`, which now call them), `is_me_response`, `check_capabilities` and the `login` branch of decision 9; create `scripts/stack-e2e.d/50-journeys.sh` from `test-plan-rows.md` § The step and the README row; and add the `stack/` row to `test/support/README.md`. The criteria `C-9f2ca313`, `C-96935fd5` and `C-78c649be` belong to the e2e gate and stay out of this task's `criteria_ids`. Run `pnpm run test test/support/stack/journeys-step.test.ts`, `pnpm run test test/support/stack/script.test.ts` (frozen: it reads every step file present), `pnpm run test test/support/readme.test.ts`, `pnpm run test web/src/ui/e2e-helpers.test.ts` and `pnpm run test test/arch/e2e-stack.test.ts` (frozen, green on arrival)
