Every test file starts with `assert.equal(typeof <function under test>, "function")`, wraps stub calls so a throw fails by assertion, closes databases, servers and runtimes in `finally`, and has no `.`, `[` or `::` in test names. Red tests import from the file the Interfaces header names, never from an `index.ts`; route and `main` tests import U49b's names from their defining files (`../grants/args.ts`, `../grants/policy-runtime.ts`, `../grants/policy-sets.ts`; test files are outside the module-graph rule, `test/arch/rules.ts:216`). Values: both test plans. No frozen test is edited.

## 1. The table

- [ ] 1.1 Write `src/grants/policy-schema.test.ts` first (it starts with `assert.ok` on the ledger row 495), then add `src/db/migrations/0495_policy_sets.sql` with the SQL of `test-plan.md` § Migration verbatim, implementing requirement "A policy set is one tenant row of which only the current flag changes"

## 2. Argument types and conversion

- [ ] 2.1 Write `src/grants/args.test.ts` first, then implement `toolArgTypes` and `toCedarArgs` in `src/grants/args.ts`, implementing requirements "toolArgTypes derives the Cedar types of the tenant's block arguments" and "toCedarArgs converts a tool call's arguments or names the first that cannot be"

## 3. The runtime and the sets

- [ ] 3.1 Write `src/pdp/engine-instance.test.ts` first, then add the optional `instanceId` to `PolicyEngineOptions` in `src/pdp/policy-engine.ts` and to the options of `createPdp` in `src/pdp/engine.ts` (it names the preparsed set and schema; no id keeps the counter), implementing requirement "An engine built under an instance id replaces the preparsed set of that id"; in the same task write `src/pdp/load-diagnostic.test.ts` first (frozen `load.test.ts` and `policy-engine.test.ts` stay as they are), then add `details.diagnostic` to the `parse` and `validate` failures of `src/pdp/load.ts`, implementing the `message` of requirement "validatePolicySet reports every problem by stage and writes nothing"
- [ ] 3.2 Write `src/grants/policy-runtime.test.ts` first, then implement `createPolicyRuntime`, `runtimeInternals` and `readCurrentSet` in `src/grants/policy-runtime.ts`, implementing requirements "A tenant's layer never decides another tenant's request" (both scenarios, `deploy_policy` included), "A tenant's set loads lazily and a failed load denies with an error without being cached" and "Validation and deploy keep a bounded amount of memory" (its test is in `src/grants/policy-memory.test.ts`, written first in this task)
- [ ] 3.3 Write `src/grants/policy-validate.test.ts` first, then implement `validatePolicySet` in `src/grants/policy-sets.ts`, implementing requirement "validatePolicySet reports every problem by stage and writes nothing"
- [ ] 3.4 Write `src/grants/policy-deploy.test.ts` first, then implement `PolicyDeployError`, `deployPolicySet` and `currentPolicySet` in `src/grants/policy-sets.ts`, implementing requirements "deployPolicySet stores the set, audits it and swaps the tenant's engine", "A refused, repeated or failing deploy leaves the store as it was" and "A revoked grant is denied at the next check after a deploy"

## 4. Routes and main

- [ ] 4.1 Write `src/api/policy-routes.test.ts` first, then implement `registerPolicyRoutes` (with the `pendingGrants` count) in `src/api/policy-routes.ts` and add the export lines to `src/api/index.ts` and (for `args.ts`, `policy-runtime.ts`, `policy-sets.ts`) to `src/grants/index.ts`, implementing requirement "The policy routes require deploy_policy and answer with the module's results"
- [ ] 4.2 Edit `src/main.ts` (shared with U46-U49 and U51; after U49's edit): write `src/main.policy.test.ts` first, then replace the `createPolicyEngine` call by `createPolicyRuntime`, give `runtime.engine` to `installPep` and `registerMeRoute`, call `registerPolicyRoutes` after the grant routes and regenerate `docs/api/openapi.json` with `node test/support/openapi-docs.ts` (guarded by the frozen `src/main.conventions.test.ts::C-d150bfa4 the committed OpenAPI document equals the text the real engine serves`), implementing requirement "main serves the runtime and the OpenAPI document lists the routes"
