# Spec Delta

## Purpose
Regression scenarios for the identity-authn capability, found by the verifier in add-oidc-login.

## ADDED Requirements

### Requirement: OIDC handlers send a reply and resolve undefined, so Fastify sends twice and logs a 500 — feedback FB-001
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: OIDC handlers send a reply and resolve undefined, so Fastify sends twice and logs a 500
- **WHEN** an OIDC login, callback, logout or not-configured route answers on a server with the real hook stack (the x-request-id onSend hook and the security-headers onSend hook)
- **THEN** exactly one response is written, no line at error level and no 'Reply was already sent' or FST_ERR_REP_ALREADY_SENT line is logged, and the 'request completed' log line carries the status the client received (302, 200, 401, 403 or 503), not 500
