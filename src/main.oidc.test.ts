import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { loadConfig } from "./config/index.ts";
import type { Database } from "./db/index.ts";
import { openDatabase } from "./db/index.ts";
import { provisionTenantIdp, registerOidcRoutes } from "./identity/index.ts";
import type { MainDeps, RunningServer } from "./main.ts";
import { main } from "./main.ts";
import type { LogDestination } from "./observability/index.ts";
import { startFakeOidc } from "../test/support/fake-oidc/index.ts";
import { completeFakeLogin } from "../test/support/oidc-login.ts";
import { freePort, withTestDatabase, type TestDatabase } from "../test/support/pg.ts";
import { seedTwoTenants } from "../test/support/tenants.ts";

assert.equal(typeof registerOidcRoutes, "function");
assert.equal(typeof main, "function");

type OpenDatabase = typeof openDatabase;

interface SecretFiles {
  engineKeyFile: string;
  clientSecretFile: string;
  databasePasswordFile: string;
}

function capture(): { destination: LogDestination; lines: string[] } {
  const lines: string[] = [];
  return {
    lines,
    destination: {
      write(line: string): void {
        lines.push(line);
      },
    },
  };
}

function parse(line: string | undefined): Record<string, unknown> {
  assert.ok(line !== undefined, "a log line was written");
  return JSON.parse(line) as Record<string, unknown>;
}

function fatalLines(lines: readonly string[]): Record<string, unknown>[] {
  return lines
    .map((line) => parse(line))
    .filter((line) => line["level"] === 60);
}

async function writeSecretFiles(
  dbPassword: string,
  clientSecret = randomBytes(24).toString("base64url"),
): Promise<SecretFiles> {
  const dir = await mkdtemp(join(tmpdir(), "ursitoare-oidc-"));
  const files: SecretFiles = {
    engineKeyFile: join(dir, "engine-key"),
    clientSecretFile: join(dir, "client-secret"),
    databasePasswordFile: join(dir, "database-password"),
  };
  await writeFile(files.engineKeyFile, randomBytes(32).toString("hex"));
  await writeFile(files.clientSecretFile, clientSecret);
  await writeFile(files.databasePasswordFile, dbPassword);
  return files;
}

function bootEnv(
  port: number,
  issuer: string,
  db: TestDatabase,
  files: SecretFiles,
): Record<string, string> {
  return {
    URSITOARE_HOST: "127.0.0.1",
    URSITOARE_PORT: String(port),
    URSITOARE_DATABASE_URL: db.appEndpoint.url,
    URSITOARE_DATABASE_PASSWORD_FILE: files.databasePasswordFile,
    URSITOARE_ENGINE_KEY_FILE: files.engineKeyFile,
    URSITOARE_OIDC_ISSUER: issuer,
    URSITOARE_OIDC_CLIENT_SECRET_FILE: files.clientSecretFile,
  };
}

function halfWiredEngine(deps: Partial<MainDeps>): Promise<RunningServer | null> {
  return main(deps);
}

test("C-3e029f2d main refuses a half wired engine with one fatal line and exit one", async () => {
  const db = await withTestDatabase();
  const port = await freePort();
  const closedPort = await freePort();
  const password = db.appEndpoint.password;
  assert.ok(password !== null, "the app endpoint carries the password");
  const files = await writeSecretFiles(password.reveal());
  const env = bootEnv(port, `http://127.0.0.1:${closedPort}/realms/ursitoare`, db, files);

  let config: ReturnType<typeof loadConfig> | undefined;
  try {
    config = loadConfig(env);
  } catch (error) {
    assert.fail(`loadConfig refused the generated settings: ${String(error)}`);
  }
  assert.ok(config !== undefined);
  assert.ok(config.oidc !== undefined, "the generated env yields an oidc config");
  assert.ok(config.engineKey !== null, "the generated env yields an engine key");

  const { destination, lines } = capture();
  const exits: number[] = [];
  const halfWired: OpenDatabase = async () => null;

  const results: (RunningServer | null)[] = [];
  await assert.doesNotReject(async () => {
    results.push(
      await halfWiredEngine({
        loadConfig: () => loadConfig(env),
        destination,
        signals: new EventEmitter(),
        exit: (code) => {
          exits.push(code);
        },
        openDatabase: halfWired,
      }),
    );
  }, "main resolves");
  const result = results[0];
  assert.ok(result !== undefined, "main returned a value");
  try {
      assert.ok(result === null, "main resolves null for a half wired engine");
  } finally {
    await result?.close().catch(() => undefined);
  }

  assert.deepEqual(exits, [1], "main exits 1 for a half wired engine");

  const fatal = fatalLines(lines);
  assert.equal(fatal.length, 1, "main writes one fatal line");
  const line = fatal[0];
  assert.ok(line !== undefined, "the fatal line was written");
  assert.equal(line["code"], "OIDC_NOT_CONFIGURED");
  assert.equal(line["msg"], "startup failed");
  assert.equal(
    lines.some((entry) => entry.includes("ursitoare listening")),
    false,
    "no port was opened",
  );
});

test("C-6370f2de main signs alice in over real HTTP and stays healthy", async () => {
  const db = await withTestDatabase();
  const fake = await startFakeOidc();
  const port = await freePort();
  const password = db.appEndpoint.password;
  assert.ok(password !== null, "the app endpoint carries the password");
  const files = await writeSecretFiles(
    password.reveal(),
    fake.clientSecret("ursitoare-engine"),
  );
  const baseUrl = `http://127.0.0.1:${port}`;
  const env = bootEnv(port, fake.issuer, db, files);

  const seeded = await seedTwoTenants(db);
  await provisionTenantIdp(db.ownerPool, seeded.a, {
    issuer: fake.issuer,
    organization: "org-a",
  });
  fake.registerRedirect(`${baseUrl}/auth/oidc/callback`);

  const opened: Database[] = [];
  const recorded: OpenDatabase = async (config, deps) => {
    const database = await openDatabase(config, deps);
    if (database !== null) {
      opened.push(database);
    }
    return database;
  };
  const exits: number[] = [];
  const { destination } = capture();
  const servers: (RunningServer | null)[] = [];

  try {
    await assert.doesNotReject(async () => {
      servers.push(
        await main({
          loadConfig: () => loadConfig(env),
          destination,
          signals: new EventEmitter(),
          exit: (code) => {
            exits.push(code);
          },
          openDatabase: recorded,
        }),
      );
    }, "main starts with the generated oidc settings");

    const running = servers[0];
    assert.ok(running !== null, "main resolves a running server");
    assert.ok(running !== undefined);
    const engine = running.url;

    const login = await fetch(`${engine}/auth/oidc/login?return_to=/flows`, {
      redirect: "manual",
    });
    assert.equal(login.status, 302, "login over real HTTP answers a redirect");
    const loginCookie = login.headers
      .getSetCookie()
      .find((entry) => entry.startsWith("ursitoare_login="));
    assert.ok(loginCookie !== undefined, "login sets the ursitoare_login cookie");
    const value = loginCookie.slice("ursitoare_login=".length);
    const separator = value.indexOf(";");
    const sealed = separator < 0 ? value : value.slice(0, separator);

    const location = login.headers.get("location");
    assert.ok(location !== null, "login redirects to the fake authorization endpoint");
    const callbackUrl = await completeFakeLogin(fake, location, "alice");
    const callback = new URL(callbackUrl);
    assert.equal(`${callback.origin}${callback.pathname}`, `${baseUrl}/auth/oidc/callback`);

    const signed = await fetch(`${engine}${callback.pathname}${callback.search}`, {
      redirect: "manual",
      headers: { cookie: `ursitoare_login=${sealed}` },
    });
    assert.equal(signed.status, 302, "the callback over real HTTP answers a redirect");
    const location2 = signed.headers.get("location");
    assert.ok(location2 !== null, "the callback redirects to the sanitized return_to");
    assert.equal(new URL(location2, baseUrl).pathname, "/flows");

    const sessionCookie = signed.headers
      .getSetCookie()
      .find((entry) => entry.startsWith("ursitoare_session="));
    assert.ok(
      sessionCookie !== undefined && /^ursitoare_session=[A-Za-z0-9_-]{43}/.test(sessionCookie),
      "the callback sets the session cookie",
    );
    assert.ok(
      signed.headers.getSetCookie().some((entry) => entry.startsWith("ursitoare_login=;")),
      "the callback clears the login cookie",
    );

    const health = await fetch(`${engine}/health`);
    assert.equal(health.status, 200, "the engine is still healthy after sign-in");
    const payload = (await health.json()) as { status: unknown };
    assert.equal(payload.status, "ok");
    assert.deepEqual(exits, [], "main ran without a fatal exit");
  } finally {
    await servers[0]?.close().catch(() => undefined);
    await opened[0]?.close().catch(() => undefined);
    await fake.close().catch(() => undefined);
    await db.close();
  }
});
