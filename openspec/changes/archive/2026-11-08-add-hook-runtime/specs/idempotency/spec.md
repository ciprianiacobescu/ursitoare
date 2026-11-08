## Purpose

A retried effect attempt needs a key of its own, or the gate would answer `reuse` for an attempt meant to run again; this gives the gate a `generation`.

## ADDED Requirements

### Requirement: An effect retry is keyed by generation
`IntentCall` SHALL carry an optional `generation`, and `createEffectIntents(pool)` SHALL key `before` and `after` with `idemKey(tenantId, lineageId, nodeId, effectSeq, call.generation ?? 0)`, so an effect call on attempt `a` (generation `a - 1`) has its own intent row and key; Phase 1 uses `generation` for deliberate effect retries, and a Phase-2 re-fire must take the next unused generation of the node or move to an `ik2_` key.

#### Scenario: Keys per generation
- **WHEN** on `withTestDatabase()` with run `r_1` in tenant A, `intents = createEffectIntents(db.appPool)` and `CALL` the `pay` call of the gate scenarios (`erp.create_payment@1`, node `pay`, `effectSeq` 0) and `CTX()` their `live` context of `r_1` (`unsafeToRetry` false), `before(CALL, CTX())` runs, then with `generation` 0, then with `generation` 1, then `after({ ...CALL, generation: 1 }, CTX(), { output: PAID })`, then `before` with `generation` 1 again; `before` runs with `generation` -1 and 1.5
- **THEN** the first two return `{ action: "invoke", idemKey: K0 }` with `K0 = ik1_677d835c8e07871e5aabcc92745361cea1baa4e358b55523a1862f6cc5132714` and the table holds one row; the third returns `{ action: "invoke", idemKey: K1 }` with `K1 = ik1_7482341c2973317780d7b36cf8e02deffc0ec523cb0691e45fafba8a0b7a25e8` (`idemKey("tenant_a", "r_1", "pay", 0, 1)`) and a second row; after `after` the row of `K1` is `done` with `resultRef` `payloadDigest(PAID)` and that of `K0` is still `intent`; the last `before` for generation 1 returns `{ action: "reuse", idemKey: K1, result: { output: PAID } }`; both invalid generations throw `IntentError` `INTENT_INVALID`; the table still holds two rows
