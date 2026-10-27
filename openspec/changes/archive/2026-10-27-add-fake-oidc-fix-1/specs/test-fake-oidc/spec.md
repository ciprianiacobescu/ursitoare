# Spec Delta

## Purpose
A Keycloak-26-shaped OIDC provider for the test gates, plus the protocol contract suite that also runs against real Keycloak. It lets identity code and browser journeys run with no Docker, external identity provider or secret, and gives negative tests a source of precisely broken tokens.

## ADDED Requirements

### Requirement: The contract suite runs against any base URL — regression 1
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: task 3.1: the jwks keys check inspects only the first key, not 'at least one' RS256 key
- **WHEN** the jwks keys check fetches a JWKS whose keys array holds a valid RS256 key with non-empty kid, n and e at any position, with other keys of another alg before it
- **THEN** the check resolves, and it still rejects with an AssertionError when no key of the array has alg RS256 with non-empty kid, n and e.
