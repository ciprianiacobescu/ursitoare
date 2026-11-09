import assert from "node:assert/strict";
import { inspect } from "node:util";
import { test } from "node:test";

import { loadConfig } from "./config.ts";
import type { ConfigErrorCode } from "./errors.ts";
import type { AppConfig, Env } from "./config.ts";
import type { EgressConfig } from "./egress.ts";
import { loadEgressConfig } from "./egress.ts";
import type { SecretReader } from "./secret.ts";

type EgressAppConfig = AppConfig & { readonly egress?: EgressConfig };

const BROKER_URL_VARIABLE = "URSITOARE_EGRESS_BROKER_URL";
const PROXY_URL_VARIABLE = "URSITOARE_EGRESS_PROXY_URL";
const BROKER_TOKEN_FILE_VARIABLE = "URSITOARE_EGRESS_BROKER_TOKEN_FILE";
const AGENT_ID_VARIABLE = "URSITOARE_EGRESS_AGENT_ID";
const VAULT_URL_VARIABLE = "URSITOARE_EGRESS_VAULT_URL";
const VAULT_IDENTITY_VARIABLE = "URSITOARE_EGRESS_VAULT_IDENTITY";
const VAULT_TOKEN_FILE_VARIABLE = "URSITOARE_EGRESS_VAULT_TOKEN_FILE";

const BROKER_TOKEN = "bt-" + "secret-" + "4d2a";
const VAULT_TOKEN = "vt-" + "secret-" + "6c3e";

const REQUIRED_REASON = "required when another URSITOARE_EGRESS_ variable is set";
const URL_REASON = "must be an http or https URL without credentials, query or fragment";
const AGENT_ID_REASON = "must be 1 to 128 characters of letters, digits, dot, underscore, colon or hyphen";
const VAULT_TOGETHER_REASON = "set together with the other URSITOARE_EGRESS_VAULT_ variables or not at all";
const ORIGIN_REASON = "must be an http or https origin without path, credentials, query or fragment";
const EMPTY_REASON = "file is missing, unreadable or empty";
const TOKEN_CHARS_REASON = "must be 1 to 4096 visible ASCII characters";
const DIRECT_SECRET_VARIABLE = "URSITOARE_EGRESS_BROKER_TOKEN";
const DIRECT_SECRET_REASON = "secrets are read only from files; set URSITOARE_EGRESS_BROKER_TOKEN_FILE";

function fileStore(): Map<string, string> {
  return new Map<string, string>([
    ["/s/broker", `${BROKER_TOKEN}\n`],
    ["/s/vault", `${VAULT_TOKEN}\n`],
    ["/s/blank", "\n"],
    ["/s/lf", `${BROKER_TOKEN}\nx\n`],
    ["/s/cr", `${BROKER_TOKEN}\rx`],
    ["/s/nul", `${BROKER_TOKEN}\x00x`],
    ["/s/space", "bt secret"],
    ["/s/utf", "bté"],
    ["/s/long", `${"a".repeat(4097)}\n`],
    ["/s/max", `${"a".repeat(4096)}\n`],
  ]);
}

function recordingReader(store: ReadonlyMap<string, string>, calls: string[]): SecretReader {
  return (path) => {
    calls.push(path);
    const contents = store.get(path);
    if (contents === undefined) throw new Error(`missing ${path}`);
    return contents;
  };
}

function baseEnv(): Env {
  return {
    [BROKER_URL_VARIABLE]: "http://broker.internal:8081/",
    [PROXY_URL_VARIABLE]: "http://kong.internal:8000/v1/call",
    [BROKER_TOKEN_FILE_VARIABLE]: "/s/broker",
  };
}

function fullEnv(): Env {
  return {
    ...baseEnv(),
    [AGENT_ID_VARIABLE]: "eng:1",
    [VAULT_URL_VARIABLE]: "http://vault.internal:50051",
    [VAULT_IDENTITY_VARIABLE]: "svcid_ursitoare_admin",
    [VAULT_TOKEN_FILE_VARIABLE]: "/s/vault",
  };
}

function without(env: Env, name: string): Env {
  return Object.fromEntries(Object.entries(env).filter(([key]) => key !== name));
}

function egressOf(config: AppConfig): EgressConfig | undefined {
  return (config as EgressAppConfig)["egress"];
}

function assertRefused(
  env: Env,
  store: ReadonlyMap<string, string>,
  code: ConfigErrorCode,
  variable: string,
  reason: string,
): void {
  assert.throws(
    () => loadConfig(env, recordingReader(store, [])),
    (thrown: unknown): boolean => {
      const error = thrown as { name?: string; code?: string; variable?: string; message?: string };
      assert.equal(error.name, "ConfigError");
      assert.equal(error.code, code);
      assert.equal(error.variable, variable);
      assert.equal(error.message, `${variable}: ${reason}`);
      assert.ok(!error.message.includes("u:p"), messageMustNotHoldCredentials());
      assert.ok(!error.message.includes(BROKER_TOKEN), messageMustNotHoldCredentials());
      return true;
    },
  );
}

function messageMustNotHoldCredentials(): string {
  return "a refusal message must not repeat the rejected value or a secret";
}

test("C-58c9e6d3 loadConfig leaves no own egress key when no URSITOARE egress variable has a value and loadEgressConfig is undefined with no read", () => {
  const store = fileStore();
  const emptyCalls: string[] = [];
  assert.doesNotThrow(() => {
    const config = loadConfig({}, recordingReader(store, emptyCalls));
    assert.deepEqual(
      [...Object.keys(config)].sort(),
      ["database", "engineKey", "host", "internalPort", "logLevel", "port", "publicBaseUrl", "role", "shutdownDrainMs", "webDist"],
    );
    assert.equal(egressOf(config), undefined);
    assert.deepEqual(emptyCalls, []);

    const strayCalls: string[] = [];
    const strayConfig = loadConfig(
      { URSITOARE_EGRESS_FOO: "1", URSITOARE_EGRESS_BROKER_URL: "" },
      recordingReader(store, strayCalls),
    );
    assert.equal(egressOf(strayConfig), undefined);
    assert.deepEqual(strayCalls, []);

    assert.equal(loadEgressConfig({}, recordingReader(store, emptyCalls)), undefined);
    assert.deepEqual(emptyCalls, []);
  });
  assert.ok(egressOf(loadConfig(baseEnv(), recordingReader(store, []))) !== undefined);
});

test("C-58c9e6d3 loadConfig reads the broker token once and the vault token when every egress variable is set", () => {
  const baseCalls: string[] = [];
  const broker = egressOf(loadConfig(baseEnv(), recordingReader(fileStore(), baseCalls)));
  assert.ok(broker !== undefined);
  assert.equal(broker.brokerUrl, "http://broker.internal:8081");
  assert.equal(broker.proxyUrl, "http://kong.internal:8000/v1/call");
  assert.equal(broker.agentId, "ursitoare-engine");
  assert.equal(broker.vault, null);
  assert.equal(broker.brokerToken.reveal(), BROKER_TOKEN);
  assert.deepEqual(baseCalls, ["/s/broker"]);

  const fullCalls: string[] = [];
  const full = egressOf(loadConfig(fullEnv(), recordingReader(fileStore(), fullCalls)));
  assert.ok(full !== undefined);
  assert.ok(full.vault !== null);
  if (full.vault !== null) {
    assert.equal(full.vault.url, "http://vault.internal:50051");
    assert.equal(full.vault.identity, "svcid_ursitoare_admin");
    assert.equal(full.vault.token.reveal(), VAULT_TOKEN);
  }
  assert.equal(full.brokerToken.reveal(), BROKER_TOKEN);
  assert.deepEqual(fullCalls, ["/s/broker", "/s/vault"]);
  for (const text of [JSON.stringify(full), inspect(full)]) {
    assert.ok(!text.includes(BROKER_TOKEN), "the rendered config must not hold the broker token");
    assert.ok(!text.includes(VAULT_TOKEN), "the rendered config must not hold the vault token");
  }
});

test("C-58c9e6d3 loadConfig strips trailing slashes from the egress URLs and accepts a 4096 character broker token", () => {
  const slashCalls: string[] = [];
  const slashed = egressOf(
    loadConfig(
      {
        ...fullEnv(),
        [PROXY_URL_VARIABLE]: "https://kong.internal:8443///",
        [VAULT_URL_VARIABLE]: "http://vault.internal:50051/",
      },
      recordingReader(fileStore(), slashCalls),
    ),
  );
  assert.ok(slashed !== undefined);
  assert.equal(slashed.proxyUrl, "https://kong.internal:8443");
  assert.ok(slashed.vault !== null);
  if (slashed.vault !== null) {
    assert.equal(slashed.vault.url, "http://vault.internal:50051");
  }

  const maxCalls: string[] = [];
  const maxed = egressOf(
    loadConfig(
      { ...baseEnv(), [BROKER_TOKEN_FILE_VARIABLE]: "/s/max" },
      recordingReader(fileStore(), maxCalls),
    ),
  );
  assert.ok(maxed !== undefined);
  assert.equal(maxed.brokerToken.reveal(), "a".repeat(4096));
  assert.deepEqual(maxCalls, ["/s/max"]);
});

test("C-9a6e394a loadConfig refuses an incomplete egress configuration naming the missing variable", () => {
  const store = fileStore();

  assertRefused({ [AGENT_ID_VARIABLE]: "x" }, store, "CONFIG_INVALID", BROKER_URL_VARIABLE, REQUIRED_REASON);
  assertRefused(
    without(baseEnv(), PROXY_URL_VARIABLE),
    store,
    "CONFIG_INVALID",
    PROXY_URL_VARIABLE,
    REQUIRED_REASON,
  );
  assertRefused(
    without(baseEnv(), BROKER_TOKEN_FILE_VARIABLE),
    store,
    "CONFIG_INVALID",
    BROKER_TOKEN_FILE_VARIABLE,
    REQUIRED_REASON,
  );
  assertRefused(
    { ...baseEnv(), [DIRECT_SECRET_VARIABLE]: "x" },
    store,
    "CONFIG_INVALID",
    DIRECT_SECRET_VARIABLE,
    DIRECT_SECRET_REASON,
  );
});

test("C-9a6e394a loadConfig refuses malformed egress URLs and a bad agent id", () => {
  const store = fileStore();
  assertRefused(
    { ...baseEnv(), [BROKER_URL_VARIABLE]: "ftp://b" },
    store,
    "CONFIG_INVALID",
    BROKER_URL_VARIABLE,
    URL_REASON,
  );
  assertRefused(
    { ...baseEnv(), [BROKER_URL_VARIABLE]: "http://u:p@b:1" },
    store,
    "CONFIG_INVALID",
    BROKER_URL_VARIABLE,
    URL_REASON,
  );
  assertRefused(
    { ...baseEnv(), [PROXY_URL_VARIABLE]: "http://p:1/x?y=1" },
    store,
    "CONFIG_INVALID",
    PROXY_URL_VARIABLE,
    URL_REASON,
  );
  assertRefused(
    { ...baseEnv(), [AGENT_ID_VARIABLE]: "bad id" },
    store,
    "CONFIG_INVALID",
    AGENT_ID_VARIABLE,
    AGENT_ID_REASON,
  );
  assertRefused(
    { ...baseEnv(), [AGENT_ID_VARIABLE]: "a".repeat(129) },
    store,
    "CONFIG_INVALID",
    AGENT_ID_VARIABLE,
    AGENT_ID_REASON,
  );
});

test("C-9a6e394a loadConfig requires the vault variables together and an origin without path for the vault", () => {
  const store = fileStore();
  assertRefused(
    { ...baseEnv(), [VAULT_URL_VARIABLE]: "http://vault.internal:50051" },
    store,
    "CONFIG_INVALID",
    VAULT_IDENTITY_VARIABLE,
    VAULT_TOGETHER_REASON,
  );
  assertRefused(
    without(fullEnv(), VAULT_TOKEN_FILE_VARIABLE),
    store,
    "CONFIG_INVALID",
    VAULT_TOKEN_FILE_VARIABLE,
    VAULT_TOGETHER_REASON,
  );
  assertRefused(
    { ...fullEnv(), [VAULT_URL_VARIABLE]: "http://v:1/x" },
    store,
    "CONFIG_INVALID",
    VAULT_URL_VARIABLE,
    ORIGIN_REASON,
  );
  assertRefused(
    { ...fullEnv(), [VAULT_IDENTITY_VARIABLE]: "a b" },
    store,
    "CONFIG_INVALID",
    VAULT_IDENTITY_VARIABLE,
    AGENT_ID_REASON,
  );
});

test("C-9a6e394a loadConfig refuses missing empty and unreadable egress token files", () => {
  const store = fileStore();
  assertRefused(
    { ...baseEnv(), [BROKER_TOKEN_FILE_VARIABLE]: "/s/blank" },
    store,
    "CONFIG_SECRET_EMPTY",
    BROKER_TOKEN_FILE_VARIABLE,
    EMPTY_REASON,
  );
  assertRefused(
    { ...baseEnv(), [BROKER_TOKEN_FILE_VARIABLE]: "/s/none" },
    store,
    "CONFIG_SECRET_EMPTY",
    BROKER_TOKEN_FILE_VARIABLE,
    EMPTY_REASON,
  );
  assertRefused(
    { ...fullEnv(), [VAULT_TOKEN_FILE_VARIABLE]: "/s/blank" },
    store,
    "CONFIG_SECRET_EMPTY",
    VAULT_TOKEN_FILE_VARIABLE,
    EMPTY_REASON,
  );
});

test("C-9a6e394a loadConfig reports the first failing egress check", () => {
  const store = fileStore();
  assertRefused(
    { ...fullEnv(), [PROXY_URL_VARIABLE]: "ftp://p", [AGENT_ID_VARIABLE]: "bad id" },
    store,
    "CONFIG_INVALID",
    PROXY_URL_VARIABLE,
    URL_REASON,
  );
});

test("C-9a6e394a loadConfig refuses egress token files holding a line break a NUL a space a non-ascii or an overlong token", () => {
  const store = fileStore();
  for (const path of ["/s/lf", "/s/cr", "/s/nul"]) {
    assertRefused(
      { ...baseEnv(), [BROKER_TOKEN_FILE_VARIABLE]: path },
      store,
      "CONFIG_INVALID",
      BROKER_TOKEN_FILE_VARIABLE,
      TOKEN_CHARS_REASON,
    );
  }
  for (const path of ["/s/space", "/s/utf", "/s/long"]) {
    assertRefused(
      { ...baseEnv(), [BROKER_TOKEN_FILE_VARIABLE]: path },
      store,
      "CONFIG_INVALID",
      BROKER_TOKEN_FILE_VARIABLE,
      TOKEN_CHARS_REASON,
    );
  }
  assertRefused(
    { ...fullEnv(), [VAULT_TOKEN_FILE_VARIABLE]: "/s/lf" },
    store,
    "CONFIG_INVALID",
    VAULT_TOKEN_FILE_VARIABLE,
    TOKEN_CHARS_REASON,
  );
});
