# Questions — add-web-shell-followup-1

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
| Q-001 | open | 1.1 | ambiguous | Does the new client page gate supersede the existing server-403 page for every capability-gated feature, including /admin/users? |
<!-- l4:index:end -->

---

## Q-001: Does the new client page gate supersede the existing server-403 page for every capability-gated feature, including /admin/users?

- **Status:** open
- **Blocking tasks:** 1.1
- **Kind:** ambiguous
- **Asked:** 2026-11-25T18:31Z by deepseek-free, run r-20261125T1822Z-dd0f, task 1.1

### Context
C-8c08d9f5 says that a signed-in user whose /me capabilities lack a feature's capability, opening that feature's path directly, sees only a not-allowed panel and sends none of the feature's API requests. The existing web-admin spec scenario 'Alice sees a 403 page with the decision id' (and e2e/test_m2_admin.py C-652f54b7) has the same WHEN for /admin/users: Alice lacks manage_users_roles, opens /admin/users by address, and the THEN requires the page to send the request and show the server FORBIDDEN alert with 'Decision id:' and the 'Copy decision id' button. Applying the new gate to every capability-gated feature makes that request impossible, so both criteria cannot hold. The follow-up proposal scopes the impact to add-web-shell and does not list the web-admin test as changing in place.

### Options
1. Apply the gate to every capability-gated feature; the web-admin /admin/users scenario and its e2e test are superseded and must change.
2. Apply the gate only where no server decision id is expected (for example /admin/grants), leaving /admin/users and its server-403 page unchanged.
3. Something else (describe the intended scope).

### Answer
<!-- write below this line -->
