# Spec Delta

## Purpose
A Mintkey-shaped broker, proxy and vault on loopback for the test gates, with records of what happened and a contract suite that also runs against the real stack: no Docker, Kong or secret.

## ADDED Requirements

### Requirement: The proxy forwards with the stored credential injected — regression 1
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Unreachable request body hash is computed before the body is drained
- **WHEN** a request with a body is forwarded to an upstream the proxy cannot reach, whether because the target host has no route and is not loopback or because the connection fails before response headers,
- **THEN** the proxy reads the request body to its end before it appends the ForwardedRequest and the record's bodySha256 equals the hex SHA-256 of the whole request body.
