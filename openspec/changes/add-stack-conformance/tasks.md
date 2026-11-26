Tests follow `test-plan.md` and `test-plan-rows.md`; step texts are in `test-plan-data.md`. Every test starts with a `typeof` assertion per function it calls and an `existsSync` assertion per file it reads, and wraps each call under test in `attempt` (the value or `{ thrown }`) so a throwing stub fails by assertion. Red tests import each name from the file its `design.md` § Interfaces header names. The stack half of every scenario (`test-plan.md` § STACK-ONLY) is the delegate's: no task runs it, (a verifier's hold on it is answered with the run log). Entry files run their `...Main` only as the entry script.

## 1. The snapshots and exit 10

- [ ] 1.1 Write `test/support/stack/snapshot.test.ts` first (`C-fc6a3269 a snapshot keeps six fields`), then replace the stubs of `SNAPSHOT_ENV_KEEP`, `snapshotOf`, `readSnapshot`, `writeRunFile`, `runDirectory` and the `snapshot` mode of `conformanceMain` in `test/support/stack/conformance.ts`. Run `pnpm run test test/support/stack/snapshot.test.ts`
- [ ] 1.2 Write `test/support/stack/exit10.test.ts` first (`C-573d23d6 exit 10 counts six containers`; it imports `STACK_SERVICES`, `STACK_LIMITS` from `test/deploy/compose.ts`), then replace `exit10Problems`, `limitSummary` and the `exit10` mode. Run `pnpm run test test/support/stack/exit10.test.ts`

## 2. The form step

- [ ] 2.1 Write `test/support/fake-oidc/contract-form.test.ts` first (`C-33519c13 the form step reads any attribute order`), then edit `loadForm` in `test/support/fake-oidc/contract.ts` (decision 8). Run `pnpm run test test/support/fake-oidc/contract-form.test.ts` and `pnpm run test test/support/fake-oidc/contract.test.ts` (frozen, green on arrival)

## 3. The contract runner and the exit rows

- [ ] 3.1 Write `test/support/stack/contracts-target.test.ts` first (`C-7c2383bc a target from files and every row`; it imports `REALM_CLIENTS` from `test/deploy/realm.ts`), then replace `STACK_EXTRA_CHECKS`, `stackContractTarget` and `runStackContracts` in `test/support/stack/contracts.ts`: the two suites, the five extra checks and the per-check timeout (`checkTimeoutMs`, default 60000). Run `pnpm run test test/support/stack/contracts-target.test.ts`
- [ ] 3.2 Write `test/support/stack/contracts-failure.test.ts` first (`C-1a1ac1b7 a failing check never throws`), then replace `redactDetail` and add the scrubbing to `runStackContracts` (decision 7); the test bounds its own wait (`test-plan.md` § Fixtures). Run `pnpm run test test/support/stack/contracts-failure.test.ts`
- [ ] 3.3 Write `test/support/stack/contracts-verdict.test.ts` first (`C-cbde6ea3 contractProblems and the verdict mode`), then replace `STACK_CONTRACT_REPORT`, `contractProblems` and the usage and `verdict oidc` and `egress` modes of `contractsMain`. Run `pnpm run test test/support/stack/contracts-verdict.test.ts`
- [ ] 3.4 Write `test/support/stack/exit19.test.ts` first (`C-55fe75c6 the exit 19 rows on a stub`; it imports `stackOverlay` from `test/support/stack/keycloak-overlay.ts`), then fill `EXIT_ROWS[19]` and the `verdict exit19` mode. Run `pnpm run test test/support/stack/exit19.test.ts`
- [ ] 3.5 Write `test/support/stack/exit12.test.ts` first (`C-61cbee8d exit 12 environment and refusal rows`), then replace `exit12EnvProblems`, fill `EXIT_ROWS[12]` and add the `exit12` mode of `conformanceMain` and `verdict exit12`. Run `pnpm run test test/support/stack/exit12.test.ts`
- [ ] 3.6 Write `test/support/stack/canary.test.ts` first (`C-919bd381 the egress refuses a loopback name`), then replace `summaryLines` and add the `verdict c4` mode (decision 9). Run `pnpm run test test/support/stack/canary.test.ts`

## 4. Restarts and the flood

- [ ] 4.1 Write `test/support/stack/restart.test.ts` first (`C-b208781f restarts, OOM kills and the flood`), then replace `restartProblems` and `floodCheck`, add `opts.flood` to `runStackContracts` and the `run`, `flood`, `bracket`, `summary` and `checks` modes of `contractsMain` (decisions 5 and 6). Run `pnpm run test test/support/stack/restart.test.ts`

## 5. The probes

- [ ] 5.1 Write `test/support/stack/sink-probe.test.ts` first (`C-640a7f33 the sink probe counts three rows`; it imports `mapMintkeyEvent`, `refusalEvent` and `SINK_REFUSAL_EVENT` from `src/audit/sink-event.ts`), then replace `countSinkRows`, `sinkProblems`, `sinkProbe` and `sinkProbeMain` in `test/support/stack/sink-probe.ts` (decision 10). Run `pnpm run test test/support/stack/sink-probe.test.ts`
- [ ] 5.2 Write `test/support/stack/credential-probe.test.ts` first (`C-b5b4cac0 the credential probe writes through`), then replace `credentialProbe`, `credentialProblems` and `credentialProbeMain` in `test/support/stack/credential-probe.ts`. Run `pnpm run test test/support/stack/credential-probe.test.ts`

## 6. The steps, the Python file and the README

- [ ] 6.1 Write `test/support/stack/conformance-steps.test.ts` first (`C-538f6b35 the committed steps and the Python file`), then create `scripts/stack-e2e.d/05-snapshot.sh`, `40-contracts.sh`, `60-conformance.sh` and `90-checks.sh` and `e2e/test_stack_conformance.py` from `test-plan-data.md` and `test-plan.md` § Python rows (no task runs its tests), and add the README row. Run `pnpm run test test/support/stack/conformance-steps.test.ts`, `pnpm run test test/support/stack/script.test.ts` (frozen: it reads every step file), `pnpm run test test/support/readme.test.ts`, `pnpm run test web/src/ui/e2e-helpers.test.ts` and `pnpm run test test/arch/e2e-stack.test.ts` (frozen, green on arrival)
