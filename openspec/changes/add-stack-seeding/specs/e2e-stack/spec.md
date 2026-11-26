## MODIFIED Requirements

### Requirement: fresh_state resets the stack on the fake profile
`e2e/conftest.py` SHALL provide a function-scoped `fresh_state` fixture that, when it runs, reads `E2E_PROFILE` (default `fake`) and `E2E_CONTROL_URL` (default `DEFAULT_CONTROL_URL`, `http://127.0.0.1:39081`), posts `/reset` to it, with no body and no `Content-Type` and a 60-second timeout, unless the profile is `stack`, and raises `RuntimeError` naming the URL, with `error.code` and `error.details` when the body is the engine envelope, unless the answer is 2xx. On the stack profile it SHALL post `/reset` in the same way, with a 300-second timeout, to `E2E_STACK_CONTROL_URL` when that variable is set and not empty, with the same `RuntimeError` on a failure or an unreachable URL, and return without any request when it is not. A session-scoped autouse fixture `stack_seeded` SHALL call `first_reset(e2e_profile)` once, before the first test, and `first_reset(profile)` SHALL call `reset_state()` when `profile` is `stack` and `E2E_STACK_CONTROL_URL` is set and not empty, and send nothing otherwise, so a journey that takes no `fresh_state` still meets the seeded `E2E tenant` after `20-reset.sh` left the engine database without one.

#### Scenario: Faults and state cleared before a test
- **WHEN** a test installs a fault `GET /health` 503 through a fixture and then requests `fresh_state` before loading `/health`
- **THEN** the page load answers 200; without `fresh_state` it answers 503 with `error.code` `"FAULT_INJECTED"`; the fault is deleted again in the fixture teardown

#### Scenario: Stack profile and unreachable control
- **WHEN** with `E2E_PROFILE=stack` and `E2E_CONTROL_URL=http://127.0.0.1:1` the fixture is requested, and in another test with profile `fake` and the same URL
- **THEN** the first returns without any request; the second raises `RuntimeError` whose message contains the URL

#### Scenario: Stack profile with a stack control URL
- **WHEN** with `E2E_PROFILE=stack`, `E2E_CONTROL_URL=http://127.0.0.1:1` and `E2E_STACK_CONTROL_URL` a loopback server answering 204 the fixture is requested; then `reset_state()` runs against a server answering 500 with `{ "error": { "code": "STACK_RESET_FAILED", "message": "m", "details": { "step": "health" } } }`, against `http://127.0.0.1:1`, with the variable deleted, and with profile `fake` and `E2E_CONTROL_URL` the first server; then `first_reset("stack")` runs with `E2E_STACK_CONTROL_URL` the 204 server, again with the variable deleted, and `first_reset("fake")` with `E2E_CONTROL_URL` the 204 server
- **THEN** the fixture returns `None` and the server saw one request `POST /reset` with an empty body and no `Content-Type`, sent with `timeout` 300; the 500 raises `RuntimeError` `reset failed at <url>: STACK_RESET_FAILED {"step": "health"}`; the dead URL raises `RuntimeError` containing `http://127.0.0.1:1`; with `E2E_STACK_CONTROL_URL` deleted (unset) nothing is sent; the fake profile posts to `E2E_CONTROL_URL` with `timeout` 60; `first_reset` sends one `POST /reset` with `timeout` 300 the first time and nothing the second and third
