// Node test-runner global setup (package.json `test` script: --test-global-setup).
// Bootstrap placeholder: the test-database unit (openspec change add-db-foundation) fills it with the shared
// embedded-Postgres cluster. Test-support file: only a task that names it may change it.

export async function globalSetup(): Promise<void> {}

export async function globalTeardown(): Promise<void> {}
