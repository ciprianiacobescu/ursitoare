import assert from "node:assert/strict";
import { test } from "node:test";

import { HealthCheckError, createHealthRegistry } from "./health.ts";
import type { HealthCheck, HealthStatus } from "./health.ts";

test("C-14452135 an empty registry reports ok with no checks", async () => {
  await assert.doesNotReject(async () => {
    const registry = createHealthRegistry();

    const report = await registry.run(2000);

    assert.deepEqual(report, { status: "ok", checks: {}, failures: [] });
  });
});

test("C-14452135 checks that resolve ok are reported by name", async () => {
  await assert.doesNotReject(async () => {
    const registry = createHealthRegistry();
    registry.registerHealthCheck("db", async () => "ok");
    registry.registerHealthCheck("cache", async () => "ok");

    const report = await registry.run(2000);

    assert.deepEqual(report, {
      status: "ok",
      checks: { db: "ok", cache: "ok" },
      failures: [],
    });
  });
});

test("C-609c36a3 a check that resolves fail marks the report failed", async () => {
  await assert.doesNotReject(async () => {
    const registry = createHealthRegistry();
    registry.registerHealthCheck("db", async () => "fail");
    registry.registerHealthCheck("cache", async () => "ok");

    const report = await registry.run(2000);

    assert.equal(report.status, "fail");
    assert.deepEqual(report.checks, { db: "fail", cache: "ok" });
    assert.deepEqual(report.failures, [{ name: "db", reason: "returned_fail" }]);
  });
});

test("C-609c36a3 a check that throws fails without leaking its message", async () => {
  await assert.doesNotReject(async () => {
    const registry = createHealthRegistry();
    registry.registerHealthCheck("db", async () => {
      throw new Error("postgres://u:pw@h/db refused");
    });
    registry.registerHealthCheck("cache", async () => "ok");

    const report = await registry.run(2000);

    assert.equal(report.status, "fail");
    assert.deepEqual(report.checks, { db: "fail", cache: "ok" });
    assert.deepEqual(report.failures, [{ name: "db", reason: "threw" }]);
    assert.ok(!JSON.stringify(report).includes("pw"));
  });
});

test("C-609c36a3 a check that never settles times out after 10 ms", async () => {
  await assert.doesNotReject(async () => {
    const registry = createHealthRegistry();
    const hanging: HealthCheck = () => new Promise<HealthStatus>(() => undefined);
    registry.registerHealthCheck("db", hanging);
    registry.registerHealthCheck("cache", async () => "ok");

    const report = await registry.run(10);

    assert.equal(report.status, "fail");
    assert.deepEqual(report.checks, { db: "fail", cache: "ok" });
    assert.deepEqual(report.failures, [{ name: "db", reason: "timeout" }]);
  });
});

test("C-609c36a3 a check that resolves junk fails as an invalid result", async () => {
  await assert.doesNotReject(async () => {
    const registry = createHealthRegistry();
    const junk = (async () => "maybe") as unknown as HealthCheck;
    registry.registerHealthCheck("db", junk);
    registry.registerHealthCheck("cache", async () => "ok");

    const report = await registry.run(2000);

    assert.equal(report.status, "fail");
    assert.deepEqual(report.checks, { db: "fail", cache: "ok" });
    assert.deepEqual(report.failures, [{ name: "db", reason: "invalid_result" }]);
  });
});

test("C-64e17386 duplicate and invalid names are refused", () => {
  assert.doesNotThrow(() => {
    const registry = createHealthRegistry();
    registry.registerHealthCheck("db", async () => "ok");

    assert.throws(
      () => registry.registerHealthCheck("db", async () => "ok"),
      (error: unknown) => {
        assert.ok(error instanceof HealthCheckError);
        assert.equal(error.code, "HEALTH_CHECK_DUPLICATE");
        return true;
      },
    );

    assert.throws(
      () => registry.registerHealthCheck("DB!", async () => "ok"),
      (error: unknown) => {
        assert.ok(error instanceof HealthCheckError);
        assert.equal(error.code, "HEALTH_CHECK_NAME_INVALID");
        return true;
      },
    );
  });
});

test("C-64e17386 overlapping runs call every check once", async () => {
  await assert.doesNotReject(async () => {
    const registry = createHealthRegistry();
    const calls = { db: 0, cache: 0 };
    let release: (status: HealthStatus) => void = () => undefined;
    const gate = new Promise<HealthStatus>((resolve) => {
      release = resolve;
    });

    registry.registerHealthCheck("db", async () => {
      calls.db += 1;
      return gate;
    });
    registry.registerHealthCheck("cache", async () => {
      calls.cache += 1;
      return gate;
    });

    const first = registry.run(2000);
    const second = registry.run(2000);
    release("ok");
    const [a, b] = await Promise.all([first, second]);

    assert.equal(calls.db, 1);
    assert.equal(calls.cache, 1);
    assert.deepEqual(a, { status: "ok", checks: { db: "ok", cache: "ok" }, failures: [] });
    assert.deepEqual(b, a);
  });
});

test("C-64e17386 a check registered after a run appears in the next run", async () => {
  await assert.doesNotReject(async () => {
    const registry = createHealthRegistry();
    registry.registerHealthCheck("db", async () => "ok");

    const first = await registry.run(2000);
    assert.deepEqual(first.checks, { db: "ok" });

    registry.registerHealthCheck("cache", async () => "ok");
    const second = await registry.run(2000);

    assert.deepEqual(second.checks, { db: "ok", cache: "ok" });
  });
});
