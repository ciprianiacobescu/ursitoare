# Questions — add-web-ref-carry

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
| Q-001 | open | 4.1 | technical | e2e/test_m8_ref_carry.py:86-96 FIRST has no pendingDigest, so Approve is disabled |
| Q-002 | open | 4.1 | technical | e2e/test_m8_ref_carry.py:302 403 body lacks details.decisionId |
| Q-003 | open | 4.1 | technical | e2e/test_m8_ref_carry.py:255 two alerts remain after the copy |
<!-- l4:index:end -->

---

## Q-001: e2e/test_m8_ref_carry.py:86-96 FIRST has no pendingDigest, so Approve is disabled

- **Status:** open
- **Blocking tasks:** 4.1
- **Kind:** technical
- **Asked:** 2026-11-27T13:06Z by claude-sonnet, run r-20261127T1106Z-2a77, task 4.1

### Context
test_first_approval_offers_nothing clicks 'Approve surface', but FIRST (built from rec(), pendingDigest None) makes approvalView return canApprove=false, so the button is aria-disabled and the click times out. The spec says a first approval of a pending server must be approvable.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `e2e/test_m8_ref_carry.py`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-web-ref-carry`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `e2e/test_m8_ref_carry.py`: in FIRST add `"pendingDigest": DP, "pendingSubmittedBy": "u_carol",` after `"approvedDigest": None,`
2. Leave as is

### Harness notes
Harness note: the previous attempt of this task was rejected: the task's browser tests do not pass: test_m8_ref_carry::test_a_failed_grants_read_creates_nothing[chromium], test_m8_ref_carry::test_approving_bumped_refs_offers_the_copy[chromium], test_m8_ref_carry::test_first_approval_offers_nothing[chromium]
E       AssertionError: Locator expected to contain text 'dec_1'
E       Actual value: Not allowedYou are not allowed to do this. If you think you should be, give the decision id to an administrator.Error code: FORBIDDEN
E       Call log: (same for 2 tests)
E         - Expect "to_contain_text" get_by_role("region", name="Surface", exact=True).get_by_role("alert") with timeout 5000ms
E         - waiting for get_by_role("region", name="Surface", exact=True).get_by_role("alert")
E           14 × locator resolved to <section role="alert" class="ui-error">…</section>
E 
e2e/test_m8_ref_carry.py:281

### Clarifier suggestion
Edit `e2e/test_m8_ref_carry.py`: in FIRST add `"pendingDigest": DP, "pendingSubmittedBy": "u_carol",` after `"approvedDigest": None,`

### Answer
<!-- write below this line -->
---

## Q-002: e2e/test_m8_ref_carry.py:302 403 body lacks details.decisionId

- **Status:** open
- **Blocking tasks:** 4.1
- **Kind:** technical
- **Asked:** 2026-11-27T13:06Z by claude-sonnet, run r-20261127T1106Z-2a77, task 4.1

### Context
test_a_failed_grants_read_creates_nothing asserts the alert contains 'dec_1', but ErrorPanel only renders details.decisionId for a 403, never the message. The spec says the alert contains 'dec_1'.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `e2e/test_m8_ref_carry.py`, write an answer that names its path exactly as written here or run `l4 questions accept Q-NNN --unit add-web-ref-carry`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `e2e/test_m8_ref_carry.py` line 302: change the 403 body to `{"error": {"code": "FORBIDDEN", "message": "m", "details": {"decisionId": "dec_1"}}}`
2. Leave as is

### Harness notes
Harness note: the previous attempt of this task was rejected: the task's browser tests do not pass: test_m8_ref_carry::test_a_failed_grants_read_creates_nothing[chromium], test_m8_ref_carry::test_approving_bumped_refs_offers_the_copy[chromium], test_m8_ref_carry::test_first_approval_offers_nothing[chromium]
E       AssertionError: Locator expected to contain text 'dec_1'
E       Actual value: Not allowedYou are not allowed to do this. If you think you should be, give the decision id to an administrator.Error code: FORBIDDEN
E       Call log: (same for 2 tests)
E         - Expect "to_contain_text" get_by_role("region", name="Surface", exact=True).get_by_role("alert") with timeout 5000ms
E         - waiting for get_by_role("region", name="Surface", exact=True).get_by_role("alert")
E           14 × locator resolved to <section role="alert" class="ui-error">…</section>
E 
e2e/test_m8_ref_carry.py:281

### Answer
<!-- write below this line -->
---

## Q-003: e2e/test_m8_ref_carry.py:255 two alerts remain after the copy

- **Status:** open
- **Blocking tasks:** 4.1
- **Kind:** technical
- **Asked:** 2026-11-27T13:06Z by claude-sonnet, run r-20261127T1106Z-2a77, task 4.1

### Context
After the copy press the test expects 0 alerts on the page, but the previous run saw 2. I could not identify them from the source. Candidates are unmocked requests (CredentialSection, ReviewSections or discovery) answered 401 by the real engine, or an ErrorPanel from the page. Please confirm the origin from a run trace and say whether the test needs more mocks.

Harness note: the red tests and test-support files of this task are frozen. To let the next green change `e2e/test_m8_ref_carry.py`, set **Status** to `accepted` or `answered` to take option 1, which names the file, or write an answer that names its path or run `l4 questions accept Q-NNN --unit add-web-ref-carry`, then commit and push. An ignore file is never unfrozen by an answer, whatever it says. An answer that does not name the file leaves it frozen, and an answer edited after a run has used it counts as an override and unfreezes nothing.

### Options
1. Edit `e2e/test_m8_ref_carry.py`: add `answer(page, ...)` mocks for each unmocked GET the Surface page makes, as the trace shows
2. Leave as is

### Harness notes
Harness note: the previous attempt of this task was rejected: the task's browser tests do not pass: test_m8_ref_carry::test_a_failed_grants_read_creates_nothing[chromium], test_m8_ref_carry::test_approving_bumped_refs_offers_the_copy[chromium], test_m8_ref_carry::test_first_approval_offers_nothing[chromium]
E       AssertionError: Locator expected to contain text 'dec_1'
E       Actual value: Not allowedYou are not allowed to do this. If you think you should be, give the decision id to an administrator.Error code: FORBIDDEN
E       Call log: (same for 2 tests)
E         - Expect "to_contain_text" get_by_role("region", name="Surface", exact=True).get_by_role("alert") with timeout 5000ms
E         - waiting for get_by_role("region", name="Surface", exact=True).get_by_role("alert")
E           14 × locator resolved to <section role="alert" class="ui-error">…</section>
E 
e2e/test_m8_ref_carry.py:281

### Clarifier suggestion
Edit `e2e/test_m8_ref_carry.py`: add `answer(page, ...)` mocks for each unmocked GET the Surface page makes, as the trace shows

### Answer
<!-- write below this line -->
