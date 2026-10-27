# Verification: openspec:add-audit-chain: FAIL (round 2)

traceability: 29/29 criteria covered by a discriminating test

- Base: `674213c8e6eef65013b8eb692187722af8b42e27`
- Head: `9c1841636aba5204ae28de9cc6190b312e980c79`
- Implementer profiles: deepseek, claude-sonnet
- Judge: claude-judge (claude-opus-5-5), 3 call(s), judged in 2 parts and 1 follow-up, prompt sha256 `31235dbbc8ed793b7673e47f469119a599e9410ef1de652a17c09c36ea8e29d4`
  - part 1: 20 file(s), 114898 characters, profile claude-judge, reply valid
  - part 2: 3 file(s), 17542 characters, profile claude-judge, reply valid
  - follow-up 1: C-9dc2dff3; files of parts 1 and 2: 5 file(s), 25658 characters, profile claude-judge, reply valid
- Judge replies of claude-judge (this unit, all rounds): valid 3, repaired 0, retried 0, discarded 0; this round: valid
- independence: declared (unverified): claude-judge anthropic (served claude-opus-5-5), deepseek deepseek (declared), claude-sonnet anthropic (tool)
- Cost: $2.7013

## Ladder

| Step | Name | Status | Seconds | Note |
|---|---|---|---|---|
| 0 | preconditions | reused | 0.0 | reused (round 1) |
| 1 | integrity | reused | 0.0 | reused (round 1) |
| 2 | build | reused | 0.0 | reused (round 1) |
| 3 | tests | reused | 0.0 | reused (round 1) |
| 4 | traceability | reused | 0.0 | reused (round 1) |
| 4a | audit sampling | not_run | 0.0 | audit sampling writes pytest tests only; changed code is not python |
| 5 | ui test generation | not_run | 0.0 | the unit changed no file under verifier.playwright.ui_paths |
| 6 | quality | reused | 0.0 | reused (round 1) |
| 8 | s1 judge | reused | 0.0 | reused (round 1) |
| 9 | judge | reused | 0.0 | reused (round 1) |
| 10 | aggregation | ok | 0.0 | FAIL |

## Gates

| Gate | Status | Command | Log |
|---|---|---|---|
| setup | pass | `pnpm install --frozen-lockfile` | .l4-out/gates/r-20261027T1942Z-f5dd/004-setup.log |
| setup | pass | `uv sync --project e2e --frozen` | .l4-out/gates/r-20261027T1942Z-f5dd/005-setup.log |
| build | pass | `pnpm run build` | .l4-out/gates/r-20261027T1942Z-f5dd/006-build.log |
| lint | pass | `pnpm run lint` | .l4-out/gates/r-20261027T1942Z-f5dd/007-lint.log |
| typecheck | pass | `pnpm run typecheck` | .l4-out/gates/r-20261027T1942Z-f5dd/008-typecheck.log |
| test | pass | `pnpm run test` | .l4-out/gates/r-20261027T1942Z-f5dd/009-test.log |
| e2e | pass | `e2e/.venv/bin/python -m pytest e2e --junitxml=.l4-out/e2e-junit.xml --tracing retain-on-failure --screenshot only-on-failure` | .l4-out/gates/r-20261027T1942Z-f5dd/010-e2e.log |

## Files by part

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
- part 1: src/audit/schema.test.ts (10869 characters)
- part 1: openspec/changes/add-audit-chain/tasks.md (28015 characters)
- part 1: src/audit/verify.anchor.test.ts (6616 characters)
- part 2: src/audit/verify.test.ts (6693 characters)
- part 2: src/audit/verify.tip.test.ts (4516 characters)
- part 2: src/audit/verify.ts (6333 characters)

## Integrity

| Check | Status | Note |
|---|---|---|
| protected paths | ok | no protected path differs from the base |
| pre-existing tests | skipped | no Python test file changed; 1 other test file(s) are checked by the run of pre-existing tests |
| red-green freeze | ok | 7 task(s): red and green compared |
| test path freeze | ok | 7 harness step commit(s) checked |
| content scan | ok | no result-manipulating construct in the changed support and runner files |
| gate configuration | skipped | no gate or runner configuration file changed |
| test awareness | ok | no production line reacts to the test run |
| suppressions | skipped | not checked: python only; changed files outside it: src/audit/anchor.test.ts, src/audit/anchor.ts, src/audit/append.test.ts, src/audit/append.ts, src/audit/canonical.test.ts (+16 more) |
| tdd history | ok | 10 task(s); red tests passing at head: step 3 |
| pre-existing tests still pass | ok | 470 of 470 base tests pass on the unit's code with its 12 test and support files at the base (base: not needed) |

## Pre-existing tests changed with an allowance (L4-VER-031)

- src/db/prepare.test.ts kept at head for the run (task 3.1: unfrozen by Q-001)

## Traceability

| Id | Criterion | State | Tests (status, proof) | Not evidence | S1 p |
|---|---|---|---|---|---|
| C-3266a83e | audit › One canonicalization function › RFC 8785 vectors | covered | src.audit.canonical.test.ts::C-3266a83e canonicalize sorts keys by code unit and writes safe bigints as numbers (passed, red_assertion); src.audit.canonical.test.ts::C-3266a83e canonicalize writes the RFC 8785 section 3.2.4 document (passed, red_assertion) | - | 0.94 |
| C-b6ba3144 | audit › One canonicalization function › Refused values | covered | src.audit.canonical.test.ts::C-b6ba3144 canonicalize accepts 64 nested arrays (passed, red_assertion); src.audit.canonical.test.ts::C-b6ba3144 canonicalize refuses values it cannot write exactly (passed, red_assertion) | - | 0.86 |
| C-cbcb0ebb | audit › The chain hash covers the whole event › Known answers | covered | src.audit.hash.test.ts::C-cbcb0ebb canonicalEvent writes the whole event in RFC 8785 order (passed, red_assertion); src.audit.hash.test.ts::C-cbcb0ebb chainHash hashes prevHash and the canonical event (passed, red_assertion) | - | 0.94 |
| C-c65f6066 | audit › The chain hash covers the whole event › Bad hash inputs and formatAt | covered | src.audit.hash.test.ts::C-c65f6066 chainHash refuses a prevHash that is not 32 bytes (passed, red_assertion); src.audit.hash.test.ts::C-c65f6066 chainHash refuses an at without six fraction digits (passed, red_assertion); src.audit.hash.test.ts::C-c65f6066 formatAt refuses an invalid date and a date... | - | 0.89 |
| C-471c7ac3 | audit › Events are validated before any SQL › Accepted inputs | covered | src.audit.event.test.ts::C-471c7ac3 validateEvent carries mintkey trace fields through (passed, red_assertion); src.audit.event.test.ts::C-471c7ac3 validateEvent fills defaults for a minimal accepted input (passed, red_assertion) | - | 0.93 |
| C-f2814e48 | audit › Events are validated before any SQL › Refused shapes | covered | src.audit.event.test.ts::C-f2814e48 validateEvent accepts a payload of exactly 32768 canonical bytes (passed, red_assertion); src.audit.event.test.ts::C-f2814e48 validateEvent passes canonicalization failures through (passed, red_assertion); src.audit.event.test.ts::C-f2814e48 validateEvent refuses ... | - | 0.92 |
| C-a4f784d0 | audit › Events are validated before any SQL › Secret-like keys | covered | src.audit.event.test.ts::C-a4f784d0 isSecretKeyName recognises only secret-like names (passed, red_assertion); src.audit.event.test.ts::C-a4f784d0 validateEvent ignores secret-shaped values (passed, red_assertion); src.audit.event.test.ts::C-a4f784d0 validateEvent refuses secret-like payload keys at... | - | 0.87 |
| C-025c6804 | audit › The audit tables are append-only and closed to the app role › Objects, grants and catalog | covered | src.audit.schema.test.ts::C-025c6804 migration 0080 creates the audit tables with the grants of the design (passed, red_assertion) | - | 0.89 |
| C-ad561f69 | audit › The audit tables are append-only and closed to the app role › Nobody can change or remove | covered | src.audit.schema.test.ts::C-ad561f69 nobody can change or remove an audit row (passed, red_assertion) | - | 0.94 |
| C-f5d19d53 | audit › The audit tables are append-only and closed to the app role › An event must match the head | covered | src.audit.schema.test.ts::C-f5d19d53 an event must match the chain head (passed, red_assertion) | - | 0.90 |
| C-604e6b16 | audit › Appending is gapless inside the caller's transaction › First and second event | covered | src.audit.append.test.ts::C-604e6b16 the first and second event chain from the genesis hash (passed, red_assertion) | - | 0.90 |
| C-65370859 | audit › Appending is gapless inside the caller's transaction › One clock read per append | covered | src.audit.append.test.ts::C-65370859 the clock is read once per append and the chain verifies (passed, red_assertion) | - | 0.92 |
| C-d5cc8dfe | audit › Appending is gapless inside the caller's transaction › Rollback leaves no gap | covered | src.audit.append.test.ts::C-d5cc8dfe a rollback leaves no gap in the sequence (passed, red_assertion) | - | 0.91 |
| C-c6c268de | audit › Appending is gapless inside the caller's transaction › Wrong or missing tenant context | covered | src.audit.append.test.ts::C-c6c268de a context that differs from the transaction is refused (passed, red_assertion); src.audit.append.test.ts::C-c6c268de a transaction without a tenant is refused (passed, red_assertion); src.audit.append.test.ts::C-c6c268de an unknown tenant and driver errors become... | - | 0.92 |
| C-ae0a41bf | audit › Appending is gapless inside the caller's transaction › An invalid event writes nothing | covered | src.audit.append.test.ts::C-ae0a41bf an invalid event writes nothing (passed, red_assertion) | - | 0.93 |
| C-2213b533 | audit › Appending is gapless inside the caller's transaction › Month boundary and DEFAULT | covered | src.audit.append.test.ts::C-2213b533 events land in the monthly partition or the default one (passed, red_assertion) | - | 0.71 |
| C-889bdc82 | audit › A refusal is audited in its own transaction, per tenant › Survives the caller's rollback | covered | src.audit.committed.test.ts::C-889bdc82 an event appended in its own transaction survives the caller's rollback (passed, pre_satisfied) | - | 0.87 |
| C-6cf5f236 | audit › A refusal is audited in its own transaction, per tenant › Twenty parallel appends | covered | src.audit.committed.test.ts::C-6cf5f236 twenty parallel appends give seq 1 to 20 on one chain (passed, pre_satisfied) | - | 0.94 |
| C-90861dd2 | audit › A refusal is audited in its own transaction, per tenant › Two tenants | covered | src.audit.committed.test.ts::C-90861dd2 each tenant has its own chain and a bad event stores nothing (passed, pre_satisfied) | - | 0.93 |
| C-fb4bbd56 | audit › verifyChain reports the first bad event › Empty and valid chains | covered | src.audit.verify.test.ts::C-fb4bbd56 empty and valid chains verify and bad options are refused (passed, pre_satisfied) | - | 0.93 |
| C-d5bb5978 | audit › verifyChain reports the first bad event › A changed field | covered | src.audit.verify.test.ts::C-d5bb5978 a changed a payload leaf at seq 4 is a hash failure (passed, pre_satisfied); src.audit.verify.test.ts::C-d5bb5978 a changed at by one microsecond at seq 4 is a hash failure (passed, pre_satisfied); src.audit.verify.test.ts::C-d5bb5978 a changed event_type at seq ... | - | 0.93 |
| C-bdc0da1a | audit › verifyChain reports the first bad event › Missing and duplicate events | covered | src.audit.verify.test.ts::C-bdc0da1a a deleted first event is a gap at seq 1 (passed, pre_satisfied); src.audit.verify.test.ts::C-bdc0da1a a deleted middle event is a gap at its seq (passed, pre_satisfied); src.audit.verify.test.ts::C-bdc0da1a a repeated seq is a gap at the next expected seq (passed... | - | 0.92 |
| C-707dcf8b | audit › verifyChain reports the first bad event › The tip and part-way verification | covered | src.audit.verify.tip.test.ts::C-707dcf8b a changed head hash is a hash failure at the tip (passed, pre_satisfied); src.audit.verify.tip.test.ts::C-707dcf8b a deleted tail event with the head kept is a gap at the head seq (passed, pre_satisfied); src.audit.verify.tip.test.ts::C-707dcf8b part-way veri... | - | 0.86 |
| C-9dc2dff3 | audit › Writer and verifier agree on random events › Round trip of seeded random JSON | covered | src.audit.property.test.ts::C-9dc2dff3 random JSON round trips and random chains verify (passed, pre_satisfied) | - | 0.93 |
| C-1651bb74 | audit › Writer and verifier agree on random events › Any single change is detected | covered | src.audit.property.test.ts::C-1651bb74 any single change to a random chain is a hash failure at that event (passed, pre_satisfied) | - | 0.93 |
| C-23b4c80c | audit › Anchors sign the chain head › Known answer and idempotence | covered | src.audit.anchor.test.ts::C-23b4c80c anchorHead signs the head and repeats idempotently (passed, red_assertion); src.audit.mac.test.ts::C-23b4c80c anchorMac depends on the tenant (passed, red_assertion); src.audit.mac.test.ts::C-23b4c80c anchorMac matches the known answer (passed, red_assertion) | - | 0.91 |
| C-9a188adc | audit › Anchors sign the chain head › Refusals | covered | src.audit.anchor.test.ts::C-9a188adc anchorHead refuses a head that differs from the last event (passed, red_assertion); src.audit.anchor.test.ts::C-9a188adc anchorHead refuses an empty chain and stores nothing (passed, red_assertion); src.audit.anchor.test.ts::C-9a188adc anchorHead refuses another ... | - | 0.92 |
| C-2437f60b | audit › verifyChain checks anchors when given the key › Good anchors and a wrong key | covered | src.audit.verify.anchor.test.ts::C-2437f60b good anchors verify with the key and a wrong key is an anchor failure (passed, red_assertion) | - | 0.94 |
| C-97d0b64b | audit › verifyChain checks anchors when given the key › Tampered anchors and a short chain | covered | src.audit.verify.anchor.test.ts::C-97d0b64b a changed anchor hash with a recomputed mac is an anchor failure (passed, red_assertion); src.audit.verify.anchor.test.ts::C-97d0b64b a changed anchor mac is an anchor failure (passed, red_assertion); src.audit.verify.anchor.test.ts::C-97d0b64b an anchor p... | - | 0.94 |

## Evidence

### Needs attention

Nothing needs attention.

### Files

| Path | Module | Label | Why |
|---|---|---|---|
| `openspec/changes/add-audit-chain/.l4/ledger/r-20261027T1359Z-b357.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain/.l4/ledger/r-20261027T1517Z-7f3e.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain/.l4/ledger/r-20261027T1554Z-788e.jsonl` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain/questions.md` |  | none | exempt: harness, spec or documentation path |
| `openspec/changes/add-audit-chain/tasks.md` |  | none | exempt: harness, spec or documentation path |
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
| `src/db/migrations/0080_audit.sql` | db | relevant | named in the spec |
| `src/db/prepare.test.ts` |  | relevant | named in the spec |

### Changed functions

Diff coverage not measured: diff coverage measures python only; changed code outside it: src/audit/anchor.ts, src/audit/append.ts, src/audit/canonical.ts, src/audit/errors.ts, src/audit/event.ts and 3 more

### Tests

557 of 557 passed, 0 failed, 0 errored, 0 skipped.
61 of 61 new tests passed.

## S1 (recorded for calibration, never decides)

| Criterion | Status | p | Model | Engine | Note |
|---|---|---|---|---|---|
| C-3266a83e | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-b6ba3144 | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-cbcb0ebb | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c65f6066 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-471c7ac3 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f2814e48 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-a4f784d0 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-025c6804 | ok | 0.890 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ad561f69 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-f5d19d53 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-604e6b16 | ok | 0.900 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-65370859 | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d5cc8dfe | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-c6c268de | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-ae0a41bf | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2213b533 | ok | 0.710 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-889bdc82 | ok | 0.870 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-6cf5f236 | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-90861dd2 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-fb4bbd56 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-d5bb5978 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-bdc0da1a | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-707dcf8b | ok | 0.860 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9dc2dff3 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-1651bb74 | ok | 0.930 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-23b4c80c | ok | 0.910 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-9a188adc | ok | 0.920 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-2437f60b | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |
| C-97d0b64b | ok | 0.940 | jev-1.13.0 | jev | evidence cut to fit the budget |

## Answers to verdict questions

- Q-002 reject F-0447fea8 by the delegate (claude-fable-5-1 via claude-code): The finding is correct. Task 5.2 says a head whose seq is below the walked tip passes, and design.md says the head is read before the walk so that appends during a verification are not tail loss. In verify.ts the head check only guards headSeq >= fromSeq and headSeq >= expected; for any head seq bet...
- Q-003 reject F-934c3d86 by the delegate (claude-fable-5-1 via claude-code): The finding is correct. Task 5.1 says that chainHash not equal to the stored hash, or canonicalEvent throwing, gives reason hash, and the spec's requirement says verifyChain returns ok false with reason hash or gap whenever a stored row's hash does not equal chainHash of that row. In verify.ts the w...
- Q-004 reject F-1abb4766 by the delegate (claude-fable-5-1 via claude-code): The finding is correct. Task 5.1 of tasks.md says that chainHash not equal to the stored hash, or canonicalEvent throwing, gives reason hash, and the specification's requirement says verifyChain returns ok false with reason hash or gap whenever a stored row's hash does not equal chainHash of the sto...
- Q-005 reject F-2a235267 by the delegate (claude-fable-5-1 via claude-code): The finding is correct. Task 5.2 says that after the walk a head whose seq is below tipSeq passes, and design.md says the head is read before the walk so that appends during a verification are not tail loss. In src/audit/verify.ts the head check only separates the case headSeq at or above expected, ...

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
| C-9dc2dff3 | audit › Writer and verifier agree on random events › Round trip of seeded random JSON | pass | pass | the judge passed it and a discriminating test passes; its evidence was split over parts 1 and 2 of the diff: follow-up call 1 judged its 5 files of those parts together and answered pass |
| C-1651bb74 | audit › Writer and verifier agree on random events › Any single change is detected | pass | pass | the judge passed it and a discriminating test passes |
| C-23b4c80c | audit › Anchors sign the chain head › Known answer and idempotence | pass | pass | the judge passed it and a discriminating test passes |
| C-9a188adc | audit › Anchors sign the chain head › Refusals | pass | pass | the judge passed it and a discriminating test passes |
| C-2437f60b | audit › verifyChain checks anchors when given the key › Good anchors and a wrong key | pass | pass | the judge passed it and a discriminating test passes |
| C-97d0b64b | audit › verifyChain checks anchors when given the key › Tampered anchors and a short chain | pass | pass | the judge passed it and a discriminating test passes |

## Findings

- [minor, judge] Secret-key depth is the first hit in sorted key order, not the shallowest (spec gap) (criterion C-a4f784d0): secretDepth walks the parsed canonical payload depth-first in sorted key order and returns the first hit. For {a:{password:1}, password:1} it reports depth 2, although a depth-1 secret key exists. The spec does not pin down which depth to report when there are several hits.
- [minor, judge] Size check runs before the secret-key scan (spec gap) (criterion C-f2814e48): A payload over 32,768 canonical bytes that also holds a secret-named key is refused with AUDIT_EVENT_INVALID payload_too_large, not AUDIT_PAYLOAD_SECRET. No scenario fixes this precedence.
- [minor, judge] An unknown property takes precedence over a bad eventType (spec gap) (criterion C-f2814e48): validateEvent checks for unknown keys before eventType, so an input with both an extra property and eventType "Flow" gets unknown_property.
- [major, human] task 5.2: a head below the walked tip is reported as a hash failure instead of passing (criterion C-707dcf8b): Task 5.2 says a head whose seq is below the walked tip (tipSeq = expected - 1n) passes. In verify.ts, when headSeq < expected the code goes on to `if (lastHash === null || !lastHash.equals(head.hash)) return { ..., firstBadSeq: headSeq, reason: "hash" }`. lastHash is the tip's hash, not the head's, so a head below the tip always fails. The head is read in a separate statement before the walk. Unless withTenantTx uses a snapshot isolation level, an append committed between the head read and the walk makes an intact chain report a `hash` failure. That contradicts design.md: 'appends during a ver...
- [major, human] task 5.1: a stored row that canonicalEvent cannot hash makes verifyChain throw instead of reporting hash (criterion C-d5bb5978): Task 5.1 says chainHash not matching the stored hash, or canonicalEvent throwing, gives `hash`. verify.ts calls chainHash without a try/catch. An owner edit that canonicalEvent cannot hash makes verifyChain reject with an AuditError instead of returning {ok:false, reason:'hash'}. Two examples: `at` in year 10000, where to_char gives a five-digit year and the six-digit-fraction regex fails; and a payload number beyond the double range, where node-pg parses it as Infinity. [rejected by the delegate (claude-fable-5-1 via claude-code) (The finding is correct. Task 5.1 says that chainHash not equal...
- [minor, judge] Unspecified: head seq below the visible tip (spec gap) (criterion C-707dcf8b): No scenario covers a head whose seq is below the last event the walk sees. That can happen through an owner rewind of the head or a concurrent append. Reasonable implementations differ: pass, or report hash at the head seq.
- [minor, judge] Unspecified: stored event whose fields canonicalEvent refuses (spec gap) (criterion C-d5bb5978): No scenario covers a stored row whose `at` year is above 9999 or whose jsonb number is outside the double range. The committed code throws instead of returning a report.
- [major, human] task 5.1 is ticked as already satisfied, but its text is not done: src/audit/verify.ts implements the walk, gap and hash checks and option validation. However, the task text says canonicalEvent throwing gives `hash`, and the chainHash call is not caught, so it throws instead. property.test.ts is not in this part. [rejected by the delegate (claude-fable-5-1 via claude-code) (The finding is correct. Task 5.1 of tasks.md says that chainHash not equal to the stored hash, or canonicalEvent throwing, gives reason hash, and the specification's requirement says verifyChain returns ok false with reason hash or gap whenever a stored row's hash does not equal chainHash ...
- [major, human] task 5.2 is ticked as already satisfied, but its text is not done: src/audit/verify.ts head check: the task says a head seq below tipSeq passes, but the code reports `hash` at headSeq whenever lastHash differs from head.hash, which is always the case when the head is below the tip. [rejected by the delegate (claude-fable-5-1 via claude-code) (The finding is correct. Task 5.2 says that after the walk a head whose seq is below tipSeq passes, and design.md says the head is read before the walk so that appends during a verification are not tail loss. In src/audit/verify.ts the head check only separates the case headSeq at or above expected, which gives gap; for e...

## Fix unit

Fix unit 1 is created for these tasks:
- F-0447fea8 task 5.2: a head below the walked tip is reported as a hash failure instead of passing
- F-934c3d86 task 5.1: a stored row that canonicalEvent cannot hash makes verifyChain throw instead of reporti...
- F-1abb4766 task 5.1 is ticked as already satisfied, but its text is not done
- F-2a235267 task 5.2 is ticked as already satisfied, but its text is not done

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
