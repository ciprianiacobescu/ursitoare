import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const SCRIPT_PATH = join(
  import.meta.dirname,
  "..",
  "..",
  "deploy",
  "postgres",
  "initdb",
  "10-keycloak.sh",
);

const SECRET = "/run/secrets/db_keycloak_password";

const VERB = /^(create|drop|alter|grant|revoke|insert|update|delete|truncate|copy|do|call)\b/i;

function scriptProblems(text: string): string[] {
  const out: string[] = [];
  const lines = text.split("\n");
  const code = lines.filter((l) => l.trim() !== "" && !l.trim().startsWith("#"));
  if (lines[0] !== "#!/bin/bash") out.push("script: first line is not #!/bin/bash");
  const verbs = code.map((l) => l.trim()).filter((l) => VERB.test(l));
  const role = /^CREATE ROLE keycloak LOGIN PASSWORD :'([a-z_]+)';$/i.exec(verbs[0] ?? "");
  const db = /^CREATE DATABASE keycloak OWNER keycloak;$/i.test(verbs[1] ?? "");
  if (verbs.length !== 2 || role === null || !db) {
    out.push(
      "script: statements are not exactly CREATE ROLE keycloak LOGIN PASSWORD and CREATE DATABASE keycloak OWNER keycloak",
    );
  }
  const set = code.find((l) => l.trim().startsWith("\\set "));
  const setOk =
    set !== undefined && role !== null && set.trim() === `\\set ${role[1]} \`cat ${SECRET}\``;
  const secretRefs = code.filter((l) => l.includes("/run/secrets/"));
  if (!setOk || secretRefs.length !== 1) {
    out.push(`script: the password is not read from ${SECRET} by a psql \\set`);
  }
  if (
    code.some((l) =>
      /PGPASSWORD|POSTGRES_PASSWORD|\becho\b|\bprintf\b|--password|--set\b|\s-W\b|\s-v\s+(?!ON_ERROR_STOP=1\b)/.test(
        l,
      ),
    )
  ) {
    out.push("script: the password could reach a command line, the environment or output");
  }
  if (!code.some((l) => /^psql\b.*\s-v ON_ERROR_STOP=1\b/.test(l.trim()))) {
    out.push("script: psql is not run with -v ON_ERROR_STOP=1");
  }
  if (code.some((l) => /ursitoare/i.test(l))) {
    out.push("script: names a database or role other than keycloak");
  }
  if (code.some((l) => /^\s*(exit\b|set\s+-)/.test(l))) {
    out.push("script: changes shell options or exits");
  }
  return out;
}

function scriptText(): string {
  assert.ok(existsSync(SCRIPT_PATH), `the script ${SCRIPT_PATH} is missing`);
  return readFileSync(SCRIPT_PATH, "utf8");
}

type Edit = {
  name: string;
  edit: (text: string) => string;
  expected: string[];
};

const STATEMENTS =
  "script: statements are not exactly CREATE ROLE keycloak LOGIN PASSWORD and CREATE DATABASE keycloak OWNER keycloak";
const SECRET_FILE = `script: the password is not read from ${SECRET} by a psql \\set`;

const EDITS: Edit[] = [
  {
    name: "a literal password",
    edit: (text) => text.replace(":'kc_password'", "'abc'"),
    expected: [STATEMENTS, SECRET_FILE],
  },
  {
    name: "no ON_ERROR_STOP",
    edit: (text) => text.replace(" -v ON_ERROR_STOP=1", ""),
    expected: ["script: psql is not run with -v ON_ERROR_STOP=1"],
  },
  {
    name: "the superuser secret file",
    edit: (text) => text.replace("db_keycloak_password", "db_superuser_password"),
    expected: [SECRET_FILE],
  },
  {
    name: "another secret file read",
    edit: (text) =>
      text.replace("CREATE ROLE", "\\set other `cat /run/secrets/db_app_password`\nCREATE ROLE"),
    expected: [SECRET_FILE],
  },
  {
    name: "the password echoed",
    edit: (text) => text.replace("psql -v", 'echo "$POSTGRES_PASSWORD"\npsql -v'),
    expected: ["script: the password could reach a command line, the environment or output"],
  },
  {
    name: "an extra alter role",
    edit: (text) => text.replace("CREATE DATABASE", "ALTER ROLE keycloak SUPERUSER;\nCREATE DATABASE"),
    expected: [STATEMENTS],
  },
  {
    name: "another database",
    edit: (text) =>
      text.replace(
        "CREATE DATABASE keycloak OWNER keycloak;",
        "CREATE DATABASE keycloak OWNER keycloak;\nCREATE DATABASE ursitoare;",
      ),
    expected: [STATEMENTS, "script: names a database or role other than keycloak"],
  },
  {
    name: "an exit",
    edit: (text) => `${text}exit 0\n`,
    expected: ["script: changes shell options or exits"],
  },
  {
    name: "a shell option",
    edit: (text) => text.replace("psql -v", "set -u\npsql -v"),
    expected: ["script: changes shell options or exits"],
  },
  {
    name: "no shebang",
    edit: (text) => text.split("\n").slice(1).join("\n"),
    expected: ["script: first line is not #!/bin/bash"],
  },
  {
    name: "a psql variable",
    edit: (text) => text.replace("psql -v", "psql -v kc_password=x -v"),
    expected: ["script: the password could reach a command line, the environment or output"],
  },
];

test("C-ac7f4766 the init script creates exactly the role and database from the secret file", () => {
  assert.equal(typeof readFileSync, "function");

  const text = scriptText();
  const lines = text.split("\n");
  assert.equal(lines[0], "#!/bin/bash");

  const code = lines.filter((l) => l.trim() !== "" && !l.trim().startsWith("#"));
  const statements = code.map((l) => l.trim()).filter((l) => VERB.test(l));
  assert.deepEqual(statements, [
    "CREATE ROLE keycloak LOGIN PASSWORD :'kc_password';",
    "CREATE DATABASE keycloak OWNER keycloak;",
  ]);

  const secretRefs = lines.filter((l) => l.includes("/run/secrets/"));
  assert.deepEqual(secretRefs.map((l) => l.trim()), [
    "\\set kc_password `cat /run/secrets/db_keycloak_password`",
  ]);

  const psqlLine = code.find((l) => l.trim().startsWith("psql"));
  assert.equal(
    psqlLine?.trim(),
    `psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<'SQL'`,
  );

  assert.deepEqual(scriptProblems(text), []);
});

test("C-e7a41fbe each deviation of the init script gives its own problem", () => {
  assert.equal(typeof readFileSync, "function");

  const text = scriptText();
  assert.deepEqual(scriptProblems(text), []);

  for (const row of EDITS) {
    assert.deepEqual(scriptProblems(row.edit(text)), row.expected, row.name);
  }
});
