# Delivered shapes taken by add-policy-catalogue

The M0 names this change takes (proposal.md, "Interfaces taken"), as declared by the merged code on main (fb48c96): `tsc --emitDeclarationOnly` output, with `export` and `declare` dropped. The code is the truth; this file only shows its shapes to the readiness judge.

```ts
// add-engine-skeleton (src/core)
interface Clock { now(): Date }
interface IdSource { next(prefix: string): string }
function fixedClock(iso: string): Clock
function sequentialIds(seed?: number): IdSource
// add-engine-skeleton (src/observability)
type Logger = PinoLogger
function createLogger(opts: { level: LogLevel; destination?: LogDestination; clock?: Clock }): Logger
// add-tenancy-foundation (src/tenancy)
const TENANT_ID_PATTERN: RegExp
```
