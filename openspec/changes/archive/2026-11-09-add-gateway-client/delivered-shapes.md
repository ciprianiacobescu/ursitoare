# Delivered shapes taken by add-gateway-client

From main@cf34c628 (`file:line`) and, for the fake, the M6 folder `add-fake-egress-proxy` (its Interfaces block). No M5 name is used.

```ts
// src/config/config.ts:13 Env = Readonly<Record<string, string | undefined>>  :20-32 AppConfig { role; host; port; logLevel; publicBaseUrl; webDist; shutdownDrainMs; engineKey; database; oidc?; internalPort? }  :131-144 refuseSecretShapedVariables (a URSITOARE_* name ending PASSWORD, SECRET, TOKEN or KEY without _FILE: CONFIG_INVALID "secrets are read only from files; set <name>_FILE")  :209 loadConfig(env, readSecret?)  :241 `oidc === undefined ? config : { ...config, oidc }`
// src/config/secret.ts:5 SecretReader = (path: string) => string  :10 class Secret { reveal(): string; JSON, String and inspect show "[REDACTED]" }  :40 readSecretValue(variable, path, readSecret): Secret (a missing, unreadable or blank file: CONFIG_SECRET_EMPTY "file is missing, unreadable or empty")
// src/config/errors.ts:3 class ConfigError extends Error { code: "CONFIG_INVALID" | "CONFIG_SECRET_EMPTY"; variable: string } (message `${variable}: ${reason}`)   src/config/oidc.ts:78 loadOidcConfig (the pattern)
// src/core/clock.ts:1 Clock { now(): Date }  :11 fixedClock(iso)   src/observability/logger.ts:7 Logger = pino Logger  :47 createLogger({ level, destination?, clock? })
// src/pdp/types.ts:22 Egress { method; host; path; bodyDigest; serviceId; ttlSeconds }  :31 Permit = Egress  :56 Pdp.check(req): Promise<Decision>   src/pdp/permit.ts:43-52 buildPermit(egress): Permit (a frozen copy; its only caller is check.ts:76)   src/pdp/engine.ts:12 createPdp({ schema, policies, clock, ids, logger }): Promise<Pdp>
// test/arch/sources.ts:28 Violation { code; file; line; message }  :44 Snapshot { files; srcDirs }  :54 isTestFile  :62 snapshotOf(files: Record<string, string>)  :103 readSnapshot(root?)  :162 collectImports(file): { specifier; line; typeOnly; dynamic }[] (import, export-from, literal import(); `typeOnly` is true for `import type`, `export type` and all-`type` specifiers)  :242 resolveSpecifier(fromPath, specifier): string | null  :253 sortViolations(vs)
// test/arch/modules.ts:22 gateway: allowed core, config, observability, pdp; egress "tools" (only here may fetch be called, test/arch/rules.ts:303, :363-401)
// test/support/e2e-stack/part.ts:3 E2eStackError { code; details }  :19 PartHandle { env; api?; close() }  :25 PartContext { name; dataDir; engineOrigin; controlOrigin; env; handles }  :34 E2eStackPart { name; start; beforeReset?; seed? }   oidc-part.ts:102 oidcApi(handles)
// test/support/crash/cluster.ts:163 withDedicatedCluster(fn(cluster: { env; … })): starts every discovered part, no engine, no beforeReset
// src/main.ts:116-130 MainDeps { loadConfig; destination; signals; exit; … }  :132 main(deps): Promise<RunningServer | null>  :69 fatalFields(error)  :83 fatalMessage(error)
// add-fake-egress-proxy: startFakeEgress(opts?: { now?: () => Date }): Promise<FakeEgress>  FakeEgress { brokerUrl; proxyUrl; vaultUrl; brokerServiceToken; vaultAdmin: { identity; token; scopes }; addUpstream(host, origin); addCredentialless(serviceId, tenantId, targetUrl); issued(); requests(); events(); clearRecords(); close() }  startEchoUpstream(): Promise<{ origin; close() }> (200 JSON { method, path, query, headers, bodySha256 }; GET /redirect is 302 location /landing?from=echo)
```

Fake rows relied on (that folder's test-plan): `/v1/issue` and `/v1/api-keys/resolve` without the service token are 401; another tenant's token gets 502 `bad gateway: vault error` (P14).
