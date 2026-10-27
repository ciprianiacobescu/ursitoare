# Verification: openspec:add-audit-chain: PASS (round 3)

traceability: 33/33 criteria covered by a discriminating test

- Base: `674213c8e6eef65013b8eb692187722af8b42e27`
- Head: `fd601d515ab367743106d99c2723f583e1649f95`
- Implementer profiles: deepseek, claude-sonnet
- Judge: claude-judge (claude-opus-5-5), 3 call(s), judged in 2 parts and 1 follow-up, prompt sha256 `4607de6095f89799a0d368aae05bde8d80832d1c10775a3c8c86d5e30e17afe7`
  - part 1: 23 file(s), 116790 characters, profile claude-judge, reply valid
  - part 2: 5 file(s), 28963 characters, profile claude-judge, reply valid
  - follow-up 1: C-1651bb74; files of parts 1 and 2: 3 file(s), 19350 characters, profile claude-judge, reply valid
- Judge replies of claude-judge (this unit, all rounds): valid 6, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): claude-judge anthropic (served claude-opus-5-5), deepseek deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $2.8674

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | ok | 0.6 | base main@674213c8e6 contained |
| 1 | integrity | ok | 29.2 | 10 sub-checks; scope: 42 changed file(s) |
| 2 | build | ok | 13.6 |  |
| 3 | tests | ok | 35.5 |  |
| 4 | traceability | ok | 0.1 | 33/33 criteria covered |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | ok | 0.0 | not measured: diff coverage measures python only; changed code outside it: src/audit/anchor.ts, src/audit/append.ts, src/audit/canonical.ts, src/audit/errors.ts, src/audit/event.ts and 3 more |
| 8 | s1 judge | ok | 3.1 | 33/33 criteria judged by jev |
| 9 | judge | ok | 249.8 | 3 call(s) |
| 10 | aggregation | ok | 0.0 | PASS |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261027T1951Z-f3c5/069-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261027T1951Z-f3c5/070-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261027T1951Z-f3c5/071-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261027T1951Z-f3c5/072-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261027T1951Z-f3c5/073-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261027T1951Z-f3c5/074-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261027T1951Z-f3c5/075-e2e.log |

## Files by part

- part 1: openspec/changes/add-audit-chain-fix-1/.openspec.yaml (299 characters)
- part 1: src/db/migrations/0080_audit.sql (3821 characters)
- part 1: src/audit/anchor.test.ts (5585 characters)
- part 1: src/audit/anchor.ts (3579 characters)
- part 1: src/audit/append.test.ts (10772 characters)
- part 1: src/audit/append.ts (4022 characters)
- part 1: src/audit/canonical.test.ts (3653 characters)
- part 1: src/audit/canonical.ts (2469 characters)
- part 1: src/audit/committed.test.ts (5036 characters)
- part 1: src/audit/errors.ts (1412 characters)
- part 1: src/audit/event.test.ts (6261 characters)
- part 1: src/audit/event.ts (6711 characters)
- part 1: src/audit/hash.test.ts (3349 characters)
- part 1: src/audit/hash.ts (2188 characters)
- part 1: src/audit/mac.test.ts (1854 characters)
- part 1: src/audit/mac.ts (1680 characters)
- part 1: src/db/prepare.test.ts (865 characters)
- part 1: src/audit/property.test.ts (6141 characters)
- part 1: openspec/changes/add-audit-chain-fix-1/proposal.md (5415 characters)
- part 1: src/audit/schema.test.ts (10869 characters)
- part 1: openspec/changes/add-audit-chain-fix-1/specs/audit/spec.md (2043 characters)
- part 1: openspec/changes/add-audit-chain-fix-1/tasks.md (751 characters)
- part 1: openspec/changes/add-audit-chain/tasks.md (28015 characters)
- part 2: src/audit/verify.anchor.test.ts (6616 characters)
- part 2: src/audit/verify.test.ts (6693 characters)
- part 2: src/audit/verify.tip.test.ts (5816 characters)
- part 2: src/audit/verify.ts (6516 characters)
- part 2: src/audit/verify.unhashable.test.ts (3322 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 1 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 9 task(s): red and green compared |
| test path freeze | ok | 9 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/audit/anchor.test.ts, src/audit/anchor.ts, src/audit/append.test.ts, src/audit/append.ts, src/audit/canonical.test.ts (+17 more) |
| tdd history | ok | 14 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 470 of 470 base tests pass on the unit's code with its 13 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/db/prepare.test.ts kept at head for the run (task 3.1: unfrozen by Q-001)

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-3266a83e | audit › One canonicalization function › RFC 8785 vectors | covered | src.audit.canonical.test.ts::C-3266a83e canonicalize sorts keys by code unit and writes safe bigints as numbers (passed, red_assertion); src.audit.canonical.test.ts::C-3266a83e canonicalize writes the RFC 8785 section 3.2.4 document (passed, red_assertion) | - | 0.94 |
| C-b6ba3144 | audit › One canonicalization function › Refused values | covered | src.audit.canonical.test.ts::C-b6ba3144 canonicalize accepts 64 nested arrays (passed, red_assertion); src.audit.canonical.test.ts::C-b6ba3144 canonicalize refuses values it cannot write exactly (passed, red_assertion) | - | 0.85 |
| C-cbcb0ebb | audit › The chain hash covers the whole event › Known answers | covered | src.audit.hash.test.ts::C-cbcb0ebb canonicalEvent writes the whole event in RFC 8785 order (passed, red_assertion); src.audit.hash.test.ts::C-cbcb0ebb chainHash hashes prevHash and the canonical event (passed, red_assertion) | - | 0.94 |
| C-c65f6066 | audit › The chain hash covers the whole event › Bad hash inputs and formatAt | covered | src.audit.hash.test.ts::C-c65f6066 chainHash refuses a prevHash that is not 32 bytes (passed, red_assertion); src.audit.hash.test.ts::C-c65f6066 chainHash refuses an at without six fraction digits (passed, red_assertion); src.audit.hash.test.ts::C-c65f6066 formatAt refuses an invalid date and a date... | - | 0.89 |
| C-471c7ac3 | audit › Events are validated before any SQL › Accepted inputs | covered | src.audit.event.test.ts::C-471c7ac3 validateEvent carries mintkey trace fields through (passed, red_assertion); src.audit.event.test.ts::C-471c7ac3 validateEvent fills defaults for a minimal accepted input (passed, red_assertion) | - | 0.93 |
| C-f2814e48 | audit › Events are validated before any SQL › Refused shapes | covered | src.audit.event.test.ts::C-f2814e48 validateEvent accepts a payload of exactly 32768 canonical bytes (passed, red_assertion); src.audit.event.test.ts::C-f2814e48 validateEvent passes canonicalization failures through (passed, red_assertion); src.audit.event.test.ts::C-f2814e48 validateEvent refuses ... | - | 0.92 |
| C-a4f784d0 | audit › Events are validated before any SQL › Secret-like keys | covered | src.audit.event.test.ts::C-a4f784d0 isSecretKeyName recognises only secret-like names (passed, red_assertion); src.audit.event.test.ts::C-a4f784d0 validateEvent ignores secret-shaped values (passed, red_assertion); src.audit.event.test.ts::C-a4f784d0 validateEvent refuses secret-like payload keys at... | - | 0.88 |
| C-025c6804 | audit › The audit tables are append-only and closed to the app role › Objects, grants and catalog | covered | src.audit.schema.test.ts::C-025c6804 migration 0080 creates the audit tables with the grants of the design (passed, red_assertion) | - | 0.89 |
| C-ad561f69 | audit › The audit tables are append-only and closed to the app role › Nobody can change or remove | covered | src.audit.schema.test.ts::C-ad561f69 nobody can change or remove an audit row (passed, red_assertion) | - | 0.94 |
| C-f5d19d53 | audit › The audit tables are append-only and closed to the app role › An event must match the head | covered | src.audit.schema.test.ts::C-f5d19d53 an event must match the chain head (passed, red_assertion) | - | 0.90 |
| C-604e6b16 | audit › Appending is gapless inside the caller's transaction › First and second event | covered | src.audit.append.test.ts::C-604e6b16 the first and second event chain from the genesis hash (passed, red_assertion) | - | 0.91 |
| C-65370859 | audit › Appending is gapless inside the caller's transaction › One clock read per append | covered | src.audit.append.test.ts::C-65370859 the clock is read once per append and the chain verifies (passed, red_assertion) | - | 0.92 |
| C-d5cc8dfe | audit › Appending is gapless inside the caller's transaction › Rollback leaves no gap | covered | src.audit.append.test.ts::C-d5cc8dfe a rollback leaves no gap in the sequence (passed, red_assertion) | - | 0.91 |
| C-c6c268de | audit › Appending is gapless inside the caller's transaction › Wrong or missing tenant context | covered | src.audit.append.test.ts::C-c6c268de a context that differs from the transaction is refused (passed, red_assertion); src.audit.append.test.ts::C-c6c268de a transaction without a tenant is refused (passed, red_assertion); src.audit.append.test.ts::C-c6c268de an unknown tenant and driver errors become... | - | 0.92 |
| C-ae0a41bf | audit › Appending is gapless inside the caller's transaction › An invalid event writes nothing | covered | src.audit.append.test.ts::C-ae0a41bf an invalid event writes nothing (passed, red_assertion) | - | 0.93 |
| C-2213b533 | audit › Appending is gapless inside the caller's transaction › Month boundary and DEFAULT | covered | src.audit.append.test.ts::C-2213b533 events land in the monthly partition or the default one (passed, red_assertion) | - | 0.74 |
| C-889bdc82 | audit › A refusal is audited in its own transaction, per tenant › Survives the caller's rollback | covered | src.audit.committed.test.ts::C-889bdc82 an event appended in its own transaction survives the caller's rollback (passed, pre_satisfied) | - | 0.89 |
| C-6cf5f236 | audit › A refusal is audited in its own transaction, per tenant › Twenty parallel appends | covered | src.audit.committed.test.ts::C-6cf5f236 twenty parallel appends give seq 1 to 20 on one chain (passed, pre_satisfied) | - | 0.94 |
| C-90861dd2 | audit › A refusal is audited in its own transaction, per tenant › Two tenants | covered | src.audit.committed.test.ts::C-90861dd2 each tenant has its own chain and a bad event stores nothing (passed, pre_satisfied) | - | 0.94 |
| C-fb4bbd56 | audit › verifyChain reports the first bad event › Empty and valid chains | covered | src.audit.verify.test.ts::C-fb4bbd56 empty and valid chains verify and bad options are refused (passed, pre_satisfied) | - | 0.93 |
| C-d5bb5978 | audit › verifyChain reports the first bad event › A changed field | covered | src.audit.verify.test.ts::C-d5bb5978 a changed a payload leaf at seq 4 is a hash failure (passed, pre_satisfied); src.audit.verify.test.ts::C-d5bb5978 a changed at by one microsecond at seq 4 is a hash failure (passed, pre_satisfied); src.audit.verify.test.ts::C-d5bb5978 a changed event_type at seq ... | - | 0.92 |
| C-bdc0da1a | audit › verifyChain reports the first bad event › Missing and duplicate events | covered | src.audit.verify.test.ts::C-bdc0da1a a deleted first event is a gap at seq 1 (passed, pre_satisfied); src.audit.verify.test.ts::C-bdc0da1a a deleted middle event is a gap at its seq (passed, pre_satisfied); src.audit.verify.test.ts::C-bdc0da1a a repeated seq is a gap at the next expected seq (passed... | - | 0.92 |
| C-707dcf8b | audit › verifyChain reports the first bad event › The tip and part-way verification | covered | src.audit.verify.tip.test.ts::C-707dcf8b a changed head hash is a hash failure at the tip (passed, pre_satisfied); src.audit.verify.tip.test.ts::C-707dcf8b a deleted tail event with the head kept is a gap at the head seq (passed, pre_satisfied); src.audit.verify.tip.test.ts::C-707dcf8b a head below ... | - | 0.91 |
| C-9dc2dff3 | audit › Writer and verifier agree on random events › Round trip of seeded random JSON | covered | src.audit.property.test.ts::C-9dc2dff3 random JSON round trips and random chains verify (passed, pre_satisfied) | - | 0.93 |
| C-1651bb74 | audit › Writer and verifier agree on random events › Any single change is detected | covered | src.audit.property.test.ts::C-1651bb74 any single change to a random chain is a hash failure at that event (passed, pre_satisfied) | - | 0.93 |
| C-23b4c80c | audit › Anchors sign the chain head › Known answer and idempotence | covered | src.audit.anchor.test.ts::C-23b4c80c anchorHead signs the head and repeats idempotently (passed, red_assertion); src.audit.mac.test.ts::C-23b4c80c anchorMac depends on the tenant (passed, red_assertion); src.audit.mac.test.ts::C-23b4c80c anchorMac matches the known answer (passed, red_assertion) | - | 0.92 |
| C-9a188adc | audit › Anchors sign the chain head › Refusals | covered | src.audit.anchor.test.ts::C-9a188adc anchorHead refuses a head that differs from the last event (passed, red_assertion); src.audit.anchor.test.ts::C-9a188adc anchorHead refuses an empty chain and stores nothing (passed, red_assertion); src.audit.anchor.test.ts::C-9a188adc anchorHead refuses another ... | - | 0.92 |
| C-2437f60b | audit › verifyChain checks anchors when given the key › Good anchors and a wrong key | covered | src.audit.verify.anchor.test.ts::C-2437f60b good anchors verify with the key and a wrong key is an anchor failure (passed, red_assertion) | - | 0.93 |
| C-97d0b64b | audit › verifyChain checks anchors when given the key › Tampered anchors and a short chain | covered | src.audit.verify.anchor.test.ts::C-97d0b64b a changed anchor hash with a recomputed mac is an anchor failure (passed, red_assertion); src.audit.verify.anchor.test.ts::C-97d0b64b a changed anchor mac is an anchor failure (passed, red_assertion); src.audit.verify.anchor.test.ts::C-97d0b64b an anchor p... | - | 0.94 |
| C-c8eb7dcb | audit › verifyChain reports the first bad event — regression 1 › task 5.2: a head below the walked tip is reported as a hash failure instead of passing | covered | src.audit.verify.tip.test.ts::C-c8eb7dcb C-42e60f96 a head below the walked tip passes on an intact chain (passed, red_assertion) | - | 0.91 |
| C-b0a901b0 | audit › verifyChain reports the first bad event — regression 1 › task 5.1: a stored row that canonicalEvent cannot hash makes verifyChain throw instead of reporti... | covered | src.audit.verify.unhashable.test.ts::C-b0a901b0 C-c89bbac6 a row canonicalEvent cannot hash is a hash failure at its seq (passed, red_assertion) | - | 0.88 |
| C-c89bbac6 | audit › task 5.1 is ticked as already satisfied, but its text is not done — finding F-1abb4766 › task 5.1 is ticked as already satisfied, but its text is not done | covered | src.audit.verify.unhashable.test.ts::C-b0a901b0 C-c89bbac6 a row canonicalEvent cannot hash is a hash failure at its seq (passed, red_assertion) | - | 0.86 |
| C-42e60f96 | audit › task 5.2 is ticked as already satisfied, but its text is not done — finding F-2a235267 › task 5.2 is ticked as already satisfied, but its text is not done | covered | src.audit.verify.tip.test.ts::C-c8eb7dcb C-42e60f96 a head below the walked tip passes on an intact chain (passed, red_assertion) | - | 0.87 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-audit-chain-fix-1/.l4/fix.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain-fix-1/.openspec.yaml` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain-fix-1/proposal.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain-fix-1/specs/audit/spec.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain-fix-1/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain/.l4/evidence/round-1/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain/.l4/evidence/round-1/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain/.l4/evidence/round-1/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain/.l4/evidence/round-2/evidence.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain/.l4/evidence/round-2/verdict.json` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain/.l4/evidence/round-2/verification.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain/.l4/ledger/r-20261027T1359Z-b357.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain/.l4/ledger/r-20261027T1517Z-7f3e.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain/.l4/ledger/r-20261027T1554Z-788e.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain/.l4/ledger/r-20261027T1942Z-f5dd.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain/.l4/ledger/r-20261027T1951Z-f3c5.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain/tasks.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain/verification.md` |  | none | exempt: harness, spec or documentation path |
| `src/audit/anchor.test.ts` |  | relevant | new test file |
| `src/audit/anchor.ts` | audit | relevant | named in the spec |
| `src/audit/append.test.ts` |  | relevant | new test file |
| `src/audit/append.ts` | audit | relevant | named in the spec |
| `src/audit/canonical.test.ts` |  | relevant | new test file |
| `src/audit/canonical.ts` | audit | relevant | named in the spec |
| `src/audit/committed.test.ts` |  | relevant | new test file |
| `src/audit/errors.ts` | audit | relevant | named in the spec |
| `src/audit/event.test.ts` |  | relevant | new test file |
| `src/audit/event.ts` | audit | relevant | named in the spec |
| `src/audit/hash.test.ts` |  | relevant | new test file |
| `src/audit/hash.ts` | audit | relevant | named in the spec |
| `src/audit/mac.test.ts` |  | relevant | new test file |
| `src/audit/mac.ts` | audit | relevant | named in the spec |
| `src/audit/property.test.ts` |  | relevant | new test file |
| `src/audit/schema.test.ts` |  | relevant | new test file |
| `src/audit/verify.anchor.test.ts` |  | relevant | new test file |
| `src/audit/verify.test.ts` |  | relevant | new test file |
| `src/audit/verify.tip.test.ts` |  | relevant | new test file |
| `src/audit/verify.ts` | audit | relevant | named in the spec |
| `src/audit/verify.unhashable.test.ts` |  | relevant | new test file |
| `src/db/migrations/0080_audit.sql` | db | relevant | named in the spec |
| `src/db/prepare.test.ts` |  | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/audit/anchor.ts, src/audit/append.ts, src/audit/canonical.ts, src/audit/errors.ts, src/audit/event.ts and 3 more

### Tests

561 of 561 passed, 0 failed, 0 errored, 0 skipped.
65 of 65 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-3266a83e | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b6ba3144 | ok | 0.850 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cbcb0ebb | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c65f6066 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-471c7ac3 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f2814e48 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a4f784d0 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-025c6804 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ad561f69 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f5d19d53 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-604e6b16 | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-65370859 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d5cc8dfe | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c6c268de | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ae0a41bf | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2213b533 | ok | 0.740 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-889bdc82 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6cf5f236 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-90861dd2 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fb4bbd56 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d5bb5978 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-bdc0da1a | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-707dcf8b | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9dc2dff3 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1651bb74 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-23b4c80c | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9a188adc | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2437f60b | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-97d0b64b | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c8eb7dcb | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b0a901b0 | ok | 0.880 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c89bbac6 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-42e60f96 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Criteria

| Id | Criterion | Judge | Result | Reason |
|---|---|---|---|---|
| C-3266a83e | audit › One canonicalization function › RFC 8785 vectors | pass | pass | the judge passed it and a discriminating test passes |
| C-b6ba3144 | audit › One canonicalization function › Refused values | pass | pass | the judge passed it and a discriminating test passes |
| C-cbcb0ebb | audit › The chain hash covers the whole event › Known answers | pass | pass | the judge passed it and a discriminating test passes |
| C-c65f6066 | audit › The chain hash covers the whole event › Bad hash inputs and formatAt | pass | pass | the judge passed it and a discriminating test passes |
| C-471c7ac3 | audit › Events are validated before any SQL › Accepted inputs | pass | pass | the judge passed it and a discriminating test passes |
| C-f2814e48 | audit › Events are validated before any SQL › Refused shapes | pass | pass | the judge passed it and a discriminating test passes |
| C-a4f784d0 | audit › Events are validated before any SQL › Secret-like keys | pass | pass | the judge passed it and a discriminating test passes |
| C-025c6804 | audit › The audit tables are append-only and closed to the app role › Objects, grants and catalog | pass | pass | the judge passed it and a discriminating test passes |
| C-ad561f69 | audit › The audit tables are append-only and closed to the app role › Nobody can change or remove | pass | pass | the judge passed it and a discriminating test passes |
| C-f5d19d53 | audit › The audit tables are append-only and closed to the app role › An event must match the head | pass | pass | the judge passed it and a discriminating test passes |
| C-604e6b16 | audit › Appending is gapless inside the caller's transaction › First and second event | pass | pass | the judge passed it and a discriminating test passes |
| C-65370859 | audit › Appending is gapless inside the caller's transaction › One clock read per append | pass | pass | the judge passed it and a discriminating test passes |
| C-d5cc8dfe | audit › Appending is gapless inside the caller's transaction › Rollback leaves no gap | pass | pass | the judge passed it and a discriminating test passes |
| C-c6c268de | audit › Appending is gapless inside the caller's transaction › Wrong or missing tenant context | pass | pass | the judge passed it and a discriminating test passes |
| C-ae0a41bf | audit › Appending is gapless inside the caller's transaction › An invalid event writes nothing | pass | pass | the judge passed it and a discriminating test passes |
| C-2213b533 | audit › Appending is gapless inside the caller's transaction › Month boundary and DEFAULT | pass | pass | the judge passed it and a discriminating test passes |
| C-889bdc82 | audit › A refusal is audited in its own transaction, per tenant › Survives the caller's rollback | pass | pass | the judge passed it and a discriminating test passes |
| C-6cf5f236 | audit › A refusal is audited in its own transaction, per tenant › Twenty parallel appends | pass | pass | the judge passed it and a discriminating test passes |
| C-90861dd2 | audit › A refusal is audited in its own transaction, per tenant › Two tenants | pass | pass | the judge passed it and a discriminating test passes |
| C-fb4bbd56 | audit › verifyChain reports the first bad event › Empty and valid chains | pass | pass | the judge passed it and a discriminating test passes |
| C-d5bb5978 | audit › verifyChain reports the first bad event › A changed field | pass | pass | the judge passed it and a discriminating test passes |
| C-bdc0da1a | audit › verifyChain reports the first bad event › Missing and duplicate events | pass | pass | the judge passed it and a discriminating test passes |
| C-707dcf8b | audit › verifyChain reports the first bad event › The tip and part-way verification | pass | pass | the judge passed it and a discriminating test passes |
| C-9dc2dff3 | audit › Writer and verifier agree on random events › Round trip of seeded random JSON | pass | pass | the judge passed it and a discriminating test passes |
| C-1651bb74 | audit › Writer and verifier agree on random events › Any single change is detected | pass | pass | the judge passed it and a discriminating test passes; its evidence was split over parts 1 and 2 of the diff: follow-up call 1 judged its 3 files of those parts together and answered pass |
| C-23b4c80c | audit › Anchors sign the chain head › Known answer and idempotence | pass | pass | the judge passed it and a discriminating test passes |
| C-9a188adc | audit › Anchors sign the chain head › Refusals | pass | pass | the judge passed it and a discriminating test passes |
| C-2437f60b | audit › verifyChain checks anchors when given the key › Good anchors and a wrong key | pass | pass | the judge passed it and a discriminating test passes |
| C-97d0b64b | audit › verifyChain checks anchors when given the key › Tampered anchors and a short chain | pass | pass | the judge passed it and a discriminating test passes |
| C-c8eb7dcb | audit › verifyChain reports the first bad event — regression 1 › task 5.2: a head below the walked tip is reported as a hash failure instead of passing | pass | pass | the judge passed it and a discriminating test passes |
| C-b0a901b0 | audit › verifyChain reports the first bad event — regression 1 › task 5.1: a stored row that canonicalEvent cannot hash makes verifyChain throw instead of reporti... | pass | pass | the judge passed it and a discriminating test passes |
| C-c89bbac6 | audit › task 5.1 is ticked as already satisfied, but its text is not done — finding F-1abb4766 › task 5.1 is ticked as already satisfied, but its text is not done | pass | pass | the judge passed it and a discriminating test passes |
| C-42e60f96 | audit › task 5.2 is ticked as already satisfied, but its text is not done — finding F-2a235267 › task 5.2 is ticked as already satisfied, but its text is not done | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, judge] wrapStoreError wraps any five-letter Node error code such as EPIPE as a SQLSTATE (spec gap) (criterion C-c6c268de): wrapStoreError treats any code matching /^[0-9A-Z]{5}$/ as a SQLSTATE. A lost connection reported as EPIPE (5 letters) therefore becomes AUDIT_STORE_FAILED, while ECONNRESET propagates unchanged. design.md says a lost connection propagates unchanged. No scenario pins this case, and implementations that check for a pg DatabaseError would behave differently.
- [minor, judge] canonicalize silently drops symbol-keyed properties (spec gap) (criterion C-b6ba3144): Keys come from Object.keys, so an object with a symbol-keyed property is written without that property and no error is raised. Another implementation could refuse it with not_plain_object or symbol.
- [minor, judge] The actor.id length limit counts UTF-16 code units, not characters (spec gap) (criterion C-f2814e48): isIdentifier checks value.length <= 200, so an id of 101 emoji (202 code units) is refused even though it has 101 characters. design.md says '1 to 200 well-formed characters', which is ambiguous on this point.
- [minor, judge] verifyChain swallows every exception thrown by chainHash: src/audit/verify.ts wraps chainHash in a bare `catch { computed = null; }`. Any error, including a non-AuditError programming fault, is turned into a `hash` report instead of being surfaced. The fix asked only for AuditError throws from canonicalEvent/chainHash.
- [minor, judge] verifyChain refuses an invalid engineKey before any query, unpinned by any scenario (spec gap) (criterion C-2437f60b): verifyChain calls anchorMac with a dummy seq and hash to validate the key before withTenantTx. Another implementation could check the key lazily, only when anchors exist.
- [minor, judge] Head check is skipped when fromSeq is above the head's seq (spec gap) (criterion C-707dcf8b): The head is compared only when headSeq >= fromSeq. On a chain of 7 with event 7 deleted, the head is 7 and verifyChain with fromSeq 8n walks nothing and returns ok. Task 5.2's wording (compare against tipSeq = expected - 1) could instead report a hash failure at 7.
- [minor, judge] Missing row fromSeq-1 makes the walk trust the first walked row's prev_hash (spec gap) (criterion C-707dcf8b): When fromSeq > 1 and no event at fromSeq - 1 exists, prev is null and the first walked row's own prev_hash is accepted. No scenario pins this case.
- [minor, judge] Seeded property test may not exercise every change kind (criterion C-1651bb74): property.test.ts picks one of the eight CHANGES entries per chain with a fixed-seed RNG, over 12 chains. Nothing asserts that every kind (for example the target.id change) was drawn at least once, so a kind may go untested. verify.test.ts covers seven kinds at seq 4 but not target.id.
- [minor, judge] the judge called a test inadequate (criterion C-d5bb5978): src.audit.verify.unhashable.test.ts::C-d5bb5978 an unhashable first row reports checked 0 at seq 1

## New tests (red then green, `task.red_ok` in the ledger)

- `src.audit.anchor.test.ts::C-23b4c80c anchorHead signs the head and repeats idempotently` (task 6.1): passed
- `src.audit.anchor.test.ts::C-9a188adc anchorHead refuses a head that differs from the last event` (task 6.1): passed
- `src.audit.anchor.test.ts::C-9a188adc anchorHead refuses an empty chain and stores nothing` (task 6.1): passed
- `src.audit.anchor.test.ts::C-9a188adc anchorHead refuses another key at an anchored seq` (task 6.1): passed
- `src.audit.anchor.test.ts::C-9a188adc anchorHead refuses bad keys` (task 6.1): passed
- `src.audit.append.test.ts::C-2213b533 events land in the monthly partition or the default one` (task 4.1): passed
- `src.audit.append.test.ts::C-604e6b16 the first and second event chain from the genesis hash` (task 4.1): passed
- `src.audit.append.test.ts::C-65370859 the clock is read once per append and the chain verifies` (task 4.1): passed
- `src.audit.append.test.ts::C-ae0a41bf an invalid event writes nothing` (task 4.1): passed
- `src.audit.append.test.ts::C-c6c268de a context that differs from the transaction is refused` (task 4.1): passed
- `src.audit.append.test.ts::C-c6c268de a transaction without a tenant is refused` (task 4.1): passed
- `src.audit.append.test.ts::C-c6c268de an unknown tenant and driver errors become store errors` (task 4.1): passed
- `src.audit.append.test.ts::C-d5cc8dfe a rollback leaves no gap in the sequence` (task 4.1): passed
- `src.audit.canonical.test.ts::C-3266a83e canonicalize sorts keys by code unit and writes safe bigints as numbers` (task 1.1): passed
- `src.audit.canonical.test.ts::C-3266a83e canonicalize writes the RFC 8785 section 3.2.4 document` (task 1.1): passed
- `src.audit.canonical.test.ts::C-b6ba3144 canonicalize accepts 64 nested arrays` (task 1.1): passed
- `src.audit.canonical.test.ts::C-b6ba3144 canonicalize refuses values it cannot write exactly` (task 1.1): passed
- `src.audit.committed.test.ts::C-6cf5f236 twenty parallel appends give seq 1 to 20 on one chain` (task 4.2): passed
- `src.audit.committed.test.ts::C-889bdc82 an event appended in its own transaction survives the caller's rollback` (task 4.2): passed
- `src.audit.committed.test.ts::C-90861dd2 each tenant has its own chain and a bad event stores nothing` (task 4.2): passed
- `src.audit.event.test.ts::C-471c7ac3 validateEvent carries mintkey trace fields through` (task 2.1): passed
- `src.audit.event.test.ts::C-471c7ac3 validateEvent fills defaults for a minimal accepted input` (task 2.1): passed
- `src.audit.event.test.ts::C-a4f784d0 isSecretKeyName recognises only secret-like names` (task 2.1): passed
- `src.audit.event.test.ts::C-a4f784d0 validateEvent ignores secret-shaped values` (task 2.1): passed
- `src.audit.event.test.ts::C-a4f784d0 validateEvent refuses secret-like payload keys at any depth` (task 2.1): passed
- `src.audit.event.test.ts::C-f2814e48 validateEvent accepts a payload of exactly 32768 canonical bytes` (task 2.1): passed
- `src.audit.event.test.ts::C-f2814e48 validateEvent passes canonicalization failures through` (task 2.1): passed
- `src.audit.event.test.ts::C-f2814e48 validateEvent refuses malformed shapes with a reason` (task 2.1): passed
- `src.audit.hash.test.ts::C-c65f6066 chainHash refuses a prevHash that is not 32 bytes` (task 1.2): passed
- `src.audit.hash.test.ts::C-c65f6066 chainHash refuses an at without six fraction digits` (task 1.2): passed
- `src.audit.hash.test.ts::C-c65f6066 formatAt refuses an invalid date and a date in 1969` (task 1.2): passed
- `src.audit.hash.test.ts::C-c65f6066 formatAt writes the instant with six fraction digits` (task 1.2): passed
- `src.audit.hash.test.ts::C-cbcb0ebb canonicalEvent writes the whole event in RFC 8785 order` (task 1.2): passed
- `src.audit.hash.test.ts::C-cbcb0ebb chainHash hashes prevHash and the canonical event` (task 1.2): passed
- `src.audit.mac.test.ts::C-23b4c80c anchorMac depends on the tenant` (task 6.1): passed
- `src.audit.mac.test.ts::C-23b4c80c anchorMac matches the known answer` (task 6.1): passed
- `src.audit.mac.test.ts::C-9a188adc anchorMac refuses a bad hash and a bad seq` (task 6.1): passed
- `src.audit.mac.test.ts::C-9a188adc anchorMac refuses short and unreadable keys` (task 6.1): passed
- `src.audit.property.test.ts::C-1651bb74 any single change to a random chain is a hash failure at that event` (task 5.1): passed
- `src.audit.property.test.ts::C-9dc2dff3 random JSON round trips and random chains verify` (task 5.1): passed
- `src.audit.schema.test.ts::C-025c6804 migration 0080 creates the audit tables with the grants of the design` (task 3.1): passed
- `src.audit.schema.test.ts::C-ad561f69 nobody can change or remove an audit row` (task 3.1): passed
- `src.audit.schema.test.ts::C-f5d19d53 an event must match the chain head` (task 3.1): passed
- `src.audit.verify.anchor.test.ts::C-2437f60b good anchors verify with the key and a wrong key is an anchor failure` (task 6.2): passed
- `src.audit.verify.anchor.test.ts::C-97d0b64b a changed anchor hash with a recomputed mac is an anchor failure` (task 6.2): passed
- `src.audit.verify.anchor.test.ts::C-97d0b64b a changed anchor mac is an anchor failure` (task 6.2): passed
- `src.audit.verify.anchor.test.ts::C-97d0b64b an anchor past a shortened chain is an anchor failure` (task 6.2): passed
- `src.audit.verify.test.ts::C-bdc0da1a a deleted first event is a gap at seq 1` (task 5.1): passed
- `src.audit.verify.test.ts::C-bdc0da1a a deleted middle event is a gap at its seq` (task 5.1): passed
- `src.audit.verify.test.ts::C-bdc0da1a a repeated seq is a gap at the next expected seq` (task 5.1): passed
