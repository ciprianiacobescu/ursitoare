import assert from "node:assert/strict";
import { test } from "node:test";

import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
import { loadHookFlow } from "../../../test/support/hook-flows/index.ts";
import type { Flow } from "../format/index.ts";
import { augmentedSuccessors, checkHooks, declaresHooks, hookPlacements } from "./index.ts";

const catalogue = loadTestCatalogue();

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
interface Found {
  errors: { layer: string; code: string; node: string | null; path: string; message: string }[];
  warnings: { layer: string; code: string; node: string | null; path: string; message: string }[];
}

function run(doc: unknown): Found {
  let result: Found = { errors: [], warnings: [] };
  assert.doesNotThrow(() => {
    result = checkHooks(doc, catalogue) as Found;
  });
  return result;
}

function rows(found: Found): string[] {
  return found.errors.map((e) => `${e.code} ${String(e.node)} ${e.path}`);
}

function minimal(): Doc {
  return {
    ursitoare: "0.1",
    start: "lookup",
    nodes: {
      lookup: {
        kind: "block",
        uses: "erp.lookup_vendor@1",
        with: { vendor_name: "x" },
        next: "done",
      },
      done: { kind: "end", status: "completed" },
    },
  };
}

function code(id: string, extra: Doc = {}): Doc {
  return { id, kind: "code", source: "return;", ...extra };
}

function block(id: string, extra: Doc = {}): Doc {
  return {
    id,
    kind: "block",
    uses: "mail.send@1",
    with: { to: "a", subject: "s", body: "b" },
    ...extra,
  };
}

function range(n: number, make: (i: number) => Doc): Doc[] {
  return Array.from({ length: n }, (_, i) => make(i + 1));
}

const L = "/nodes/lookup";
const mutations: { name: string; apply: (d: Doc) => void; expect: string[] }[] = [
  { name: "M1", apply: (d) => (d.nodes.lookup.pre = {}), expect: [`lookup ${L}/pre`] },
  { name: "M2", apply: (d) => (d.nodes.lookup.post = ["x"]), expect: [`lookup ${L}/post/0`] },
  { name: "M3", apply: (d) => (d.hooks = "nope"), expect: ["null /hooks"] },
  {
    name: "M4",
    apply: (d) => (d.nodes.lookup = { kind: "foreach", pre: [code("h")] }),
    expect: [`lookup ${L}/pre`],
  },
  {
    name: "M5",
    apply: (d) => (d.nodes.lookup = { kind: "agent", pre: [code("h")] }),
    expect: [`lookup ${L}/pre`],
  },
  {
    name: "M6",
    apply: (d) => (d.nodes.lookup = { kind: "subflow", pre: [code("h")] }),
    expect: [`lookup ${L}/pre`],
  },
  {
    name: "M7",
    apply: (d) => (d.nodes.lookup = { kind: "human.form", post: [code("h")] }),
    expect: [`lookup ${L}/post`],
  },
  {
    name: "M8",
    apply: (d) => (d.nodes.done.post = [code("h")]),
    expect: ["done /nodes/done/post"],
  },
  {
    name: "M9",
    apply: (d) => (d.nodes.lookup.pre = [code("h", { input: { x: "${{ nodes.lookup }}" } })]),
    expect: [`lookup ${L}/pre/0/input/x`],
  },
  {
    name: "M10",
    apply: (d) =>
      (d.nodes.lookup.pre = [code("h", { input: { x: "${{ hook.input.vendor_name }}" } })]),
    expect: [`lookup ${L}/pre/0/input/x`],
  },
  {
    name: "M11",
    apply: (d) =>
      (d.nodes.lookup.post = [block("h", { input: { x: "${{ hook.output.vendor_id }}" } })]),
    expect: [`lookup ${L}/post/0/input/x`],
  },
  {
    name: "M12",
    apply: (d) =>
      (d.nodes.lookup.post = [
        block("h", { with: { to: "a", subject: "s", body: "${{ item.name }}" } }),
      ]),
    expect: [`lookup ${L}/post/0/with/body`],
  },
  {
    name: "M13",
    apply: (d) => {
      d.nodes.lookup.pre = [code("h")];
      d.nodes.lookup.post = [code("h")];
    },
    expect: [`lookup ${L}/post/0/id`],
  },
  {
    name: "M14",
    apply: (d) => (d.nodes.lookup.pre = [code("Bad-Id")]),
    expect: [`lookup ${L}/pre/0/id`],
  },
  { name: "M15", apply: (d) => (d.nodes.lookup.tags = "x"), expect: [`lookup ${L}/tags`] },
  {
    name: "M16",
    apply: (d) => (d.hooks = [{ id: "Bad", match: {} }]),
    expect: ["null /hooks/0", "null /hooks/0/id"],
  },
  {
    name: "M17",
    apply: (d) =>
      (d.hooks = [
        { id: "r", match: {}, pre: code("r") },
        { id: "r", match: {}, pre: code("r") },
      ]),
    expect: ["null /hooks/1/id"],
  },
  {
    name: "M18",
    apply: (d) => (d.hooks = [{ id: "r", match: {}, pre: code("other") }]),
    expect: ["null /hooks/0/pre/id"],
  },
  {
    name: "M19",
    apply: (d) =>
      (d.hooks = [
        {
          id: "r",
          match: { kind: ["nope"], effect: ["huge"], nodes: ["ghost"], color: ["red"] },
          pre: code("r"),
        },
      ]),
    expect: [
      "null /hooks/0/match/color",
      "null /hooks/0/match/effect/0",
      "null /hooks/0/match/kind/0",
      "null /hooks/0/match/nodes/0",
    ],
  },
  {
    name: "M20",
    apply: (d) => (d.nodes.lookup.pre = [code("h", { when: { next: { kind: ["end"] } } })]),
    expect: [`lookup ${L}/pre/0/when/next`],
  },
  {
    name: "M21",
    apply: (d) => (d.nodes.lookup.post = [code("h", { max_retries: 6 })]),
    expect: [`lookup ${L}/post/0/max_retries`],
  },
  {
    name: "M22",
    apply: (d) =>
      (d.nodes.lookup.post = [code("h", { max_retries: 1, allow_effect_retry: false })]),
    expect: [`lookup ${L}/post/0/allow_effect_retry`],
  },
  {
    name: "M23",
    apply: (d) => (d.nodes.lookup.post = [code("h", { allow_effect_retry: true })]),
    expect: [`lookup ${L}/post/0/allow_effect_retry`],
  },
  {
    name: "M24",
    apply: (d) => (d.nodes.lookup.post = [code("h", { frob: 1, routes: ["nowhere"] })]),
    expect: [`lookup ${L}/post/0/frob`],
  },
  {
    name: "M27",
    apply: (d) => (d.nodes.lookup.pre = [code("a".repeat(65))]),
    expect: [`lookup ${L}/pre/0/id`],
  },
  {
    name: "M28",
    apply: (d) => (d.nodes.lookup.pre = range(17, (i) => code(`h${i}`))),
    expect: [`lookup ${L}/pre`],
  },
  {
    name: "M29",
    apply: (d) => (d.hooks = range(17, (i) => ({ id: `r${i}`, match: {}, pre: code(`r${i}`) }))),
    expect: ["null /hooks"],
  },
  {
    name: "M31",
    apply: (d) => (d.nodes.lookup.pre = [{ id: "h", kind: "code" }]),
    expect: [`lookup ${L}/pre/0`],
  },
  {
    name: "M32",
    apply: (d) =>
      (d.nodes.lookup.post = [{ id: "h", kind: "block", uses: "mail.send@1" }]),
    expect: [`lookup ${L}/post/0`],
  },
  {
    name: "M33",
    apply: (d) => (d.hooks = [{ id: "r", match: {}, pre: code("r"), frob: 1 }]),
    expect: ["null /hooks/0/frob"],
  },
  {
    name: "M34",
    apply: (d) => (d.nodes.lookup.pre = [code("h", { when: { frob: 1 } })]),
    expect: [`lookup ${L}/pre/0/when/frob`],
  },
  {
    name: "M35",
    apply: (d) => (d.nodes.lookup.post = [block("h", { routes: ["done"] })]),
    expect: [`lookup ${L}/post/0/routes`],
  },
  {
    name: "M36",
    apply: (d) => (d.nodes.lookup.pre = [code("h", { on_error: "fail" })]),
    expect: [`lookup ${L}/pre/0/on_error`],
  },
];

for (const m of mutations) {
  test(`C-22c29049: ${m.name} gives exactly its H_SCHEMA rows and no warning`, () => {
    const doc = minimal();
    m.apply(doc);
    const found = run(doc);
    assert.deepEqual(
      rows(found),
      m.expect.map((r) => `H_SCHEMA ${r}`),
    );
    assert.ok(found.errors.every((e) => e.layer === "H"));
    assert.deepEqual(found.warnings, []);
  });
}

test("C-22c29049: M25 M26 and M30 are valid controls beside a malformed M1", () => {
  const d25 = minimal();
  d25.nodes.done.pre = [code("h")];
  const d26 = minimal();
  d26.nodes.lookup.post = [block("h", { with: { to: "a", subject: "s", body: "${{ hook.output.vendor_id }}" } })];
  const d30 = minimal();
  d30.nodes.lookup.pre = [...range(15, (i) => code(`h${i}`)), code("a".repeat(64))];
  for (const d of [d25, d26, d30]) {
    assert.deepEqual(run(d), { errors: [], warnings: [] });
  }
  const bad = minimal();
  bad.nodes.lookup.pre = {};
  assert.equal(run(bad).errors.length, 1);
});

test("C-22c29049: M24 gives one H_SCHEMA and no H_ROUTE_TARGET", () => {
  const doc = minimal();
  doc.nodes.lookup.post = [code("h", { frob: 1, routes: ["nowhere"] })];
  const found = run(doc);
  assert.equal(found.errors.length, 1);
  assert.equal(found.errors[0]?.code, "H_SCHEMA");
  assert.ok(!found.errors.some((e) => e.code === "H_ROUTE_TARGET"));
});

test("C-22c29049: non-flow documents give empty lists while a malformed one does not", () => {
  for (const v of [undefined, null, 5, "x", [], true]) {
    assert.deepEqual(run(v), { errors: [], warnings: [] });
  }
  const doc = minimal();
  doc.nodes.lookup.pre = {};
  assert.equal(run(doc).errors.length, 1);
});

test("C-22c29049: errors come sorted by path then code then message", () => {
  const doc = minimal();
  doc.hooks = [{ id: "Bad", match: {} }];
  doc.nodes.lookup.pre = {};
  const paths = run(doc).errors.map((e) => e.path);
  assert.deepEqual(paths, ["/hooks/0", "/hooks/0/id", "/nodes/lookup/pre"]);
});

// ---- mutation harness (xorshift32, seed 0x2545f491)

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s;
  };
}

type Path = (string | number)[];

function allPaths(value: unknown, prefix: Path, out: Path[]): void {
  if (value === null || typeof value !== "object") return;
  for (const key of Object.keys(value)) {
    const p = [...prefix, Array.isArray(value) ? Number(key) : key];
    out.push(p);
    allPaths((value as Doc)[key], p, out);
  }
}

const replacements: (() => unknown)[] = [
  () => null,
  () => 0,
  () => "",
  () => ({}),
  () => [],
  () => "${{",
  () => "__proto__",
  () => true,
  () => ["a"],
];

function mutate(source: Flow, next: () => number): unknown {
  const doc = structuredClone(source) as unknown as Doc;
  const edits = 1 + (next() % 3);
  for (let e = 0; e < edits; e += 1) {
    const paths: Path[] = [];
    allPaths(doc, [], paths);
    const path = paths[next() % paths.length];
    if (path === undefined) break;
    let parent: Doc = doc;
    for (const seg of path.slice(0, -1)) parent = parent[seg as string] as Doc;
    const last = path[path.length - 1] as string | number;
    if (next() % 4 === 0) {
      if (Array.isArray(parent)) parent.splice(last as number, 1);
      else Reflect.deleteProperty(parent, last as string);
    } else {
      const make = replacements[next() % replacements.length];
      parent[last as string] = make === undefined ? null : make();
    }
  }
  return doc;
}

test("C-0c093690: 1500 seeded mutants never throw and every issue is well formed", () => {
  const next = rng(0x2545f491);
  const codes = new Set([
    "H_SCHEMA",
    "H_BLOCK",
    "H_ROUTE_TARGET",
    "H_ROUTE_HUMAN",
    "H_ROUTE_EFFECT",
    "H_RETRY_SCOPE",
    "H_CYCLE",
    "H_DOMINANCE",
    "W_NO_MATCH",
  ]);
  let issues = 0;
  for (const name of ["s09-onion", "x3-gate-bypass", "s06-next-redirect"]) {
    const source = loadHookFlow(name);
    for (let i = 0; i < 500; i += 1) {
      const mutant = mutate(source, next);
      const found = run(mutant);
      for (const issue of [...found.errors, ...found.warnings]) {
        issues += 1;
        assert.equal(issue.layer, "H");
        assert.ok(codes.has(issue.code), issue.code);
        assert.equal(typeof issue.path, "string");
        assert.ok(issue.node === null || typeof issue.node === "string");
        assert.ok(issue.message.length > 0 && !issue.message.includes("\n"));
      }
      assert.doesNotThrow(() => {
        declaresHooks(mutant);
        const flow = mutant as Flow;
        augmentedSuccessors(flow, catalogue);
        const nodes = (mutant as Doc)["nodes"];
        if (nodes !== null && typeof nodes === "object") {
          for (const id of Object.keys(nodes)) hookPlacements(flow, id, catalogue);
        }
      });
    }
  }
  assert.ok(issues > 0);
});

function chain(): Doc {
  const nodes: Doc = {};
  for (let i = 0; i < 5000; i += 1) {
    nodes[`n${i}`] = {
      kind: "switch",
      on: "${{ inputs.k }}",
      cases: {},
      default: i === 4999 ? "e" : `n${i + 1}`,
    };
  }
  nodes["e"] = { kind: "end", status: "completed" };
  nodes["n0"].post = [{ id: "jump", kind: "code", source: "return;", routes: ["e"] }];
  return { ursitoare: "0.1", start: "n0", nodes };
}

test("C-0c093690: a 5000-node chain with a hook route checks clean and a broken hook is found", () => {
  const doc = chain();
  assert.deepEqual(run(doc), { errors: [], warnings: [] });
  delete doc["nodes"].n0.post[0].source;
  const found = run(doc);
  assert.deepEqual(rows(found), ["H_SCHEMA n0 /nodes/n0/post/0"]);
});
