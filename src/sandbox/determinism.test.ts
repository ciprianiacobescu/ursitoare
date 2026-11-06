import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { createWorkerSandbox, seedOf } from "./index.ts";
import type {
  SandboxJson,
  SandboxLimits,
  SandboxOptions,
  SandboxResult,
  WorkerSandbox,
} from "./index.ts";

const LIM: SandboxLimits = {
  timeoutMs: 1000,
  memoryBytes: 33554432,
  maxStackBytes: 262144,
  maxOutputBytes: 1048576,
};

const OPT: SandboxOptions = {
  seed: "r_1:normalize:1",
  nowIso: "2026-10-24T12:00:00.000Z",
  binding: "input",
  result: "object",
};

const NOW = "2026-10-24T12:00:00.000Z";
const LOCAL_NOW = "2026-12-31T23:30:15.250Z";

const CLOCK_RANDOM =
  "const r = [Math.random(), Math.random(), Math.random()]; return { now: Date.now(), iso: new Date().toISOString(), str: String(new Date()), r, id: Math.floor(Math.random() * 1e9).toString(36), shuffled: [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5), plus1h: new Date(Date.now() + 3600000).toISOString(), parts: [new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), new Date().getHours()] };";

const CLOCK_BODY = "return { now: Date.now(), iso: new Date().toISOString(), str: String(new Date()) };";

const CLOCK_EXPECTED: SandboxJson = {
  now: 1792843200000,
  iso: "2026-10-24T12:00:00.000Z",
  str: "Sat Oct 24 2026 12:00:00 GMT+0000 (UTC)",
};

const RANDOM_BODY = "return { v: Array.from({ length: 10 }, () => Math.random()) };";

const TZ_BODY =
  "return { off: new Date().getTimezoneOffset(), h: new Date(2020,5,1,12).getHours(), s: String(new Date(2020,0,1)), p: Date.parse('2020-06-01T12:00:00'), l: String(Date.parse('Jun 1 2020 12:00')), d: new Date(0).getDate() };";

const TZ_EXPECTED: SandboxJson = {
  off: 0,
  h: 12,
  s: "Wed Jan 01 2020 00:00:00 GMT+0000 (UTC)",
  p: 1591012800000,
  l: "NaN",
  d: 1,
};

const LOCAL_BODY =
  'const d = new Date(); const u = ["FullYear", "Month", "Date", "Day", "Hours", "Minutes"]; return { bare: Date(), eq: Date() === new Date().toString(), off: d.getTimezoneOffset(), local: u.map((k) => d["get" + k]()), utc: u.map((k) => d["getUTC" + k]()), ls: d.toLocaleString() };';

const LOCAL_EXPECTED: SandboxJson = {
  bare: "Thu Dec 31 2026 23:30:15 GMT+0000 (UTC)",
  eq: true,
  off: 0,
  local: [2026, 11, 31, 4, 23, 30],
  utc: [2026, 11, 31, 4, 23, 30],
  ls: "2026-12-31 23:30:15",
};

function runWithDefaults(
  sandbox: WorkerSandbox,
  code: string,
  input: SandboxJson,
  limitsPatch: Partial<SandboxLimits> = {},
  optionsPatch: Partial<SandboxOptions> = {},
): Promise<SandboxResult> {
  return sandbox.run(
    code,
    input,
    { ...LIM, ...limitsPatch } as SandboxLimits,
    { ...OPT, ...optionsPatch } as SandboxOptions,
  );
}

function asValue(result: SandboxResult, label: string): SandboxJson | null {
  if (!result.ok) {
    assert.fail(`${label}: expected ok, got fault ${result.fault.code}: ${result.fault.message}`);
  }
  return result.value;
}

function digestOf(value: SandboxJson | null): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function runValue(
  sandbox: WorkerSandbox,
  code: string,
  label: string,
  optionsPatch: Partial<SandboxOptions> = {},
): Promise<SandboxJson | null> {
  const result = await runWithDefaults(sandbox, code, {}, {}, optionsPatch);
  return asValue(result, label);
}

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("C-e1cc2727: one seed and one clock give one digest and a later clock changes it", async () => {
  const sandbox = createWorkerSandbox();
  try {
    const same = new Set<string>();
    for (let i = 0; i < 1000; i += 1) {
      const value = await runValue(sandbox, CLOCK_RANDOM, `CLOCK_RANDOM run ${i + 1}`, {
        seed: "base",
        nowIso: NOW,
      });
      same.add(digestOf(value));
    }
    assert.equal(same.size, 1, "1000 runs with the same seed and clock share one output digest");

    const clocks = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      const nowIso = new Date(Date.parse(NOW) + i * 1000).toISOString();
      const value = await runValue(sandbox, CLOCK_RANDOM, `CLOCK_RANDOM clock ${i + 1}`, {
        seed: "base",
        nowIso,
      });
      clocks.add(digestOf(value));
    }
    assert.equal(clocks.size, 50, "50 clocks a second apart give 50 distinct output digests");
  } finally {
    await sandbox.close();
  }
});

test("C-e1cc2727: distinct seeds give distinct digests and never the base digest", async () => {
  const sandbox = createWorkerSandbox();
  try {
    const first = await runValue(sandbox, CLOCK_RANDOM, "base seed first run", {
      seed: "base",
      nowIso: NOW,
    });
    const second = await runValue(sandbox, CLOCK_RANDOM, "base seed second run", {
      seed: "base",
      nowIso: NOW,
    });
    assert.equal(digestOf(second), digestOf(first), "the base seed is reproducible");
    const baseDigest = digestOf(first);

    const seeds = new Set<string>();
    for (let i = 0; i < 1000; i += 1) {
      const value = await runValue(sandbox, CLOCK_RANDOM, `seed s${i}`, {
        seed: `s${i}`,
        nowIso: NOW,
      });
      seeds.add(digestOf(value));
    }
    assert.equal(seeds.size, 1000, "1000 different seeds give 1000 distinct output digests");
    assert.ok(!seeds.has(baseDigest), "no different seed reproduces the base digest");
  } finally {
    await sandbox.close();
  }
});

test("C-e1cc2727: the clock body gives its expected object for both zone spellings", async () => {
  const sandbox = createWorkerSandbox();
  try {
    for (const nowIso of ["2026-10-24T12:00:00.000Z", "2026-10-24T14:00:00+02:00"]) {
      const value = await runValue(sandbox, CLOCK_BODY, `CLOCK_BODY at ${nowIso}`, {
        nowIso,
      });
      assert.deepEqual(value, CLOCK_EXPECTED, `CLOCK_BODY value at ${nowIso}`);
    }
  } finally {
    await sandbox.close();
  }
});

test("C-e1cc2727: random values follow the seeded mulberry32 reference", async () => {
  const sandbox = createWorkerSandbox();
  try {
    const reference = mulberry32(seedOf("12345"));
    const expected = Array.from({ length: 10 }, () => reference());
    const value = await runValue(sandbox, RANDOM_BODY, "RANDOM_BODY", {
      seed: "12345",
      nowIso: NOW,
    });
    assert.deepEqual(value, { v: expected }, "the first 10 Math.random values match the host reference");
  } finally {
    await sandbox.close();
  }
});

test("C-e1cc2727: local time reads as UTC and matches the local JSON", async () => {
  const sandbox = createWorkerSandbox();
  try {
    const value = await runValue(sandbox, LOCAL_BODY, "LOCAL_BODY", {
      nowIso: LOCAL_NOW,
    });
    assert.deepEqual(value, LOCAL_EXPECTED, "LOCAL_BODY value");
  } finally {
    await sandbox.close();
  }
});

function endOfFirstJson(text: string): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") depth += 1;
    else if (ch === "}" || ch === "]") {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

interface ChildOutput {
  digest: string;
  tz: SandboxJson;
  local: SandboxJson;
}

function parseChildLine(line: string, label: string): ChildOutput {
  const firstSpace = line.indexOf(" ");
  assert.ok(firstSpace > 0, `${label}: the child prints a digest first`);
  const digest = line.slice(0, firstSpace);
  assert.match(digest, /^[0-9a-f]{64}$/, `${label}: the digest is sha256 hex`);
  const rest = line.slice(firstSpace + 1);
  const firstEnd = endOfFirstJson(rest);
  assert.ok(firstEnd > 0, `${label}: the child prints the TZ JSON`);
  const tzText = rest.slice(0, firstEnd);
  const localText = rest.slice(firstEnd + 1);
  return {
    digest,
    tz: JSON.parse(tzText) as SandboxJson,
    local: JSON.parse(localText) as SandboxJson,
  };
}

function childScript(indexUrl: string): string {
  return `
import { createHash } from "node:crypto";
import { createWorkerSandbox } from ${JSON.stringify(indexUrl)};
const LIM = ${JSON.stringify(LIM)};
const OPT = ${JSON.stringify(OPT)};
const CLOCK_RANDOM = ${JSON.stringify(CLOCK_RANDOM)};
const TZ_BODY = ${JSON.stringify(TZ_BODY)};
const LOCAL_BODY = ${JSON.stringify(LOCAL_BODY)};
const NOW = ${JSON.stringify(NOW)};
const sandbox = createWorkerSandbox({ size: 2 });
try {
  const hash = createHash("sha256");
  for (let i = 0; i < 100; i += 1) {
    const result = await sandbox.run(CLOCK_RANDOM, {}, LIM, { ...OPT, seed: "s" + i, nowIso: NOW });
    if (!result.ok) throw new Error("CLOCK_RANDOM failed: " + JSON.stringify(result));
    hash.update(JSON.stringify(result.value));
  }
  const tz = await sandbox.run(TZ_BODY, {}, LIM, { ...OPT, nowIso: NOW });
  const local = await sandbox.run(LOCAL_BODY, {}, LIM, { ...OPT, nowIso: ${JSON.stringify(LOCAL_NOW)} });
  if (!tz.ok || !local.ok) throw new Error("a body failed in the child");
  process.stdout.write(hash.digest("hex") + " " + JSON.stringify(tz.value) + " " + JSON.stringify(local.value) + "\\n");
} finally {
  await sandbox.close();
}
`;
}

test("C-e1cc2727: child processes in three timezones print the same line and JSON", () => {
  const indexUrl = new URL("./index.ts", import.meta.url).href;
  const directory = mkdtempSync(join(tmpdir(), "ursitoare-determinism-"));
  const scriptPath = join(directory, "child.mjs");
  writeFileSync(scriptPath, childScript(indexUrl), "utf8");
  try {
    const lines = ["UTC", "America/Los_Angeles", "Asia/Tokyo"].map((tz) =>
      execFileSync(process.execPath, [scriptPath], {
        env: { ...process.env, TZ: tz },
        encoding: "utf8",
      }).trim(),
    );
    for (const [index, line] of lines.entries()) {
      assert.ok(line.length > 0, `child ${index + 1} printed its line`);
    }
    assert.equal(new Set(lines).size, 1, `the three timezones agree: ${lines.join(" | ")}`);
    for (const [index, line] of lines.entries()) {
      const output = parseChildLine(line, `child ${index + 1}`);
      assert.deepEqual(output.tz, TZ_EXPECTED, `child ${index + 1} TZ_BODY JSON`);
      assert.deepEqual(output.local, LOCAL_EXPECTED, `child ${index + 1} LOCAL_BODY JSON`);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
