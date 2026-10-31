// Architecture test of the secret-pattern scan: each kind is detected without echoing it, and look-alikes pass.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import { listScannableFiles, scanRepository, scanText } from "./secrets.ts";
import { sortViolations, type Violation } from "./sources.ts";

// Runs a call and returns its answer, or a marker when it throws, so a missing behaviour fails on the comparison.
function answer<T>(call: () => T): T | "THROWN" {
  try {
    return call();
  } catch {
    return "THROWN";
  }
}

function scanned(file: string, text: string): Violation[] | "THROWN" {
  return answer(() => sortViolations(scanText(file, text)));
}

function secret(kind: string, file: string, line: number): Violation {
  return {
    code: "ARCH_SECRET",
    file,
    line,
    message: `${kind}-shaped text; build test values at run time`,
  };
}

// Returns the code of the error a call throws, or a marker when it returns, so a missing throw fails on the comparison.
function thrownCode(call: () => unknown): unknown {
  try {
    call();
  } catch (error) {
    if (typeof error === "object" && error !== null) {
      return (error as { code?: unknown }).code;
    }
    return error;
  }
  return "NO ERROR";
}

const tempDirs: string[] = [];

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "arch-secrets-"));
  tempDirs.push(dir);
  return dir;
}

function writeFile(dir: string, name: string, text: string): void {
  const absolute = path.join(dir, name);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, text);
}

function git(dir: string, ...args: string[]): void {
  execFileSync("git", args, { cwd: dir, stdio: "ignore" });
}

after(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("C-c63269ba: each secret kind is detected at its line without echoing the text", () => {
  const privateKey = ["-----BEGIN", "RSA PRIVATE KEY", "-----"].join(" ");
  const agentKey = "mk_" + "agent_" + "A".repeat(24);
  const anthropicKey = "sk-" + "ant-" + "A".repeat(24);
  const skKey = "sk-" + "x".repeat(32);
  const githubToken = "ghp_" + "x".repeat(36);
  const githubPat = "github_pat_" + "x".repeat(22);
  const awsAccessKey = "AKIA" + "X".repeat(16);
  const slackToken = "xox" + "b-" + "x".repeat(12);

  const secrets = [
    privateKey,
    agentKey,
    anthropicKey,
    skKey,
    githubToken,
    githubPat,
    awsAccessKey,
    slackToken,
  ];
  const prose = ["keep keys out of the tree", "every line is scanned on its own"];
  const text = [...prose, ...secrets].join("\n");

  const result = scanned("a.txt", text);
  assert.deepEqual(result, [
    secret("pem_private_key", "a.txt", 3),
    secret("mintkey_agent_key", "a.txt", 4),
    secret("anthropic_key", "a.txt", 5),
    secret("sk_key", "a.txt", 6),
    secret("github_token", "a.txt", 7),
    secret("github_pat", "a.txt", 8),
    secret("aws_access_key", "a.txt", 9),
    secret("slack_token", "a.txt", 10),
  ]);

  assert.ok(Array.isArray(result), `expected a list of violations, got ${String(result)}`);
  for (const violation of result) {
    for (const value of secrets) {
      assert.equal(
        violation.message.includes(value),
        false,
        `the message must not echo the matched text`,
      );
    }
  }
});

test("C-58d38ea1: secret look-alikes pass while a real key is still reported", () => {
  const lookAlikes = [
    "keys start with mk_agent_ and sk-ant-",
    "sk-" + "x".repeat(31),
    "task-" + "a".repeat(40),
    "AKIA" + "X".repeat(15),
    "ghp_" + "x".repeat(35),
  ];

  assert.deepEqual(scanned("look-alikes.txt", lookAlikes.join("\n")), []);

  assert.deepEqual(scanned("b.txt", "sk-" + "x".repeat(32)), [secret("sk_key", "b.txt", 1)]);
});

test("C-e7ed48e1: the file list covers tracked and untracked files only", () => {
  const dir = tempDir();
  const secretLine = "sk-" + "x".repeat(32);

  git(dir, "init");

  writeFile(dir, "tracked.txt", secretLine + "\n");
  git(dir, "add", "tracked.txt");

  writeFile(dir, "deleted.txt", secretLine + "\n");
  git(dir, "add", "deleted.txt");
  fs.rmSync(path.join(dir, "deleted.txt"));

  writeFile(dir, "untracked.txt", secretLine + "\n");
  writeFile(dir, "ignored.txt", secretLine + "\n");
  writeFile(dir, ".gitignore", "ignored.txt\n");
  writeFile(dir, path.join("seed", "leak.txt"), secretLine + "\n");
  writeFile(dir, "binary.bin", secretLine + "\u0000\n");
  fs.symlinkSync(path.join(dir, "tracked.txt"), path.join(dir, "link.txt"));

  const listed = answer(() => listScannableFiles(dir));
  assert.deepEqual(
    answer(() => (listed === "THROWN" ? "THROWN" : [...listed].sort())),
    [".gitignore", "tracked.txt", "untracked.txt"],
  );

  const found = answer(() => scanRepository(dir));
  assert.deepEqual(
    answer(() => (found === "THROWN" ? "THROWN" : sortViolations(found))),
    [secret("sk_key", "tracked.txt", 1), secret("sk_key", "untracked.txt", 1)],
  );
});

test("C-6690b581: the scan skips harness .l4 folders only, not the owner .l4 files", () => {
  const dir = tempDir();
  const secretLine = "sk-" + "y".repeat(32);

  git(dir, "init");

  for (const name of [
    ".l4/config.yaml",
    ".l4/plans/p1.json",
    "openspec/changes/x/.l4/evidence/round-1/verdict.json",
    "openspec/changes/archive/2026-10-26-x/.l4/ledger/r.jsonl",
  ]) {
    writeFile(dir, name, secretLine + "\n");
    git(dir, "add", name);
  }

  const found = answer(() => scanRepository(dir));
  const violations = answer(() => (found === "THROWN" ? "THROWN" : sortViolations(found)));
  assert.deepEqual(violations, [
    secret("sk_key", ".l4/config.yaml", 1),
    secret("sk_key", ".l4/plans/p1.json", 1),
  ]);

  assert.ok(Array.isArray(violations), `expected a list of violations, got ${String(violations)}`);
  for (const violation of violations) {
    assert.equal(violation.file.startsWith("openspec/"), false, "openspec/changes .l4 evidence must stay skipped");
  }
});

test("C-bb0edd4e: an unavailable git fails the scan loudly", () => {
  const dir = tempDir();

  assert.equal(
    thrownCode(() => listScannableFiles(dir, "git-binary-that-does-not-exist")),
    "ARCH_GIT_UNAVAILABLE",
  );
  assert.equal(
    thrownCode(() => listScannableFiles(dir, process.execPath)),
    "ARCH_GIT_UNAVAILABLE",
  );
});
