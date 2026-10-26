# engine-config Specification

## Purpose
The typed engine configuration every Ursitoare unit reads: `URSITOARE_*` variables parsed once into an `AppConfig`, secrets taken only from files, and a refusal to start on a bad value or a secret placed in the environment.

## Requirements

### Requirement: Typed configuration from the environment
`loadConfig(env, readSecret?)` SHALL return an `AppConfig` from `URSITOARE_*` variables, default every unset or empty one, ignore unknown ones, and throw `ConfigError` `CONFIG_INVALID` (naming the variable, never its value) for a bad value or a non-empty secret-shaped variable (`PGPASSWORD`, `PGPASSFILE`, or a `URSITOARE_*` name ending in `PASSWORD`, `SECRET`, `TOKEN` or `KEY`, not `_FILE`).

#### Scenario: Defaults
- **WHEN** `loadConfig({})` is called
- **THEN** the result has `role` `"all"`, `host` `"127.0.0.1"`, `port` `8080`, `logLevel` `"info"`, `publicBaseUrl` `"http://127.0.0.1:8080"`, `webDist` `null`, `shutdownDrainMs` `10000`, `engineKey` `null` and `database` `{ app: null, owner: null }`

#### Scenario: Values from the environment
- **WHEN** the env sets `URSITOARE_PORT=9090`, `URSITOARE_HOST=0.0.0.0`, `URSITOARE_LOG_LEVEL=debug`, `URSITOARE_ROLE=api`, `URSITOARE_WEB_DIST=/srv/web`, `URSITOARE_SHUTDOWN_DRAIN_MS=2500` and `URSITOARE_PUBLIC_BASE_URL=https://ursitoare.example.com/`
- **THEN** the result carries those values and `publicBaseUrl` is `"https://ursitoare.example.com"`; with only `URSITOARE_PORT=9090` it is `"http://127.0.0.1:9090"`; an empty `URSITOARE_PORT=""` or an unknown `URSITOARE_NO_SUCH_SETTING` changes nothing

#### Scenario: Bad values are refused without echoing them
- **WHEN** one of these is set: `URSITOARE_PORT` to `"0"`, `"70000"`, `"abc"` or `"80.5"`; `URSITOARE_LOG_LEVEL=verbose`; `URSITOARE_ROLE=boss`; `URSITOARE_HOST` to `"bad host"` or `"http://h"`; `URSITOARE_SHUTDOWN_DRAIN_MS` to `"0"`, `"300001"`, `"1e3"`, `" 5"` or `"+5"`; `URSITOARE_PUBLIC_BASE_URL` to `"ftp://x"` or `"https://u:pw@x.example/"`
- **THEN** `loadConfig` throws `ConfigError` `CONFIG_INVALID` with that `variable` and no offending value in the `message`

#### Scenario: A secret placed in the environment is refused
- **WHEN** the env holds `URSITOARE_ENGINE_KEY=abc123`, `URSITOARE_DATABASE_PASSWORD=pw-y`, `URSITOARE_FOO_TOKEN=x`, `PGPASSWORD=pw-x` or `PGPASSFILE=/home/u/.pgpass`
- **THEN** `loadConfig` throws `CONFIG_INVALID` with that `variable` and none of `abc123`, `pw-y`, `pw-x` or the path in the message; each name set to `""` changes nothing

### Requirement: Secrets only from files
`loadConfig` SHALL read secrets only from the files named by `*_FILE` variables through `readSecret`, refuse a missing, unreadable or empty file with `CONFIG_SECRET_EMPTY`, accept an engine key only as at least 64 hex characters or base64 of at least 32 bytes (`CONFIG_INVALID` otherwise), and hold each value in a `Secret` that never shows it to JSON, `String()` or `util.inspect`.

#### Scenario: Engine key loaded
- **WHEN** `URSITOARE_ENGINE_KEY_FILE=/run/secrets/engine_key` and `readSecret` returns 64 hex characters (`"9f".repeat(32)`) plus `"\n"`, or `Buffer.alloc(32, 7).toString("base64")`
- **THEN** `config.engineKey.reveal()` is that text without the newline and `readSecret` was called once with that path

#### Scenario: Empty, missing or weak engine key refuses start
- **WHEN** `readSecret` returns `""`, `"\n"` or `"  \n"`, throws, returns `"k".repeat(32)`, or returns `"a".repeat(63)`
- **THEN** `loadConfig` throws `CONFIG_SECRET_EMPTY` for the first four cases (message without the thrown error's text) and `CONFIG_INVALID` for the last two, with `variable` `"URSITOARE_ENGINE_KEY_FILE"`

#### Scenario: No secret byte leaves the config object
- **WHEN** a config is loaded with an engine key of 64 hex characters (`"ab12".repeat(16)`) and a database password `"pw-Zq7"`
- **THEN** `JSON.stringify(config)`, `util.inspect(config, { depth: null })` and `String(config.engineKey)` contain neither value, while `config.database.app.password.reveal()` returns `"pw-Zq7"`

#### Scenario: Database settings
- **WHEN** `URSITOARE_DATABASE_URL=postgres://ursitoare_app@db.internal:5432/ursitoare` (or the same with the scheme `postgresql:` and `?sslmode=verify-full`) and `URSITOARE_DATABASE_PASSWORD_FILE` are set, with or without the `URSITOARE_DATABASE_OWNER_URL` and `_OWNER_PASSWORD_FILE` pair
- **THEN** `database.app` is `{ url, password }` (URL unchanged, password a `Secret`), `database.owner` is parsed the same way and is `null` when unset, and a URL without a password file gives `password` `null`

#### Scenario: Bad database settings
- **WHEN** the URL is `postgres://u:pw@h/db`, `postgres://u@h/db?password=x`, `postgres://u@h/db?sslmode=require`, `postgres://u@h/db?application_name=x` or `mysql://u@h/db`; or a password file is set without its URL, for the app pair and the owner pair
- **THEN** a bad URL gives `CONFIG_INVALID` with `variable` the URL variable and no `pw` in the message; a password file without its URL gives `CONFIG_INVALID` with `variable` the password-file variable (`URSITOARE_DATABASE_PASSWORD_FILE` or `URSITOARE_DATABASE_OWNER_PASSWORD_FILE`) and message `<variable>: set only together with <URL variable>`; an empty password file with a valid URL gives `CONFIG_SECRET_EMPTY` with that `variable`
