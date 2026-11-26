# Feedback — add-web-sign-in

<!-- l4:feedback v1
Ask for changes here while the unit's branch is open. The easy way is `l4 feedback add` (see `l4 feedback --help`).
An item is read only when its **Status** is `submitted`; `draft` items wait and `withdrawn` items are ignored.
Kinds: refactor · duplication · tests · config · behaviour (see docs/feedback.md).
Do not change item IDs. Commit and push to the l4/… branch: the harness takes submitted items at its next
verification round, turns them into a fix unit and checks that each one was addressed. -->

<!-- l4:feedback-index:start -->
| ID | Status | Kind | Where | Feedback |
|----|--------|------|-------|----------|
| FB-001 | taken | behaviour | web/src/auth/session-fetch.ts:23 | A write fails in one tab after the same session loads a page in another tab |
<!-- l4:feedback-index:end -->

---

## FB-001: A write fails in one tab after the same session loads a page in another tab

- **Status:** taken
- **Kind:** behaviour
- **Where:** `web/src/auth/session-fetch.ts:23-46`
- **Lesson:** no
- **By:** CiprianSpot, 2026-11-26T11:41:41Z

### Code
```typescript
  inner: typeof fetch,
  csrfToken: () => Promise<string | null>,
): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!isRootRelative(input) || !isStateChanging(init?.method)) {
      return inner(input, init);
    }

    let token: string | null;
    try {
      token = await csrfToken();
    } catch {
      token = null;
    }

    const headers = new Headers(init?.headers);
    if (token !== null && TOKEN_PATTERN.test(token) && !headers.has(CSRF_HEADER)) {
      headers.set(CSRF_HEADER, token);
    }

    return inner(input, { ...init, headers });
  };
}
```

### Feedback
Browser repro 2026-11-26 at 96cfab9a on the fake e2e stack (carol, /admin/roles-and-teams): tab B's page load (one GET /api/v1/me, 200) made tab A's next POST /api/v1/teams answer 403 CSRF_INVALID; the form and a toast showed 'This page is out of date. Reload it and try again.', the team was not created, and a retry without reload failed the same way. One tab with in-app navigation is unaffected (no extra /me). Cause: issueCsrfToken replaces the session's only token hash on every /me (identity-authn 'A CSRF token is issued, stored hashed and checked'), which stays as specified; the fix is the web client's. The CSRF check refuses before any handler runs, so repeating the request once is safe. Not a vulnerability: the token check still holds and fails closed.

### When / Then
- **When:** two browser tabs share one signed-in session; tab B loads any page (its GET /api/v1/me issues a new CSRF token and the engine keeps only that one), then tab A, without reloading, submits a write such as Create team on Roles and teams, or signs out
- **Then:** tab A's write succeeds: when a state-changing request is answered 403 with error.code CSRF_INVALID or OIDC_CSRF_INVALID, the session fetch reloads GET /api/v1/me once, takes its new csrfToken and repeats the same request (method, path, body) once with it; only a second refusal shows 'This page is out of date. Reload it and try again.'; a request refused for any other reason, and every GET, is never repeated

### Outcome
<!-- written by the harness -->
Taken into add-web-sign-in-followup-1
