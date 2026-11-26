Tests follow `test-plan.md`, `test-plan-rows.md` and `test-plan-data.md`. Every test starts, inside its body, with a `typeof` assertion per function it calls and an `existsSync` assertion per data file it reads, and wraps each call under test in `attempt` (the value or `{ thrown }`) so a throwing stub fails by assertion. Red tests import from the file named in `design.md` § Interfaces, never from an index. The runtime half of every criterion (`test-plan.md` § STACK-ONLY) is the delegate's; no task lists it and the verifier does not look for a test of it. The main guards run only when their file is the entry script, so no test runs a script.

## 1. The overlay plan

- [ ] 1.1 Write `test/support/stack/overlay-plan.test.ts` first (scenarios "Four users, another group and no users" and "The base realm, a full realm and altered copies": rows P1 to P7), then replace the scaffold stubs of `stackOverlay`, `planOverlay` and `overlayGaps` in `test/support/stack/keycloak-overlay.ts`. Run `pnpm run test test/support/stack/overlay-plan.test.ts`

## 2. The admin client and its fake

- [ ] 2.1 Write `test/support/stack/overlay-admin.test.ts` first (both apply scenarios: F0, the two runs, rows E1 to E8), then replace the scaffold stubs of `startFakeAdmin` in `test/support/stack/fake-admin.ts` (routes of `test-plan-data.md` § The fake admin server) and of `MAX_OVERLAY_ROUNDS`, `readAdminState` and `applyRealmOverlay` in `test/support/stack/keycloak-overlay.ts`. Run `pnpm run test test/support/stack/overlay-admin.test.ts` and `pnpm run test test/support/stack/overlay-plan.test.ts`

## 3. The overlay entry

- [ ] 3.1 Write `test/support/stack/overlay-main.test.ts` first (scenario "A state directory, two runs, bad input and the compose file"; it imports `readCompose` from `test/deploy/compose.ts` and `SECRET_FILES` from `src/cli/init-secrets.ts`), then replace the scaffold stubs of `stackAdminDeps` and `overlayMain` in `test/support/stack/keycloak-overlay.ts` and add the main guard (`process.exitCode = await overlayMain(process.argv.slice(2), …)` on the real streams). Run `pnpm run test test/support/stack/overlay-main.test.ts` and `pnpm run test test/support/stack/overlay-admin.test.ts`

## 4. The template

- [ ] 4.1 Write `test/support/stack/reset-template.test.ts` first (scenario "Create, repeat, a template one migration behind, and refusals"; its own `startCluster()`, the output captured), then replace the scaffold stubs of `ENGINE_DATABASE`, `TEMPLATE_DATABASE`, `ResetError` and `prepareTemplate` in `test/support/stack/reset.ts`. Run `pnpm run test test/support/stack/reset-template.test.ts`

## 5. The reset and its recovery

- [ ] 5.1 Write `test/support/stack/reset-engine.test.ts` first (scenario "Recreate, a restart, a silent engine and refusals") and `test/support/stack/reset-recovery.test.ts` (scenario "A reset that fails after the drop, then db-roles, db-prepare and a reset"; it imports `createDefaultRegistry` from `src/cli/builtin.ts` and `runCli` from `src/cli/run.ts`), then replace the scaffold stubs of `resetEngineDatabase` and `waitForEngine` in `test/support/stack/reset.ts`. Run `pnpm run test test/support/stack/reset-engine.test.ts`, `pnpm run test test/support/stack/reset-recovery.test.ts` and `pnpm run test test/support/stack/reset-template.test.ts`

## 6. The reset entry

- [ ] 6.1 Write `test/support/stack/reset-main.test.ts` first (scenario "Prepare, wait, a dead engine, bad input and the compose file"), then replace the scaffold stubs of `stackResetDeps` and `resetMain` in `test/support/stack/reset.ts` and add the main guard. Run `pnpm run test test/support/stack/reset-main.test.ts` and `pnpm run test test/support/stack/reset-engine.test.ts`

## 7. The steps and the README

- [ ] 7.1 Write `test/support/stack/steps.test.ts` first (scenario "The committed steps, two altered copies and the README row"; it imports `scriptProblems` from `test/support/stack/project.ts` and reads every `scripts/stack-e2e.d/*.sh` present), then create `scripts/stack-e2e.d/10-overlay.sh` and `scripts/stack-e2e.d/20-reset.sh` from `test-plan-data.md` and append the README row to `test/support/README.md`. Run `pnpm run test test/support/stack/steps.test.ts`, `pnpm run test test/support/readme.test.ts` and `pnpm run test test/arch/secrets.test.ts`
