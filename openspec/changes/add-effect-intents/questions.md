# Questions — add-effect-intents

<!-- l4:questions v1
How to answer: write under "### Answer" and set **Status** to `answered`.
To accept the clarifier's suggestion as-is, set **Status** to `accepted`.
Status values: open · answered · accepted · answered-by-clarifier · dismissed · superseded
Kind values: technical · product · ambiguous · verdict · harness. For a `verdict` question, start the answer with `accept` or
`reject`, then give your reason; for a `harness` question, with `accept` or `retry`.
Do not change question IDs. Commit and push to the l4/… branch to resume the run. -->

<!-- l4:index:start -->
| ID | Status | Blocking | Kind | Question |
|----|--------|----------|------|----------|
| Q-001 | answered | 3.2 | harness | Task 3.2: the pre-satisfied check could not decide |
<!-- l4:index:end -->

---

## Q-001: Task 3.2: the pre-satisfied check could not decide

- **Status:** answered
- **Answered by:** the delegate (claude-fable-5-1 via claude-code)
- **Blocking tasks:** 3.2
- **Kind:** harness
- **Asked:** 2026-11-05T03:19Z by deepseek-free, run r-20261105T0203Z-c925, task 3.2
- **Criteria:** C-18338258 (idempotency › An intent moves only forward › Completing and marking unknown)

### Context
L4 could not run the pre-satisfied check of task 3.2, so it does not count the failure against the agent: no attempt was used and no profile was escalated.
Why: the zero-value run varies Python files only, and src/runs/intents/transitions.test.ts is not a Python file; src.runs.intents.transitions.test.ts::C-18338258 completeIntent and markIntentUnknown refuse absent keys and bad input did not run in test-base-run
Runs: test-base-run
Kept real: nothing
Tests: src.runs.intents.transitions.test.ts::C-18338258 completeIntent and markIntentUnknown refuse absent keys and bad input, src.runs.intents.transitions.test.ts::C-18338258 completeIntent stores the result once and keeps a done row unchanged, src.runs.intents.transitions.test.ts::C-18338258 markIntentUnknown parks an intent and completeIntent finishes it

Changes the replay applies (1 files):
    added src/runs/intents/transitions.test.ts

Source of the tests (redacted; at most 40 lines each):
src.runs.intents.transitions.test.ts::C-18338258 completeIntent and markIntentUnknown refuse absent keys and bad input:
    test("C-18338258 completeIntent and markIntentUnknown refuse absent keys and bad input", async () => {
      const db = await withTestDatabase();
      try {
        const { a, b } = await seedTwoTenants(db);
        await createRunStore(db.appPool).createRun(a, NEW_RUN("r_1"), AT);
        await recordVia(db.appPool, a, WRITE(), AT);
        await recordVia(
          db.appPool,
          a,
          WRITE({ idemKey: K3, nodeId: "note", tool: "note.write@1" }),
          AT,
        );
    
        await assert.rejects(
          withTenantTx(db.appPool, a, (tx) => completeIntent(tx, a, K_ABSENT, PAID, AT)),
          intentError("INTENT_NOT_FOUND"),
        );
        await assert.rejects(
          withTenantTx(db.appPool, a, (tx) => markIntentUnknown(tx, a, K_ABSENT, AT)),
          intentError("INTENT_NOT_FOUND"),
        );
    
        await assert.rejects(
          withTenantTx(db.appPool, b, (tx) => completeIntent(tx, b, K1, PAID, AT)),
          intentError("INTENT_NOT_FOUND"),
        );
    
        await assert.rejects(
          withTenantTx(db.appPool, a, (tx) => completeIntent(tx, a, "bad", PAID, AT)),
          intentError("INTENT_INVALID"),
        );
    
        await assert.rejects(
          withTenantTx(db.appPool, a, (tx) =>
            completeIntent(tx, a, K3, { n: undefined } as unknown as PayloadValue, AT),
          ),
          (error: unknown) => {
            assert.ok(error instanceof RunDataError, "invalid result is a RunDataError");
            assert.equal(error.code, "RUN_DATA_INVALID");
            return true;
    [cut: 12 more lines]
src.runs.intents.transitions.test.ts::C-18338258 completeIntent stores the result once and keeps a done row unchanged:
    test("C-18338258 completeIntent stores the result once and keeps a done row unchanged", async () => {
      const db = await withTestDatabase();
      try {
        const { a } = await seedTwoTenants(db);
        await createRunStore(db.appPool).createRun(a, NEW_RUN("r_1"), AT);
        await recordVia(db.appPool, a, WRITE(), AT);
    
        const first = await completeVia(db.appPool, a, a, K1, PAID, AT_PLUS_60);
        const expected: IntentRecord = {
          idemKey: K1,
          runId: "r_1",
          nodeId: "pay",
          tool: "erp.create_payment@1",
          argsDigest: payloadDigest(PAY_ARGS),
          mode: "live",
          state: "done",
          resultRef: payloadDigest(PAID),
          createdAt: "2026-11-02T10:00:00.000000Z",
          completedAt: "2026-11-02T10:01:00.000000Z",
        };
        assert.deepEqual(first, expected);
    
        const second = await completeVia(
          db.appPool,
          a,
          a,
          K1,
          { payment_id: "other" },
          AT_PLUS_120,
        );
        assert.deepEqual(second, first);
    
        const otherDigest = payloadDigest({ payment_id: "other" });
        const otherRows = await withTenantTx(db.ownerPool, a, async (tx) => {
          const { rows } = await tx.query<{ n: string }>(
            "SELECT count(*)::text AS n FROM ursitoare.envelope_payload WHERE tenant_id = $1 AND sha256 = $2",
            [a.tenantId, otherDigest],
          );
          return Number(rows[0]?.n);
        });
    [cut: 15 more lines]
src.runs.intents.transitions.test.ts::C-18338258 markIntentUnknown parks an intent and completeIntent finishes it:
    test("C-18338258 markIntentUnknown parks an intent and completeIntent finishes it", async () => {
      const db = await withTestDatabase();
      try {
        const { a } = await seedTwoTenants(db);
        await createRunStore(db.appPool).createRun(a, NEW_RUN("r_1"), AT);
        await recordVia(
          db.appPool,
          a,
          WRITE({ idemKey: K2, nodeId: "mail", tool: "mail.send@1" }),
          AT,
        );
    
        const unknown: IntentRecord = {
          idemKey: K2,
          runId: "r_1",
          nodeId: "mail",
          tool: "mail.send@1",
          argsDigest: payloadDigest(PAY_ARGS),
          mode: "live",
          state: "unknown",
          resultRef: null,
          createdAt: "2026-11-02T10:00:00.000000Z",
          completedAt: null,
        };
    
        const first = await markVia(db.appPool, a, a, K2, AT_PLUS_180);
        assert.deepEqual(first, unknown);
    
        const second = await markVia(db.appPool, a, a, K2, AT_PLUS_180);
        assert.deepEqual(second, unknown, "an unknown row is answered unchanged");
    
        const done = await completeVia(db.appPool, a, a, K2, PAID, AT_PLUS_240);
        assert.equal(done.state, "done");
        assert.equal(done.resultRef, payloadDigest(PAID));
        assert.equal(done.completedAt, "2026-11-02T10:04:00.000000Z");
      } finally {
        await db.close();
      }
    });

Diff of src/runs/intents/transitions.test.ts (redacted; at most 40 lines of at most 400 characters shown; a cut says so):
    diff --git a/src/runs/intents/transitions.test.ts b/src/runs/intents/transitions.test.ts
    new file mode 100644
    index 0000000..1c91b13
    --- /dev/null
    +++ b/src/runs/intents/transitions.test.ts
    @@ -0,0 +1,288 @@
    +import assert from "node:assert/strict";
    +import { test } from "node:test";
    +
    +import { withTestDatabase } from "../../../test/support/pg.ts";
    +import { seedTwoTenants } from "../../../test/support/tenants.ts";
    +import { withTenantTx } from "../../tenancy/index.ts";
    +import type { TenantContext, TenantPool } from "../../tenancy/index.ts";
    +import { payloadDigest } from "../store/canonical.ts";
    +import { envelopeStore } from "../store/envelope-store.ts";
    +import { RunDataError } from "../store/errors.ts";
    +import { createRunStore } from "../store/run-store.ts";
    +import type { NewRun, PayloadValue } from "../store/types.ts";
    +import { IntentError } from "./errors.ts";
    +import { idemKey } from "./key.ts";
    +import {
    +  completeIntent,
    +  getIntent,
    +  markIntentUnknown,
    +  recordIntent,
    +  type IntentRecord,
    +  type IntentWrite,
    +} from "./repository.ts";
    +
    +const FLOW_HASH = `sha256:${"a".repeat(64)}`;
    +const AT = new Date("2026-11-02T10:00:00.000Z");
    +const AT_PLUS_60 = new Date("2026-11-02T10:01:00.000Z");
    +const AT_PLUS_120 = new Date("2026-11-02T10:02:00.000Z");
    +const AT_PLUS_180 = new Date("2026-11-02T10:03:00.000Z");
    +const AT_PLUS_240 = new Date("2026-11-02T10:04:00.000Z");
    +
    +const PAY_ARGS: PayloadValue = {
    +  vendor_id: "v1",
    +  amount: 120,
    +  currency: "EUR",
    [cut: 254 more lines; the cut lines are replayed too: the whole change is in `openspec/changes/add-effect-intents/.l4/held/3.2-pre_satisfied.patch` on the unit branch]

`accept: <why>` replays exactly the saved change of 1 files (the whole patch is in `openspec/changes/add-effect-intents/.l4/held/3.2-pre_satisfied.patch` on the unit branch): the next run applies it, with every guard and gate an agent's changes get, instead of starting an agent. The accept takes effect only through that replay: if the replay fails a gate or the check refutes a criterion, the accept is used up, and a later step that meets the same inconclusive check is held again with a new question. When the check cannot decide again during the replay, the claim is taken (the verifier and the judge see that it was accepted). A criterion that the check shows not to discriminate still fails the attempt.
`retry: <note>` runs the check again, for example after an L4 upgrade; the note reaches the agent.
A person answers; an agent only where `clarifier.answer_by_agents` is true on the base branch.

### Options
1. accept: count these on the evidence of the real run
2. retry: run the check again (after an L4 upgrade or a fix)

### Answer
<!-- write below this line -->
accept: The check could not run only because L4's zero-value variation handles Python files and this unit is TypeScript, so a retry without an L4 upgrade would stop at the same point. I checked the claim the check was meant to verify. The agent's exemption says task 3.1 already implemented completeIntent and markIntentUnknown, and the head confirms it: both functions in src/runs/intents/repository.ts are full implementations, with the tenant check, key and date validation, a SELECT FOR UPDATE, INTENT_NOT_FOUND for an absent row, a done row answered unchanged, unknown and done answered unchanged by markIntentUnknown, and the result stored through envelopeStore.put before the UPDATE. The three held tests are not vacuous: they deep-equal the returned records against the exact values of the scenario "Completing and marking unknown" (state, resultRef as payloadDigest(PAID), completedAt 10:01:00 and 10:04:00), assert INTENT_NOT_FOUND for the absent key and for tenant B, INTENT_INVALID for a bad key, RUN_DATA_INVALID for an invalid result with the K3 row still intent, count envelope_payload rows as owner to show the second result was not stored, and read the stored payload back. Every call that reaches the repository is wrapped in assert.doesNotReject, so a stub or a zero-value implementation would fail them by assertion. The tests follow the scenario and the design, and the code they exercise is real, so the real run is enough evidence to count them.
