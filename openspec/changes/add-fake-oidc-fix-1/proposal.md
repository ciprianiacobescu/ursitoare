# Proposal: fix 1 for add-fake-oidc

## Why
The verifier found problems in `add-fake-oidc` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-818a6c14 (major): task 3.1: the jwks keys check inspects only the first key, not 'at least one' RS256 key: Decided by delegate in Q-005: The finding holds. Task 3.1 check 2 says the JWKS must hold at least one key with alg RS256 and non-empty kid, n and e, and the spec says the contract suite must pass on real Keycloak as well as on the fake. checkJwks in contract.ts takes keys(0) and asserts alg RS256 and the fields on that single key, so a JWKS whose first entry is a non-RS256 key (as Keycloak publishes an RSA-OAEP encryption key beside the signing key) fails the check although a valid RS256 key is present. The check must search the array for an RS256 key instead of inspecting the first entry. WHEN the jwks keys check fetches a JWKS whose keys array holds a valid RS256 key with non-empty kid, n and e at any position, with other keys of another alg before it THEN the check resolves, and it still rejects with an AssertionError when no key of the array has alg RS256 with non-empty kid, n and e.. Task 3.1 check 2 requires that `keys` holds at least one key with `alg` RS256...

## Impact
The code and the tests of `add-fake-oidc`.
