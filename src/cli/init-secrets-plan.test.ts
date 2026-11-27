import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { CliError } from "./errors.ts";
import { ENV_KEYS, planSecrets, SECRET_FILES } from "./init-secrets.ts";
import type { PlannedFile, SecretPlan } from "./init-secrets.ts";
import { cliMain } from "./main.ts";
import type { CliOutput } from "./output.ts";
import { createCommandRegistry } from "./registry.ts";

assert.equal(typeof planSecrets, "function");

const EXPECTED_SECRET_FILES = [
  {
    name: "engine_key",
    format: "hex64",
    readers: ["URSITOARE_ENGINE_KEY_FILE"],
  },
  {
    name: "kek",
    format: "raw32",
    readers: ["MINTKEY_VAULT_KEK_FILE"],
  },
  {
    name: "signing_seed",
    format: "raw32",
    readers: ["MINTKEY_BROKER_SIGNING_KEY_FILE"],
  },
  {
    name: "mk_issue_token",
    format: "hex64",
    readers: ["URSITOARE_EGRESS_BROKER_TOKEN_FILE", "MINTKEY_MCP_SERVICE_TOKEN_FILE"],
  },
  {
    name: "mk_proxy_token",
    format: "hex64",
    readers: ["MINTKEY_PROXY_SERVICE_TOKEN_FILE", "URSITOARE_AUDIT_SINK_PROXY_TOKEN_FILE"],
  },
  {
    name: "mk_broker_token",
    format: "hex64",
    readers: ["MINTKEY_BROKER_SERVICE_TOKEN_FILE", "URSITOARE_AUDIT_SINK_BROKER_TOKEN_FILE"],
  },
  {
    name: "mk_vault_proxy_token",
    format: "hex64",
    readers: ["MINTKEY_VAULT_PROXY_TOKEN_FILE"],
  },
  {
    name: "mk_vault_writer_token",
    format: "hex64",
    readers: ["MINTKEY_VAULT_ADMIN_TOKEN_FILE", "URSITOARE_EGRESS_VAULT_TOKEN_FILE"],
  },
  {
    name: "db_superuser_password",
    format: "hex64",
    readers: ["POSTGRES_PASSWORD_FILE", "URSITOARE_DATABASE_ADMIN_PASSWORD_FILE"],
  },
  {
    name: "db_owner_password",
    format: "hex64",
    readers: ["URSITOARE_DATABASE_OWNER_PASSWORD_FILE"],
  },
  {
    name: "db_app_password",
    format: "hex64",
    readers: ["URSITOARE_DATABASE_PASSWORD_FILE"],
  },
  {
    name: "db_keycloak_password",
    format: "hex64",
    readers: [],
  },
  {
    name: "oidc_client_secret",
    format: "hex64",
    readers: ["URSITOARE_OIDC_CLIENT_SECRET_FILE"],
  },
  {
    name: "keycloak_admin_password",
    format: "hex64",
    readers: [],
  },
  {
    name: "first_user_password",
    format: "hex64",
    readers: [],
  },
];

const EXPECTED_ENV_KEYS = [
  "KC_DB_PASSWORD",
  "KC_BOOTSTRAP_ADMIN_USERNAME",
  "KC_BOOTSTRAP_ADMIN_PASSWORD",
  "KC_URSITOARE_CLIENT_SECRET",
  "KC_URSITOARE_FIRST_USER",
  "KC_URSITOARE_FIRST_PASSWORD",
];

interface Seeded {
  random: (n: number) => Uint8Array;
  asked: number[];
}

function seeded(): Seeded {
  const asked: number[] = [];
  let call = 0;
  return {
    asked,
    random(n: number): Uint8Array {
      asked.push(n);
      call += 1;
      return createHash("sha256").update(`init-secrets-test:${call}`).digest().subarray(0, n);
    },
  };
}

function digestHex(call: number): string {
  return createHash("sha256").update(`init-secrets-test:${call}`).digest("hex");
}

function planOf(
  dir: string,
  random: (n: number) => Uint8Array,
  opts?: { firstUser?: string },
): SecretPlan {
  let plan: SecretPlan | undefined;
  try {
    plan = planSecrets(dir, random, opts);
  } catch (error) {
    assert.fail(
      `planSecrets threw ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  assert.ok(plan !== undefined, "planSecrets answers a plan");
  return plan;
}

function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

function at(plan: SecretPlan, index: number): PlannedFile {
  const file = plan.files[index];
  assert.ok(file !== undefined, `the plan holds file ${index}`);
  return file;
}

function textOf(file: PlannedFile): string {
  return Buffer.from(file.bytes).toString("utf8");
}

function textWithoutNewline(file: PlannedFile): string {
  return textOf(file).replace(/\n$/, "");
}

function assertPairwiseDifferent(plan: SecretPlan): void {
  const values = plan.files.map((file) => Buffer.from(file.bytes).toString("hex"));
  assert.equal(new Set(values).size, values.length, "the values are pairwise different");
}

interface Captured {
  output: CliOutput;
  text(): string;
}

function capture(): Captured {
  let buffer = "";
  return {
    output: {
      write(text: string): void {
        buffer += text;
      },
    },
    text(): string {
      return buffer;
    },
  };
}

const ENV_TEXT =
  [
    `KC_DB_PASSWORD=${digestHex(12)}`,
    "KC_BOOTSTRAP_ADMIN_USERNAME=admin",
    `KC_BOOTSTRAP_ADMIN_PASSWORD=${digestHex(14)}`,
    `KC_URSITOARE_CLIENT_SECRET=${digestHex(13)}`,
    "KC_URSITOARE_FIRST_USER=owner",
    `KC_URSITOARE_FIRST_PASSWORD=${digestHex(15)}`,
  ].join("\n") + "\n";

test("C-cf700a7d the plan lists the files, the modes and the random calls", () => {
  const { random, asked } = seeded();
  const plan = planOf("/deploy", random);

  assert.deepEqual(plan.dirs, ["/deploy/secrets"], "the plan holds one directory");
  assert.equal(plan.files.length, 16, "the plan holds sixteen files");

  const expectedPaths = [
    ...EXPECTED_SECRET_FILES.map((spec) => `/deploy/secrets/${spec.name}`),
    "/deploy/.env",
  ];
  assert.deepEqual(
    plan.files.map((file) => file.path),
    expectedPaths,
    "the files are in SECRET_FILES order then .env",
  );
  for (const file of plan.files) {
    assert.equal(file.mode, 0o600, `the mode of ${file.path} is 0600`);
  }
  assert.equal(plan.firstUser, "owner", "the first user defaults to owner");
  assert.deepEqual(SECRET_FILES, EXPECTED_SECRET_FILES, "SECRET_FILES names the fifteen files");
  assert.deepEqual(
    asked,
    Array.from({ length: 15 }, () => 32),
    "random is called fifteen times with 32",
  );
});

test("C-70d304da formats, distinct values and a reused buffer", () => {
  const first = planOf("/deploy", seeded().random);

  const engineKey = at(first, 0);
  assert.equal(
    textOf(engineKey),
    "0143a4cf6a918e393114230e1a80b18f085e6768f5ffa4d4c6f99a090ad13679\n",
    "the engine key holds digest 1 and a newline",
  );
  assert.equal(engineKey.bytes.length, 65, "the engine key is 65 bytes");

  const kek = at(first, 1);
  assert.equal(
    Buffer.from(kek.bytes).toString("hex"),
    "6299f5dc6b9df9ba41c4176c6371835da7e25df67154b8fe8e84e4516e431674",
    "the kek holds the raw bytes of digest 2",
  );
  assert.equal(kek.bytes.length, 32, "the kek is 32 bytes");
  assert.notEqual(kek.bytes[31], 0x0a, "the kek has no trailing newline");

  const signingSeed = at(first, 2);
  assert.equal(
    Buffer.from(signingSeed.bytes).toString("hex"),
    "1d26225e0ddc8b63bfb3d6bf5a6c3ab0def58b7c92db59a063107e9e9d327215",
    "the signing seed holds the raw bytes of digest 3",
  );
  assert.equal(signingSeed.bytes.length, 32, "the signing seed is 32 bytes");

  for (const [index, spec] of EXPECTED_SECRET_FILES.entries()) {
    if (spec.format !== "hex64") {
      continue;
    }
    const text = textOf(at(first, index));
    assert.match(text, /^[0-9a-f]{64}\n$/, `${spec.name} is 64 lowercase hex and a newline`);
    assert.equal(text, `${digestHex(index + 1)}\n`, `${spec.name} holds the text of its digest`);
  }
  assertPairwiseDifferent(first);

  let calls = 0;
  const reused = new Uint8Array(32);
  const second = planOf("/deploy", (_n: number): Uint8Array => {
    calls += 1;
    reused.fill(calls);
    return reused;
  });
  assert.equal(calls, 15, "random runs fifteen times for the reused buffer");
  assertPairwiseDifferent(second);

  for (const [index, spec] of EXPECTED_SECRET_FILES.entries()) {
    const k = index + 1;
    const bytes = Buffer.from(at(second, index).bytes);
    if (spec.format === "raw32") {
      assert.equal(bytes.length, 32, `${spec.name} is 32 bytes`);
      assert.ok(
        bytes.every((value) => value === k),
        `${spec.name} holds the value ${k}`,
      );
    } else {
      const pair = k.toString(16).padStart(2, "0");
      assert.equal(
        bytes.toString("utf8"),
        `${pair.repeat(32)}\n`,
        `${spec.name} holds the hex text of the value ${k}`,
      );
    }
  }
});

test("C-8fdd6e46 a short or throwing random source", async () => {
  const short = thrown(() => planSecrets("/d", () => new Uint8Array(31)));
  assert.ok(short instanceof CliError, "31 bytes throws a CliError");
  assert.equal((short as { code?: unknown }).code, "CLI_INTERNAL", "31 bytes uses CLI_INTERNAL");
  assert.equal(
    (short as Error).message,
    "random source returned the wrong length",
    "31 bytes names the wrong length",
  );

  const long = thrown(() => planSecrets("/d", () => new Uint8Array(33)));
  assert.ok(long instanceof CliError, "33 bytes throws a CliError");
  assert.equal((long as { code?: unknown }).code, "CLI_INTERNAL", "33 bytes uses CLI_INTERNAL");
  assert.equal(
    (long as Error).message,
    "random source returned the wrong length",
    "33 bytes names the wrong length",
  );

  const boom = new Error("entropy-secret");
  const throwing = thrown(() => {
    planSecrets("/d", () => {
      throw boom;
    });
  });
  assert.strictEqual(throwing, boom, "a throwing random source propagates the same error object");

  const registry = createCommandRegistry();
  registry.registerCommand("init-secrets", {
    summary: "test",
    options: { dir: { type: "string", summary: "directory", required: true } },
    database: false,
    run: async () => {
      planSecrets("/d", () => {
        throw boom;
      });
      return 0;
    },
  });
  const stdout = capture();
  const stderr = capture();
  const code = await cliMain(["init-secrets", "--dir", "/d"], {
    env: {},
    registry,
    stdout: stdout.output,
    stderr: stderr.output,
  });
  assert.equal(code, 1, "cliMain exits 1 for the thrown source");
  assert.equal(stdout.text(), "", "cliMain writes nothing on stdout");
  assert.equal(
    stderr.text(),
    "CLI_INTERNAL: command failed\n",
    "cliMain prints the generic line and no text of the error",
  );
});

test("C-5810ee63 the six keys, the first user and a refused name", () => {
  const first = planOf("/deploy", seeded().random);
  const envText = textOf(at(first, 15));
  assert.equal(envText, ENV_TEXT, "the .env holds the six Keycloak lines");
  assert.equal(Buffer.byteLength(envText, "utf8"), 422, "the .env is 422 bytes");

  const named = planOf("/deploy", seeded().random, { firstUser: "ana.m" });
  const namedText = textOf(at(named, 15));
  assert.equal(
    namedText,
    ENV_TEXT.replace("KC_URSITOARE_FIRST_USER=owner", "KC_URSITOARE_FIRST_USER=ana.m"),
    "the named plan changes only the first-user line",
  );
  assert.equal(Buffer.byteLength(namedText, "utf8"), 422, "the named .env is 422 bytes");
  assert.equal(named.firstUser, "ana.m", "the plan reports the first user");

  const firstLines = envText.slice(0, -1).split("\n");
  const namedLines = namedText.slice(0, -1).split("\n");
  assert.equal(firstLines.length, 6, "the .env has six lines");
  assert.equal(namedLines.length, 6, "the named .env has six lines");
  for (let index = 0; index < 6; index += 1) {
    if (index === 4) {
      assert.notEqual(namedLines[index], firstLines[index], "the first-user line differs");
      assert.equal(namedLines[index], "KC_URSITOARE_FIRST_USER=ana.m");
    } else {
      assert.equal(namedLines[index], firstLines[index], `line ${index + 1} is unchanged`);
    }
  }

  assert.deepEqual(ENV_KEYS, EXPECTED_ENV_KEYS, "ENV_KEYS names the six keys in order");
  for (const key of ENV_KEYS) {
    assert.ok(!key.startsWith("URSITOARE_"), `${key} does not use the engine prefix`);
  }

  function lineValue(lines: string[], index: number): string {
    const line = lines[index];
    assert.ok(line !== undefined, `line ${index + 1} exists`);
    const equals = line.indexOf("=");
    assert.ok(equals >= 0, `line ${index + 1} has an equals sign`);
    return line.slice(equals + 1);
  }

  assert.equal(lineValue(firstLines, 0), textWithoutNewline(at(first, 11)), "line 1 is db_keycloak_password");
  assert.equal(lineValue(firstLines, 2), textWithoutNewline(at(first, 13)), "line 3 is keycloak_admin_password");
  assert.equal(lineValue(firstLines, 3), textWithoutNewline(at(first, 12)), "line 4 is oidc_client_secret");
  assert.equal(lineValue(firstLines, 5), textWithoutNewline(at(first, 14)), "line 6 is first_user_password");

  const badNames = [
    "Bob",
    "1a",
    "a".repeat(65),
    "",
    "a b",
    "ana@x",
    "owner\nKC_BOOTSTRAP_ADMIN_USERNAME=evil",
  ];
  for (const firstUser of badNames) {
    let calls = 0;
    const error = thrown(() => {
      planSecrets(
        "/d",
        (_n: number): Uint8Array => {
          calls += 1;
          return new Uint8Array(32);
        },
        { firstUser },
      );
    });
    assert.ok(error instanceof CliError, `the name ${JSON.stringify(firstUser)} throws a CliError`);
    assert.equal((error as { code?: unknown }).code, "CLI_USAGE", "a refused name uses CLI_USAGE");
    assert.equal(
      (error as Error).message,
      "--first-user must match ^[a-z][a-z0-9._-]{0,63}$",
      "a refused name names the pattern",
    );
    assert.equal(calls, 0, "random is not called for a refused name");
  }
});
