# Questions — add-admin-api

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
| Q-001 | open | 2.1 | technical | src/identity/admin/accounts.test.ts:224 asserts ADMIN_TENANT_MISMATCH without a foreign transaction, and its signIn helper cannot produce the asserted display names |
<!-- l4:index:end -->

---

## Q-001: src/identity/admin/accounts.test.ts:224 asserts ADMIN_TENANT_MISMATCH without a foreign transaction, and its signIn helper cannot produce the asserted display names

- **Status:** open
- **Blocking tasks:** 2.1
- **Kind:** technical
- **Asked:** 2026-10-31T03:35Z by glm, run r-20261031T0256Z-f813, task 2.1

### Context
The frozen red test of task 2.1 contradicts the task text, the design and existing behaviour in two ways, both verified by running the code. (1) Line 224 rejects with ADMIN_TENANT_MISMATCH for listAccounts(tx, a, { kind: 'human', limit: 50 }), but lines 216-229 wrap it in withTenantTx(db.appPool, a, ...), so the transaction's app.tenant_id is 'tenant_a' and equals the context: a probe against the embedded cluster printed tx setting 'tenant_a', ctx 'tenant_a', equal true. The task text requires 'a foreign transaction as ADMIN_TENANT_MISMATCH' and the sibling pattern is sync.test.ts:324 (withTenantTx(db.appPool, b, (tx) => syncMemberships(tx, a, ...))), so no implementation with the standard tenant check can reject here while every other admin behaviour stays right. (2) signIn (lines 46-63) signs humans in with claims { issuer: ISS, subject, name: subject } (subject 'sub-ann' ... 'sub-carol'); upsertUserFromClaims stores the name claim verbatim as the display name (probed: 'sub-ann'; upsert.test.ts:92-95 pins that a name claim is used as-is and an absent name falls back to the subject), yet the test deepEquals displayName 'ann'/'bob' in C-32b7b36c's first item, C-c6c6a2a5's ann and bob items and C-9733f98e's repeat item. Accepting this question unfreezes exactly this file so the following edits can be applied.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `src/identity/admin/accounts.test.ts`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-admin-api`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit src/identity/admin/accounts.test.ts: move the ADMIN_TENANT_MISMATCH assertion out of the tenant_a block (lines 224-228) and give it its own foreign transaction: `await withTenantTx(db.appPool, b, async (tx) => { await assert.rejects(listAccounts(tx, a, { kind: "human", limit: 50 }), MISMATCH, "a tenant_b transaction with the tenant_a context"); });`
2. Edit src/identity/admin/accounts.test.ts: in the signIn helper (line 55) change the claims to `{ issuer: ISS, subject, name: subject.slice(4) }` (equivalently pass subjects without the `sub-` prefix and name them the same), so a subject `sub-ann` gets the asserted displayName `ann`; alternatively change every expected displayName to the subject with the prefix (`sub-ann`, `sub-bob`, ...).
3. Do not change the test: instead change upsertUserFromClaims to strip a `sub-` prefix from the packed name claim - rejected, because it contradicts the frozen upsert.test.ts:92-95 behaviour of add-identity-model and is not part of task 2.1's files.

### Clarifier suggestion
Edit `src/identity/admin/accounts.test.ts`: move the ADMIN_TENANT_MISMATCH assertion out of the tenant_a block (lines 224-228) and give it its own foreign transaction: `await withTenantTx(db.appPool, b, async (tx) => { await assert.rejects(listAccounts(tx, a, { kind: "human", limit: 50 }), MISMATCH, "a tenant_b transaction with the tenant_a context"); });`

### Answer
<!-- write below this line -->
