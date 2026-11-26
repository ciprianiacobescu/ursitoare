Tests follow `test-plan.md`, `test-plan-rows.md` and `test-plan-data.md`. Every test starts, inside its body, with a `typeof` assertion per function it calls and an `existsSync` assertion per data file it reads, and wraps each call under test in `attempt` (the value or `{ thrown }`) so a throwing stub fails by assertion. Red tests import from the file named in `design.md` § Interfaces. The runtime half (`test-plan.md` § STACK-ONLY) is the delegate's: no task lists it. The scripts run as `bash scripts/stack-e2e.sh`.

## 1. The test certificates

- [ ] 1.1 Write `test/support/stack/tls.test.ts` first (scenario "Chain, host names and a real handshake"), then replace the stubs in `test/support/stack/tls.ts` (`FAKE_HOSTS`, `createTestCa`, `issueServerCertificate`) with `node:crypto` and a small DER writer. Run `pnpm run test test/support/stack/tls.test.ts`

## 2. Project rules, overlay and state

- [ ] 2.1 Write `test/support/stack/overlay.test.ts` first (both overlay scenarios, rows O1 to O13), then replace the stubs of the constants, `readOverlay`, `mergeCompose` and `overlayProblems` in `test/support/stack/project.ts`, and create `deploy/compose.e2e.yaml` from `test-plan-data.md`. Run `pnpm run test test/support/stack/overlay.test.ts`
- [ ] 2.2 Write `test/support/stack/state.test.ts` first (both state scenarios), then replace the scaffold stubs of `OverlayUser` use, `OVERLAY_USERS`, `stateProblems`, `readUsers`, `readClients`, `prepareState` and the `state`, `prepare`, `check` and usage branches of `projectMain` in `test/support/stack/project.ts`, and add its main guard (`projectMain(process.argv.slice(2), …)` on the real stdin, stdout and stderr when `project.ts` is the entry script). Run `pnpm run test test/support/stack/state.test.ts`

## 3. Forwarders and the runner entry

- [ ] 3.1 Write `test/support/stack/forward.test.ts` first (scenario "Pass-through, a closed target, a busy port and the exit code"), then replace the scaffold stubs of `stackForwards` and `startForwarders` in `test/support/stack/forward.ts` and of `runnerMain` in `test/support/stack/runner-main.ts` (with its main guard: `process.exitCode = await runnerMain(process.argv.slice(2))`). Run `pnpm run test test/support/stack/forward.test.ts`

## 4. The fakes behind one TLS front

- [ ] 4.1 Write `test/support/stack/fakes-main.test.ts` first (the `fakeRoute` table and rows F1 to F6; certificates from `tls.ts`), then replace the scaffold stubs of `fakeRoute` and `startStackFakes` in `test/support/stack/fakes-main.ts` and add its main guard (`STACK_TLS_DIR`, close on `SIGTERM`). Run `pnpm run test test/support/stack/fakes-main.test.ts`

## 5. The vault client and the proxy smoke

- [ ] 5.1 Write `test/support/fake-egress/vault-client-pairs.test.ts` first (scenario "The vault client sends both pairs and the fake still accepts"), then edit `callVault` in `test/support/fake-egress/vault-client.ts` to send the two service headers beside the existing two. Run `pnpm run test test/support/fake-egress/vault-client-pairs.test.ts`, `pnpm run test test/support/fake-egress/vault.test.ts` and `pnpm run test test/support/fake-egress/contract.test.ts` (the last two frozen, green on arrival)
- [ ] 5.2 Write `test/support/stack/smoke.test.ts` first (scenario "proxySmoke against the fake egress"), then replace the scaffold stubs of `proxySmoke` and `smokeTarget` in `test/support/stack/smoke.ts` and add its main guard (`smokeTarget(process.env.STACK_DIR ?? "/run/stack-e2e")`, print `ok: <detail>` or `failed: <detail>`, exit 0 or 1). Run `pnpm run test test/support/stack/smoke.test.ts`

## 6. The runner image

- [ ] 6.1 Write `test/support/stack/runner-image.test.ts` first (scenario "The committed Dockerfile and ignore file"; it imports `buildContext` from `test/deploy/compose.ts`; it does not read `.gitignore`, whose lines are present at base), then create `deploy/e2e/runner.Dockerfile` and `deploy/e2e/runner.Dockerfile.dockerignore` from `test-plan-data.md`. Run `pnpm run test test/support/stack/runner-image.test.ts`

## 7. The run script

- [ ] 7.1 Write `test/support/stack/script.test.ts` first (both script scenarios, rows S1 to S21, S5b, T1 to T27 and `projectMain steps`; it reads every `scripts/stack-e2e.d/*.sh`), then replace the scaffold stub of `scriptProblems` and add the `steps` branch of `projectMain` in `test/support/stack/project.ts` and create `scripts/stack-e2e.sh` and `scripts/stack-e2e.d/30-proxy-smoke.sh` from `test-plan-data.md`. Run `pnpm run test test/support/stack/script.test.ts`

## 8. The documents

- [ ] 8.1 Write `test/support/stack/docs.test.ts` first (scenario "The documents"), then edit `docs/testing.md` (the `## Stack profile` section of `test-plan.md` § Docs before the closing paragraph, which points to it; `A reset discards every durable workflow` stays) and add the `stack/` row to `test/support/README.md`. Run `pnpm run test test/support/stack/docs.test.ts`
