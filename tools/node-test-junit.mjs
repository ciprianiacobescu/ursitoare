// Gate tooling (owner file; `tools/**` is a forbidden path for L4 implementers).
//
// A node:test reporter that writes JUnit the way the L4 harness reads it (l4 `gates/junit.py`, v0.4.30):
// - classname is the repository-relative test file with "/" turned into "." plus the describe chain, so ids are
//   unique per file and `path::name` in a task line matches (`src/db/migrate.test.ts::applies in order`);
// - a failure's message is "<ErrorName>: <first line>" and its type is the error name, so L4 can tell an assertion
//   (`AssertionError`) and a red stub (`NotImplementedError`, or an `Error` whose message says "not implemented")
//   from any other error;
// - a test file that fails outside any test (an import error) is a "collection failure" with no classname.
// Node's built-in junit reporter writes type="testCodeFailure" and classname="test" for every case, which L4 reads as
// an unknown failure kind and as colliding ids (docs/decisions/0002-l4-typescript-test-gate.md).
import path from "node:path";
import process from "node:process";

const NOT_IMPLEMENTED = /\bnot[ _-]?implemented\b/i;

function xml(text) {
  return String(text)
    .replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c])
    // eslint-disable-next-line no-control-regex -- XML 1.0 forbids these characters; they are dropped on purpose
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, "");
}

function relative(file) {
  return file ? path.relative(process.cwd(), file).split(path.sep).join("/") : "";
}

function errorOf(details) {
  const error = details?.error;
  const cause = error?.cause ?? error;
  if (cause !== null && typeof cause === "object" && "message" in cause) {
    let name = typeof cause.name === "string" && cause.name ? cause.name : "Error";
    if (name === "Error" && NOT_IMPLEMENTED.test(String(cause.message))) name = "NotImplementedError";
    return { name, message: String(cause.message ?? ""), stack: String(cause.stack ?? cause.message ?? "") };
  }
  const text = String(cause ?? error?.message ?? "failed");
  return { name: "Error", message: text, stack: text };
}

function isFileEvent(data, file) {
  return data.nesting === 0 && (data.name === file || (data.file && path.resolve(data.name) === path.resolve(data.file)));
}

export default async function* nodeTestJunit(source) {
  const cases = [];
  const chains = new Map(); // file -> names by nesting level, from test:start (emitted in definition order)
  const seen = new Map(); // id -> count, so two same-named tests in one scope stay distinct
  for await (const event of source) {
    const data = event.data;
    if (event.type === "test:start") {
      const chain = chains.get(data.file) ?? [];
      chain[data.nesting] = data.name;
      chain.length = data.nesting + 1;
      chains.set(data.file, chain);
      continue;
    }
    if (event.type !== "test:pass" && event.type !== "test:fail") continue;
    const file = relative(data.file);
    if (isFileEvent(data, file)) {
      if (event.type === "test:fail") {
        const e = errorOf(data.details);
        cases.push(`<testcase name="${xml(file)}"><error message="collection failure">${xml(e.stack)}</error></testcase>`);
      }
      continue;
    }
    const failed = event.type === "test:fail";
    const failureType = data.details?.error?.failureType;
    // A suite is reported only when it failed by itself (a throwing describe body or hook), not through its tests.
    if (data.details?.type === "suite" && (!failed || failureType === "subtestsFailed")) continue;
    const suites = (chains.get(data.file) ?? []).slice(0, data.nesting).filter(Boolean);
    const classname = [file.split("/").join("."), ...suites].join(".");
    const key = `${classname}::${data.name}`;
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    const name = count === 1 ? data.name : `${data.name} #${count}`;
    const time = ((data.details?.duration_ms ?? 0) / 1000).toFixed(6);
    let body = "";
    if (data.skip !== undefined || data.todo !== undefined) {
      body = "<skipped/>";
    } else if (failed) {
      const e = errorOf(data.details);
      const first = e.message.split("\n", 1)[0];
      body = `<failure type="${xml(e.name)}" message="${xml(`${e.name}: ${first}`)}">${xml(e.stack)}</failure>`;
    }
    cases.push(`<testcase classname="${xml(classname)}" name="${xml(name)}" time="${time}">${body}</testcase>`);
  }
  yield '<?xml version="1.0" encoding="utf-8"?>\n';
  yield `<testsuites><testsuite name="node-test" tests="${cases.length}">\n${cases.join("\n")}\n</testsuite></testsuites>\n`;
}
