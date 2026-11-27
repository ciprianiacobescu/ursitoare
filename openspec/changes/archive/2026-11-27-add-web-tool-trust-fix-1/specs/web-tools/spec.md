# Spec Delta

## Purpose
Regression scenarios for the web-tools capability, found by the verifier in add-web-tool-trust.

## ADDED Requirements

### Requirement: Effect settings become the overlay body and a discovery answer names every tool left out — regression 1
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: discoverBody neither validates nor emits keys that appear only in a draft's carried map
- **WHEN** a DiscoverDraft holds a carried entry under a key that is in none of effects, names or trust
- **THEN** discoverBody treats that key like a key of the other three maps: a key outside ^[A-Za-z0-9_.-]{1,128}$ or one that brings the total over 100 throws RangeError, and otherwise the tool gets the overlay entry built from its carried fields.

### Requirement: The server page shows discovery, settings, changes and calls — regression 1
The behaviour pinned by the scenarios below SHALL hold.

#### Scenario: Page trust lookups read inherited Object.prototype members instead of Object.prototype-safe defaults
- **WHEN** an operationId or server tool name that is also an Object.prototype member name, such as toString or constructor, has no own entry in a page's trust record
- **THEN** the page shows it at DEFAULT_TRUST and, after the admin trusts or classes it and ticks, submits the same overlay entry as for any other name without an error.
