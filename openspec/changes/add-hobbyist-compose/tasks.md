Tests follow `test-plan.md` (files, ids, fixtures), `test-plan-rows.md` and `test-plan-data.md` (the data files). Every test starts, inside its body, with a `typeof` assertion and an `existsSync` assertion per data file it reads, and wraps each call under test in `attempt` (the value or `{ thrown }`) so a throwing stub fails by assertion. Red tests import the names under test from `test/deploy/compose.ts`. Tests read files only; only `pnpm run test <path>` is run. The runtime half (`test-plan.md` § STACK-ONLY) is the delegate's; no task lists it and the verifier does not look for a test of it.

## 1. The compose file

- [ ] 1.1 Write `test/deploy/compose.test.ts` (scenario "The committed file and one mutation per rule": rows C1 to C24) and `test/deploy/compose-env.test.ts` (the two environment scenarios) first, then replace the scaffold stubs of `COMPOSE_PATH`, `STACK_SERVICES`, `ONE_SHOT_SERVICES`, `STACK_LIMITS`, `MINTKEY_DIGESTS`, `readCompose` (the `!reset` and `!override` tags) and `composeProblems` in `test/deploy/compose.ts` with the rules of the requirement "The compose file has six containers..." (services, name, restart, healthcheck, `container_name`, map-form environment, limits, `GOMEMLIMIT`, `MINTKEY_ENV`, images, the engine's `URSITOARE_HOST` and `URSITOARE_AUDIT_SINK`, realm placeholders, the three `:?` values, dependencies, the Postgres `-h`, volumes) and create `deploy/compose.yaml` from `test-plan-data.md`. Run `pnpm run test test/deploy/compose.test.ts`, `pnpm run test test/deploy/compose-env.test.ts` and `pnpm run test test/arch/secrets.test.ts`
- [ ] 1.2 Write `test/deploy/compose-network.test.ts` first (rows N1 to N10), then add the network and port rules to `composeProblems` (internal `app` and `mintkey`, membership per service, no `DATABASE` variable on the proxy, the two published ports). Run `pnpm run test test/deploy/compose-network.test.ts` and `pnpm run test test/deploy/compose.test.ts`
- [ ] 1.3 Write `test/deploy/compose-secrets.test.ts` first (rows S1 to S7 and the readers document), then add the credential rules to `composeProblems` (the engine's owner variables, secret lists, declared secrets, `_FILE` readers, the owner job's environment keys, the two identity ids). Run `pnpm run test test/deploy/compose-secrets.test.ts` and `pnpm run test test/deploy/compose.test.ts`

## 2. The owner job and the overlay

- [ ] 2.1 Write `test/deploy/owner-job.test.ts` first (rows O1 to O9 and the registry scenario), then replace the scaffold stubs of `OWNER_JOB_STEPS` and `ownerJobProblems` and create `deploy/owner-job.sh` from `test-plan-data.md`. Run `pnpm run test test/deploy/owner-job.test.ts`
- [ ] 2.2 Write `test/deploy/idp-external.test.ts` first (rows I1 to I6), then replace the scaffold stub of `idpExternalProblems` and create `deploy/compose.idp-external.yaml` from `test-plan-data.md`. Run `pnpm run test test/deploy/idp-external.test.ts`

## 3. The engine image

- [ ] 3.1 Write `test/deploy/dockerfile.test.ts` first (rows D1 to D10 and the build-context scenario), then replace the scaffold stubs of `dockerfileProblems` and `buildContext` and create `Dockerfile` and `.dockerignore` from `test-plan-data.md`. Run `pnpm run test test/deploy/dockerfile.test.ts` and `pnpm run test test/arch/secrets.test.ts`

## 4. The operator documents

- [ ] 4.1 Write `test/deploy/docs-deploy.test.ts` first, then create `docs/deploy.md` as the requirement "docs/deploy.md is the first-run guide" says (design 4, 7 and 8 give the facts). Run `pnpm run test test/deploy/docs-deploy.test.ts`
- [ ] 4.2 Write `test/deploy/docs-operations.test.ts` first, then create `docs/operations.md` as the requirement "docs/operations.md covers backup, restore, upgrade and rotation" says. Run `pnpm run test test/deploy/docs-operations.test.ts` and `pnpm run test test/arch/repo.test.ts`
