# 0002 The TypeScript test gate under L4

Date: 2026-10-25. Status: accepted, including the owner's choice in the last section (2026-10-25).

## Context

L4 runs every task as a red step (new tests that fail) and a green step (code that makes them pass). These rules,
read from the L4 v0.4.30 source (v0.4.31 and v0.4.32 change none of them), decide what a TypeScript repository must look like:

1. **Failure kinds come from the JUnit report.** A new red test must fail by assertion or with the stub's
   not-implemented error; any other failure rejects the step. L4 reads the kind from the failure message
   (`AssertionError: ...`) or its `type` attribute. Node's built-in `junit` reporter writes `type="testCodeFailure"`
   and the bare message for every failure, so L4 sees an unknown kind for every test and rejects every red step.
2. **Test ids are `classname::name`.** The built-in reporter writes `classname="test"` for every case, so two files
   with a test of the same name collide. L4 matches `path::name` in a task line by turning the path into a dotted
   module (`src/x.test.ts` becomes `src.x.test.ts`).
3. **Red changes only tests, support files, runner configuration and lockfiles.** Every other changed file that is
   not Python source is put back (a new one is deleted). Red must also keep `lint` and `typecheck` as good as the
   base. A TypeScript red step therefore cannot add the stub its own prompt asks for, and a test that imports a module
   or an export that does not exist yet fails `tsc`.
4. **Green cannot change test or support files.** After green, every support-glob file is reset to its red content
   (new ones are deleted) and every other test-glob path goes back to the base, unless the task is `[test-infra]`.
   L4's default test globs include `**/test/**`, which makes every file under `test/` a test path.
5. **Each criterion needs an assertion failure** (added 2026-10-26, read from v0.4.32 `implementer/tdd.py` and
   `discrimination.no_assertion_failure`). L4 recognises stubs only in Python, so in a TypeScript red step every
   criterion it traces needs at least one new test whose failure kind is `assertion`. A stub's `NotImplementedError`
   does not count, and the step fails as `vacuous`. add-db-foundation's task 1.1 failed seven red attempts this way.

## Decisions

- **Owner reporter.** `tools/node-test-junit.mjs` writes the JUnit L4 reads: `classname` is the file path with dots
  plus the describe chain, a failure is `<ErrorName>: <first line>` with `type=<ErrorName>`, an `Error` whose message
  says "not implemented" is `NotImplementedError`, and a file that fails outside any test is a `collection failure`.
  `test/tooling/node-test-junit.test.ts` pins these shapes (run on Node 24.22.1 and 26.8.1). `tools/**` is forbidden
  to implementers.
- **Test globs without `**/test/**`.** `.l4/config.yaml` lists L4's defaults minus `**/test/**`. Helpers, fakes and
  e2e-stack parts under `test/` are ordinary code: green writes them, and their `*.test.ts` contract tests, which are
  test files, stay frozen. `test/support/**` is no longer a support glob.
- **Frozen test data.** `test/arch/modules.ts` (the module graph) and `test/arch/licence-policy.ts` (licence
  allowlist and exceptions) are support files: a red step or a person changes them, never green.
- **Rules for spec authors and implementers** (also in `AGENTS.md`):
  - A stub throws `new Error("not implemented")`.
  - Each criterion has at least one red test that fails by assertion. A test whose call reaches a stub wraps it in
    `assert.doesNotThrow(() => { ... })` or `await assert.doesNotReject(async () => { ... })`, so the stub's error
    reaches the report as an `AssertionError` (`src/observability/logger.test.ts`).
  - A test name contains no `.`, `[` or `::`, because L4 cuts a name at its last `.`.
  - Every task adds at least one Node test. A task that adds only a browser journey is rejected in red, because the
    red step runs only the test gate.
  - No helper directory is called `fixtures`, `mocks`, `__mocks__`, `testdata` or `helpers`. L4 treats these as
    support paths and deletes new files there after green.
  - Test-support code never reads `L4_*` variables or `.l4-out` paths.
  - A scenario that already holds at the base needs a test that calls a new or stubbed function. L4's zero-value
    check is Python-only, so a TypeScript test that passes at red holds the unit for a person.
  - A test never lets a driver or SQL error escape: node-postgres errors are named `error` (lower case), which L4
    reads as an unknown kind. Assert that the objects exist first, and expect failures with `assert.rejects`.

## How a new TypeScript symbol exists at red (owner choice: scaffold now, L4 fix later)

Rule 3 leaves one gap: the first red test of a new module or export. Either option keeps the specs unchanged, because
every spec names its interfaces with exact signatures in `design.md` § Interfaces.

1. **L4 change (recommended).** Admit a TypeScript signature-only stub in red (a body that only throws
   `new Error("not implemented")`, an interface or type, an exported constant that holds a value of its declared type: an object whose methods throw, or an empty array, object or string, never `undefined`) and let green fill a
   helper module that red added, as L4 already does for Python (L4-IMP-083).
2. **Scaffold per milestone.** Before a milestone's plan is activated, a person commits signature-only stubs for every
   module and export its specs introduce, generated from the specs' Interfaces sections and checked by lint,
   typecheck and test. It works with L4 v0.4.30 as it is, at the cost of one reviewed commit per milestone.

**Owner decision (2026-10-25): scaffold now, L4 fix later.** Each milestone's first commit carries a scaffold: signature-only
stubs for every module and export its specs introduce, generated from `proposal.md` "Interfaces given" and `design.md`
§ Interfaces, with bodies that throw `new Error("not implemented")`. The scaffold passes lint, typecheck, test and build,
changes no existing behaviour, and adds the dependencies the signatures need. An exported constant stub holds a value of
its declared type (an object whose methods throw, or empty data), never `undefined`. The scaffold creates no e2e-stack part
file under `parts/` (a discovered part is never a stub), no test file, no migration, and neither `test/arch/modules.ts`
nor `test/arch/licence-policy.ts`. Each spec's proposal says that the stubs
are on the base branch. When L4 admits TypeScript stubs in red, the scaffold step is dropped.
