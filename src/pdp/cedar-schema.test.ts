import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { ACTION_NAMES, ACTIONS, type ActionName } from "./actions.ts";
import { buildSchema, type ToolArgType } from "./cedar-schema.ts";
import { createPdp, type Pdp } from "./index.ts";
import { PdpError } from "./errors.ts";

function silentLogger() {
  return createLogger({
    level: "silent",
    destination: {
      write(_line: string): void {},
    },
  });
}

function pdp(schema: string): Promise<Pdp | unknown> {
  return createPdp({
    schema,
    policies: [],
    clock: fixedClock("2026-10-25T09:00:00Z"),
    ids: sequentialIds(),
    logger: silentLogger(),
  }).then(
    (v) => v,
    (e: unknown) => e,
  );
}

function rejectionName(r: unknown): string {
  if (r instanceof PdpError) {
    return r.code;
  }
  return r instanceof Error ? r.name : "unknown";
}

test("C-b5a77550 the default schema loads", async () => {
  let schema = "";
  assert.doesNotThrow(() => {
    schema = buildSchema();
  }, "buildSchema()");
  const r = await pdp(schema);
  assert.ok(!(r instanceof Error), `createPdp rejected with ${rejectionName(r)}`);
  assert.deepEqual((r as Pdp).actions, ACTION_NAMES);
});

test("C-7e0c5960 one fragment per action in order", () => {
  let schema = "";
  assert.doesNotThrow(() => {
    schema = buildSchema();
  }, "buildSchema()");
  assert.ok(schema.endsWith("\n"), "the text ends with a newline");
  const lines = schema.split("\n");
  const toolArgsLine = 'type ToolArgs = { "url"?: String, "url_host"?: String };';
  assert.ok(lines.includes(toolArgsLine), `missing the line ${toolArgsLine}`);
  let previousIndex = -1;
  for (const name of ACTION_NAMES as readonly ActionName[]) {
    const fragment = ACTIONS[name].cedar;
    assert.ok(!fragment.includes("\n"), `${name} fragment is one line`);
    const index = lines.indexOf(fragment);
    assert.ok(index !== -1, `missing the fragment line of ${name}`);
    assert.ok(index > previousIndex, `the fragment of ${name} is out of order`);
    previousIndex = index;
  }
});

test("C-faeed384 extra tool arguments", async () => {
  let schema = "";
  assert.doesNotThrow(() => {
    schema = buildSchema({ toolArgs: { tags: "Set<String>", amount: "decimal" } });
  }, "buildSchema(toolArgs)");
  const extendedLine =
    'type ToolArgs = { "amount"?: decimal, "tags"?: Set<String>, "url"?: String, "url_host"?: String };';
  assert.ok(
    schema.split("\n").includes(extendedLine),
    `missing the line ${extendedLine}`,
  );
  const r = await pdp(schema);
  assert.ok(!(r instanceof Error), `createPdp rejected with ${rejectionName(r)}`);
  assert.ok(Array.isArray((r as Pdp).actions));
});

test("C-fb092529 bad tool arguments are refused", () => {
  const manyNames: Record<string, ToolArgType> = {};
  for (let i = 0; i < 257; i += 1) {
    manyNames[`n${i}`] = "String";
  }
  const badOpts: { toolArgs: Readonly<Record<string, ToolArgType>> }[] = [
    { toolArgs: { url_host: "String" } },
    { toolArgs: { url: "String" } },
    { toolArgs: { "Bad-Name": "String" } },
    { toolArgs: { "1a": "String" } },
    { toolArgs: { amount: "Foo" as ToolArgType } },
    { toolArgs: manyNames },
    { toolArgs: null as unknown as Readonly<Record<string, ToolArgType>> },
  ];
  for (const opts of badOpts) {
    assert.throws(
      () => {
        buildSchema(opts);
      },
      (e: unknown) =>
        e instanceof PdpError &&
        e.code === "PDP_OPTIONS_INVALID" &&
        e.details.reason === "tool_args",
      `toolArgs ${JSON.stringify(opts)} is not refused as tool_args`,
    );
  }
});
