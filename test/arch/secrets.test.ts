// Architecture test of the secret-pattern scan: each kind is detected without echoing it, and look-alikes pass.
import assert from "node:assert/strict";
import { test } from "node:test";

import { scanText } from "./secrets.ts";
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
