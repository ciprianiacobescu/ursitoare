## 1. Views

- [ ] 1.1 Write `src/api/run-views.test.ts` first (scenario "Views, schemas and the policy resource": `Object.keys` of both views, the copies checked with `notEqual`, the schemas' `required` and `Object.keys(properties ?? {})` against the view's key list, `runResource` with `entityRef`), then implement `RunView`, `StepView`, `PayloadView`, `toRunView`, `toStepView`, `RUN_VIEW_SCHEMA`, `STEP_VIEW_SCHEMA` and `runResource` in `src/api/run-views.ts` and export them from `src/api/index.ts`, implementing requirement "Run and step views expose the stored rows"

## 2. The policy fragment

- [ ] 2.1 Write `src/runs/policy.test.ts` first (scenario "The policy table": `createPolicyEngine` over `defaultSrcDir()`, requests built with `userEntity`, `tenantEntity` and a `Run` entity whose attrs use `entityRef`, as `src/registry/policy.test.ts` does; every decision's `errors` is `[]`; the `runs-` ids sorted), then create `src/runs/policy/runs.cedar` with the four policies of design.md Decision 10, implementing requirement "One policy fragment permits the read and debug actions"

## 3. The list route and the error code

- [ ] 3.1 Write `src/api/run-list.test.ts` first (scenarios "Who sees which runs" and "Filters and paging" over the design.md § Test plan fixture; the keyless server; `ERROR_CODES.RUNS_UNAVAILABLE` against `{ status: 503, message: "Runs are unavailable" }`; the list with `pool: null` is 503 `RUNS_UNAVAILABLE`), then implement `RunApiDeps` and `registerRunRoutes` in `src/api/run-routes.ts` with `GET /api/v1/runs` only (Decisions 2, 3 and 5), add the `RUNS_UNAVAILABLE` entry to `ERROR_CODES` in `src/api/error-codes.ts` and export both names from `src/api/index.ts`, implementing requirements "The run list shows the owner team's runs and the caller's own" and "A missing store or runtime answers RUNS_UNAVAILABLE" and the modified requirement "Every error code is registered" of `api-conventions`; red also changes the existing test `src/api/error-codes.test.ts::C-96e47324 The registry holds exactly the 16 codes of the API with status and message` in place, so that its `EXPECTED_CODES` holds its 23 entries plus `RUNS_UNAVAILABLE` (it fails by assertion until green adds the entry)

## 4. Reading one run

- [ ] 4.1 Write `src/api/run-read.test.ts` first (scenarios "Reading one run", "Steps in order and paged" and "Referenced, unreferenced, malformed and expired", with the owner-pool payload delete), then add `GET /api/v1/runs/:runId`, `GET /api/v1/runs/:runId/steps` and `GET /api/v1/runs/:runId/payloads/:sha256` to `registerRunRoutes` in `src/api/run-routes.ts` (the resource loader of Decision 4, Decisions 6 and 7), implementing requirements "A run is read by its owner team and its initiator", "Steps are listed in seq order" and "A payload is served only through a run that references it"

## 5. Cancel and isolation

- [ ] 5.1 Write `src/api/run-cancel.test.ts` first (scenarios "Cancelling an active run", "Cancel refusals leave the run alone" and "No pool and no runtime", with the switchable `durable.cancel` fake and the owner-pool `event` read) and `src/api/run-tenants.test.ts` (scenario "Tenant B reaches nothing of tenant A", ending with alice's cancel of `run-5`), then add `POST /api/v1/runs/:runId/cancel` to `registerRunRoutes` in `src/api/run-routes.ts` (Decision 8), implementing requirements "Cancel stops an active run once", "A missing store or runtime answers RUNS_UNAVAILABLE" and "Tenants never see each other's runs"

## 6. Engine wiring and API document

- [ ] 6.1 Write `src/main.runs.test.ts` first (scenario "The route table, the document and the wiring": the no-database `main` as `src/main.flows.test.ts` runs it, `docs/api/openapi.json` read after an `assert.ok` that it exists, and the database-backed `main` with fake `openDatabase` and `launchDurable`), then in `src/main.ts` call `registerRunRoutes` as design.md Decision 11 says and regenerate `docs/api/openapi.json` with `node test/support/openapi-docs.ts`, implementing requirement "The routes are session routes under the run actions and are wired into the engine"
