## ADDED Requirements

### Requirement: The egress configuration is optional and read from URSITOARE_EGRESS_ variables
`loadConfig` SHALL add `egress` to the `AppConfig` only when one of the variables `URSITOARE_EGRESS_` `BROKER_URL`, `PROXY_URL`, `BROKER_TOKEN_FILE`, `AGENT_ID`, `VAULT_URL`, `VAULT_IDENTITY`, `VAULT_TOKEN_FILE` is non-empty. `loadEgressConfig` SHALL then require the first three, accept http or https URLs without credentials, query or fragment (a path for the broker and proxy, none for the vault) minus trailing slashes, default `AGENT_ID` to `ursitoare-engine`, require all three vault variables or none, read each token only from its file into a `Secret` (after the one trailing newline is dropped, 1 to 4096 characters of `\x21-\x7e`, else `CONFIG_INVALID` naming the variable, because the token becomes a header value and Node's `fetch` echoes a refused value in its error), and throw the first failing check as `ConfigError` `CONFIG_INVALID` (naming the variable, never its value) or, for a missing, unreadable or blank token file, `CONFIG_SECRET_EMPTY`.

#### Scenario: A complete egress configuration loads and an absent one leaves no key
- **WHEN** `loadConfig` runs on rows L1 to L6 of test-plan.md § Config with a map-backed `SecretReader`
- **THEN** L1 and L2 give a config without an own `egress` key and `loadEgressConfig({}, reader)` is `undefined` with no read; L3 gives `brokerUrl` `http://broker.internal:8081`, `agentId` `ursitoare-engine`, `vault` `null` and token `bt-secret-4d2a` after one read; L4 gives `agentId` `eng:1` and the vault `svcid_ursitoare_admin` with token `vt-secret-6c3e` after two reads, neither secret in `JSON.stringify` or `util.inspect`; L5 drops trailing slashes; L6 loads a token of 4096 characters

#### Scenario: An incomplete or malformed egress configuration is refused
- **WHEN** `loadConfig` runs on rows E1 to E19 of test-plan.md § Config
- **THEN** each throws a `ConfigError` with the code, `variable` and reason of its row (E4 by the existing secret rule, E16 showing that the first failing check wins, E17 to E19 the token files with a line break, a NUL, a space, a non-ASCII or an over-long token), and no message holds `u:p` or `bt-secret-4d2a`
