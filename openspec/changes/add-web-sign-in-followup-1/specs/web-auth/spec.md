# Spec Delta

## Purpose
Regression scenarios for the web-auth capability, found by the verifier in add-web-sign-in.

## ADDED Requirements

### Requirement: A write fails in one tab after the same session loads a page in another tab — feedback FB-001
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: A write fails in one tab after the same session loads a page in another tab
- **WHEN** two browser tabs share one signed-in session; tab B loads any page (its GET /api/v1/me issues a new CSRF token and the engine keeps only that one), then tab A, without reloading, submits a write such as Create team on Roles and teams, or signs out
- **THEN** tab A's write succeeds: when a state-changing request is answered 403 with error.code CSRF_INVALID or OIDC_CSRF_INVALID, the session fetch reloads GET /api/v1/me once, takes its new csrfToken and repeats the same request (method, path, body) once with it; only a second refusal shows 'This page is...
