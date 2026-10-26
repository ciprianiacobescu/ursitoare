import assert from "node:assert/strict";
import { test } from "node:test";

import { MODULES } from "./modules.ts";
import { checkGraphIntegrity } from "./rules.ts";
import type { ModuleRule, Violation } from "./sources.ts";

const GRAPH_FILE = "test/arch/modules.ts";

// Runs a call and returns its answer, or a marker when it throws, so a missing behaviour fails on the comparison.
function answer<T>(call: () => T): T | "THROWN" {
  try {
    return call();
  } catch {
    return "THROWN";
  }
}

function ruleOf(modules: Record<string, ModuleRule>, name: string): ModuleRule {
  const rule = modules[name];
  assert.ok(rule !== undefined, `missing module ${name}`);
  return rule;
}

function copyOf(modules: Record<string, ModuleRule>): Record<string, ModuleRule> {
  const copy: Record<string, ModuleRule> = {};
  for (const [name, rule] of Object.entries(modules)) {
    copy[name] = { ...rule, allowed: [...rule.allowed] };
  }
  return copy;
}

function expectGraphViolation(result: Violation[] | "THROWN", needle: string): void {
  assert.ok(Array.isArray(result), `expected a list of violations, got ${String(result)}`);
  assert.ok(
    result.some((v) => v.code === "ARCH_GRAPH_INVALID" && v.message.includes(needle)),
    `expected an ARCH_GRAPH_INVALID violation mentioning ${needle}, got ${JSON.stringify(result)}`,
  );
}

test("C-90199ce0 C-851f3c7c: the graph holds the 30 modules in roadmap order", () => {
  assert.deepEqual(Object.keys(MODULES), [
    "core",
    "config",
    "observability",
    "db",
    "tenancy",
    "audit",
    "identity",
    "pdp",
    "authoring",
    "authority",
    "registry",
    "grants",
    "durable",
    "runs",
    "sandbox",
    "gateway",
    "tools",
    "credentials",
    "llm",
    "interpreter",
    "runtimes",
    "tasks",
    "publish",
    "triggers",
    "assist",
    "eval",
    "mcp",
    "templates",
    "api",
    "cli",
  ]);
  assert.deepEqual(ruleOf(MODULES, "core").allowed, []);
  assert.deepEqual(ruleOf(MODULES, "sandbox").allowed, ["core", "config"]);
  const apiAllowed = ruleOf(MODULES, "api").allowed;
  assert.equal(apiAllowed.length, 26);
  for (const name of ["sandbox", "runtimes", "api", "cli"]) {
    assert.equal(apiAllowed.includes(name), false, `api must not allow ${name}`);
  }
  assert.deepEqual(ruleOf(MODULES, "cli").allowed, apiAllowed);
  assert.equal(ruleOf(MODULES, "observability").egress, "otlp");
  assert.equal(ruleOf(MODULES, "identity").egress, "oidc");
  assert.equal(ruleOf(MODULES, "gateway").egress, "tools");
  for (const [name, rule] of Object.entries(MODULES)) {
    if (name === "observability" || name === "identity" || name === "gateway") continue;
    assert.equal(rule.egress, undefined, `${name} must not carry an egress value`);
  }
  expectGraphViolation(
    answer(() => checkGraphIntegrity({ a: { allowed: ["zzz"] } })),
    "zzz",
  );
});

test("C-70858a5b C-851f3c7c: the graph carries the version 3 edges", () => {
  assert.ok(ruleOf(MODULES, "registry").allowed.includes("identity"), "registry includes identity");
  assert.ok(ruleOf(MODULES, "llm").allowed.includes("tools"), "llm includes tools");
  assert.ok(ruleOf(MODULES, "runtimes").allowed.includes("registry"), "runtimes includes registry");
  assert.ok(ruleOf(MODULES, "runtimes").allowed.includes("grants"), "runtimes includes grants");
  assert.ok(ruleOf(MODULES, "mcp").allowed.includes("publish"), "mcp includes publish");
  assert.ok(ruleOf(MODULES, "triggers").allowed.includes("publish"), "triggers includes publish");
  assert.ok(ruleOf(MODULES, "eval").allowed.includes("durable"), "eval includes durable");
  assert.ok(ruleOf(MODULES, "runs").allowed.includes("durable"), "runs includes durable");
  assert.deepEqual(ruleOf(MODULES, "publish").allowed, [
    "core",
    "db",
    "tenancy",
    "audit",
    "registry",
    "grants",
    "authority",
    "tasks",
    "pdp",
    "runs",
    "durable",
    "identity",
  ]);
  assert.equal(Object.hasOwn(MODULES, "runtime"), false);
  expectGraphViolation(
    answer(() => checkGraphIntegrity({ a: { allowed: ["a"] } })),
    "itself",
  );
});

test("C-65b86cc0 C-851f3c7c: the shipped graph is consistent", () => {
  assert.deepEqual(answer(() => checkGraphIntegrity()), []);
  expectGraphViolation(
    answer(() => checkGraphIntegrity({ a: { allowed: ["b"] }, b: { allowed: ["a"] } })),
    "cycle",
  );
});

test("C-851f3c7c: inconsistent graphs are reported", () => {
  const cases: { modules: Record<string, ModuleRule>; needle: string }[] = [
    { modules: { a: { allowed: ["b"] }, b: { allowed: ["a"] } }, needle: "cycle" },
    { modules: { a: { allowed: ["zzz"] } }, needle: "zzz" },
    { modules: { a: { allowed: ["a"] } }, needle: "itself" },
    { modules: { a: { allowed: ["b", "b"] }, b: { allowed: [] } }, needle: "twice" },
  ];
  for (const { modules, needle } of cases) {
    const result = answer(() => checkGraphIntegrity(modules));
    expectGraphViolation(result, needle);
    assert.ok(Array.isArray(result), `${needle}: expected a list of violations`);
    assert.ok(
      result.every((v) => v.code === "ARCH_GRAPH_INVALID"),
      `${needle}: every violation has code ARCH_GRAPH_INVALID`,
    );
    assert.ok(
      result.every((v) => v.file === GRAPH_FILE && v.line === 1),
      `${needle}: every violation points at ${GRAPH_FILE}:1`,
    );
  }
});

test("C-6923119c: a new egress capability is refused", () => {
  const withDbEgress = copyOf(MODULES);
  withDbEgress.db = { allowed: ruleOf(withDbEgress, "db").allowed, egress: "tools" };
  expectGraphViolation(answer(() => checkGraphIntegrity(withDbEgress)), "db");

  const withoutGatewayEgress = copyOf(MODULES);
  withoutGatewayEgress.gateway = { allowed: ruleOf(withoutGatewayEgress, "gateway").allowed };
  expectGraphViolation(answer(() => checkGraphIntegrity(withoutGatewayEgress)), "gateway");

  const invalidEgress = copyOf(MODULES);
  invalidEgress.db = {
    allowed: ruleOf(invalidEgress, "db").allowed,
    egress: "internet",
  } as unknown as ModuleRule;
  const invalidViolations = answer(() => checkGraphIntegrity(invalidEgress));
  assert.ok(Array.isArray(invalidViolations), `expected a list of violations, got ${String(invalidViolations)}`);
  assert.ok(
    invalidViolations.some((v) => v.code === "ARCH_GRAPH_INVALID"),
    `expected an egress value outside tools, oidc and otlp to be reported, got ${JSON.stringify(invalidViolations)}`,
  );
});
