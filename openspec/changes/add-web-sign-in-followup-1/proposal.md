# Proposal: follow-up 1 for add-web-sign-in

## Why
Requested by CiprianSpot, 2026-11-26T11:41:41Z in FB-001 (behaviour, web/src/auth/session-fetch.ts:23-46): Browser repro 2026-11-26 at 96cfab9a on the fake e2e stack (carol, /admin/roles-and-teams): tab B's page load (one GET /api/v1/me, 200) made tab A's next POST /api/v1/teams answer 403 CSRF_INVALID; the form and a toast showed 'This page is out of date. Reload it and try again.', the team was not created, and a retry without reload failed the same way. One tab with in-app navigation is unaffected (no extra /me). Cause: issueCsrfToken replaces the session's only token hash on every /me (identity-authn 'A CSRF token is issued, stored hashed and checked'), which stays as specified; the fix is the web client's. The CSRF check refuses before any handler runs, so repeating the request once is safe. Not a vulnerability: the token check still holds and fails closed.

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

`add-web-sign-in` was merged, and a person asked for the changes above in its `feedback.md`. This change carries them out; each task names the finding it answers.

## What Changes
- F-f5869f21: Feedback FB-001 (behaviour): A write fails in one tab after the same session loads a page in anot...

## Impact
The code and the tests of `add-web-sign-in`.
