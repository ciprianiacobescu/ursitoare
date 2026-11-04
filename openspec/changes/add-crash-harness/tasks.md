Spec: `specs/test-crash-harness/spec.md`; decisions: `design.md`; merged shapes: `delivered-shapes.md`. Every test file starts with `assert.equal(typeof <the function it tests>, "function")`; a call into a scaffold stub is wrapped as `p.then((v) => v, (e: unknown) => e)` (an arch test uses `answer()` as `test/arch/owner-endpoint.test.ts` does) and asserted, so red fails by assertion. Test names have no `.`, `[` or `::`. A test that spawns an engine stops it in `finally`; waits poll with a 20 s deadline; scenario modules are `.mjs` files the test writes.

## 1. The fault port

- [x] 1.1 Write `src/config/faults.test.ts` first (scenarios "Armed point, marker, second hit", "A marker that cannot be written" and "Refusals and the null port"), then implement `FaultPoints`, `NO_FAULT_POINTS` and `createFaultPoints` in `src/config/faults.ts` and add their re-export to `src/config/index.ts`, implementing requirements "A fault point fires once, and its marker is written before the kill" and "A bad spec is refused and the null port does nothing"
- [x] 1.2 Write `test/arch/fault-points.test.ts` first (scenario "Rule fixtures, the real tree and the config", the `loadConfig` checks asserted in the same test as `checkFaultPoints`, so none holds at red), then implement `checkFaultPoints` in `test/arch/fault-points.ts` (pure, code `ARCH_FAULT_POINTS`, `collectImports`, `resolveSpecifier`, `sortViolations` and the TypeScript AST), implementing requirement "Production config cannot create or enable fault points"

## 2. Observer and effects

- [x] 2.1 Write `test/support/crash/observer.test.ts` first (scenario "Names, one call each, error passthrough"), then implement `faultObserver` in `test/support/crash/observer.ts`, implementing requirement "The step observer names fault points as phase and step"
- [x] 2.2 Write `test/support/crash/effects.test.ts` first (scenario "A fixed file, the empty file, the bad inputs"), then implement `appendEffect` and `countEffects` in `test/support/crash/effects.ts`, implementing requirement "Effects are counted by idempotency key"

## 3. The cluster

- [x] 3.1 Write `test/support/crash/cluster.test.ts` first (scenarios "Real parts, a value and a throw" (a throw, a returned value, `close()` twice) and "Order, rollback, conflict, missing database"), then implement `CrashCluster`, `startCrashCluster` and `withDedicatedCluster` in `test/support/crash/cluster.ts` and make `test/support/crash/index.ts` re-export `observer.ts`, `effects.ts`, `cluster.ts` and `engine.ts`, implementing requirement "A dedicated cluster starts every part, seeds them, and cleans up"

## 4. The child process

- [x] 4.1 Write `test/support/crash/engine.test.ts` first (scenarios "Ready, environment, arguments, log" and "Option errors and start failures"; a hand-built cluster object; a child the test must end is killed with `process.kill(pid, "SIGKILL")` in `finally`), then implement `SpawnOptions`, `ScenarioContext`, `ScenarioStart`, `READY_TIMEOUT_MS`, `faultMarkerDir`, `spawnEngine` and `spawnEngineTuned` in `test/support/crash/engine.ts` (`kill`, `restart` and `stop` stay stubs until 4.2) and write `test/support/crash/child.ts` as design.md decision 7 says, implementing requirement "A scenario child starts with a closed environment and reports ready"
- [x] 4.2 Write `test/support/crash/engine.control.test.ts` first (scenarios "Kill, restart, stop, deaths", "Restart and stop issued together" and "A restart that fails, then one that works"), then implement `EngineProcess` (`pid` getter, `deaths`, and `kill`, `restart`, `stop` on one promise chain per engine) and the per-`dataDir` registry in `test/support/crash/engine.ts`, called by the close in `test/support/crash/cluster.ts`, implementing requirements "Kill is hard and idempotent, restart brings the child back, stop ends the engine" and "A failed restart leaves the engine dead and the next restart can recover it"

## 5. The counter proof

- [ ] 5.1 Write `test/support/crash/counter.test.ts` first (scenario "Counter with after:two, before:two and no fault"; the test never calls `launchDurable`), then implement `test/support/crash/counter-scenario.ts` (workflow `crash.counter` and `start` as design.md decision 9 says), implementing requirement "A fault point kills the scenario child once and the workflow completes after restart"
