## Purpose

The compiled sandbox runs in its own worker, as in an image.

## ADDED Requirements

### Requirement: The built worker entry answers a run without a factory
The output of `tsc -p tsconfig.build.json` SHALL spawn its own `worker-entry.js` through `workerEntryUrl` and answer a run, with no `workerFactory`.

#### Scenario: The built worker answers without a factory
- **WHEN** `BUILD` compiles the repo into `<dir>`, a fresh directory under `node_modules/.cache/`; the test imports `<dir>/sandbox/index.js`, creates `createWorkerSandbox({ size: 1 })`, runs `NORMALIZE` once, then closes the pool and removes `<dir>` in `finally`
- **THEN** tsc exits 0; the result is `ok: true` with `{ amount: 1234.57, currency: "EUR", is_large: true }`; `size` is 1; the built `workerEntryUrl` of `<dir>/sandbox/pool.js` is the `file:` URL of the existing `<dir>/sandbox/worker-entry.js`, and no other code can have answered; the test ends within 120000 ms
