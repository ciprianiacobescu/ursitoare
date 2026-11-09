# Delivered shapes taken by add-fake-egress-proxy

Declarations from main@cf34c628 (`file:line`). This unit takes one name and no M5 name.

```ts
// test/support/fake-oidc/contract.ts (U09), exported by test/support/fake-oidc/index.ts
export type ContractCheck = Readonly<{ name: string; run(): Promise<void> }>;   // :18
export function oidcContract(baseUrl: string, credentials: OidcContractCredentials): ContractCheck[]   // :416
```

## Facts from the merged code

- `test/support/fake-oidc/contract.test.ts:96-133`: the driver convention: start the fake, build the checks from the base URL, await `check.run()` of each with `assert.doesNotReject`; a broken stub makes `run()` reject with an `assert.AssertionError`. `egressContract` follows it and takes base URLs, never the fake object.
- `test/support/README.md:21`: the row `fake-egress/` (owner `add-fake-egress-proxy`, "Broker, proxy and vault contract with per-service upstream routing") exists; this change edits no document.
- `package.json:15` runs `test/**/*.test.ts`; `tsconfig.json` has `erasableSyntaxOnly`, `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` and includes `test/**/*.ts`. `test/arch/sources.ts:104` reads only `src/`, so `test/` may use `node:http`, `node:http2` and `fetch`.
