import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock } from "../core/index.ts";
import { createLogger } from "./logger.ts";
import type { LogDestination } from "./logger.ts";

function capture(): { destination: LogDestination; lines: string[] } {
  const lines: string[] = [];
  return {
    lines,
    destination: {
      write(line: string): void {
        lines.push(line);
      },
    },
  };
}

function parse(line: string | undefined): Record<string, unknown> {
  assert.ok(line !== undefined, "a line was written");
  return JSON.parse(line) as Record<string, unknown>;
}

test("C-d18af48d a warn logger writes one ISO-timed line and drops records below its level", () => {
  assert.doesNotThrow(() => {
    const { destination, lines } = capture();
    const logger = createLogger({
      level: "warn",
      destination,
      clock: fixedClock("2026-10-25T08:50:00.000Z"),
    });

    logger.info("a");
    logger.warn({ user: "alice" }, "b");

    assert.equal(lines.length, 1);
    const record = parse(lines[0]);
    assert.equal(record["time"], "2026-10-25T08:50:00.000Z");
    assert.equal(record["msg"], "b");
    assert.equal(record["user"], "alice");
    assert.equal(record["service"], "ursitoare");
  });
});

test("C-d18af48d a silent logger writes nothing while a warn logger on the same input does", () => {
  assert.doesNotThrow(() => {
    const quiet = capture();
    createLogger({ level: "silent", destination: quiet.destination }).fatal("x");
    const loud = capture();
    createLogger({ level: "warn", destination: loud.destination }).fatal("x");

    assert.equal(quiet.lines.length, 0);
    assert.equal(loud.lines.length, 1);
  });
});

test("C-cc8bd5a6 the listed secret keys are redacted from depth zero to three", () => {
  assert.doesNotThrow(() => {
    const { destination, lines } = capture();
    const logger = createLogger({ level: "info", destination });
    const keys = ["password", "secret", "token", "apiKey", "credential"];
    for (const key of keys) {
      const value = `orig-${key}`;
      logger.info(
        {
          [key]: value,
          a: { [key]: value },
          b: { c: { [key]: value } },
          d: { e: { f: { [key]: value } } },
          user: "alice",
        },
        "m",
      );
    }

    assert.equal(lines.length, keys.length);
    keys.forEach((key, index) => {
      const record = parse(lines[index]) as Record<string, unknown> & {
        a: Record<string, unknown>;
        b: { c: Record<string, unknown> };
        d: { e: { f: Record<string, unknown> } };
      };
      assert.equal(record[key], "[REDACTED]");
      assert.equal(record.a[key], "[REDACTED]");
      assert.equal(record.b.c[key], "[REDACTED]");
      assert.equal(record.d.e.f[key], "[REDACTED]");
      assert.equal(record["user"], "alice");
      assert.ok(!(lines[index] ?? "").includes(`orig-${key}`));
    });
  });
});

test("C-cc8bd5a6 authorization cookie and set-cookie are redacted alone and under headers", () => {
  assert.doesNotThrow(() => {
    const { destination, lines } = capture();
    const logger = createLogger({ level: "info", destination });
    const secrets = { authorization: "orig-auth", cookie: "orig-cookie", "set-cookie": "orig-set" };

    logger.info(
      {
        ...secrets,
        headers: { ...secrets, accept: "text/plain" },
        res: { headers: { ...secrets } },
        other: { headers: { ...secrets } },
        user: "alice",
      },
      "m",
    );

    assert.equal(lines.length, 1);
    const record = parse(lines[0]) as Record<string, unknown> & {
      headers: Record<string, unknown>;
      res: { headers: Record<string, unknown> };
      other: { headers: Record<string, unknown> };
    };
    for (const name of Object.keys(secrets)) {
      assert.equal(record[name], "[REDACTED]");
      assert.equal(record.headers[name], "[REDACTED]");
      assert.equal(record.res.headers[name], "[REDACTED]");
      assert.equal(record.other.headers[name], "[REDACTED]");
    }
    assert.equal(record.headers["accept"], "text/plain");
    assert.equal(record["user"], "alice");
    assert.ok(!(lines[0] ?? "").includes("orig-"));
  });
});

test("C-fc60a608 an error is logged as type, string code and frames only", () => {
  assert.doesNotThrow(() => {
    const { destination, lines } = capture();
    const logger = createLogger({ level: "info", destination });

    logger.error(
      { err: Object.assign(new Error("x\nhunter2"), { detail: "hunter2", code: "23505" }) },
      "failed",
    );

    assert.equal(lines.length, 1);
    const record = parse(lines[0]);
    assert.equal(record["msg"], "failed");
    const err = record["err"] as Record<string, unknown>;
    assert.equal(err["type"], "Error");
    assert.equal(err["code"], "23505");
    assert.equal(typeof err["stack"], "string");
    assert.ok(!("message" in err));
    assert.ok(!("detail" in err));
    assert.ok(!(lines[0] ?? "").includes("hunter2"));
  });
});

test("C-fc60a608 an error without a string code has no code key", () => {
  assert.doesNotThrow(() => {
    const { destination, lines } = capture();
    const logger = createLogger({ level: "info", destination });

    logger.error({ err: Object.assign(new TypeError("boom"), { code: 42 }) }, "failed");

    const err = parse(lines[0])["err"] as Record<string, unknown>;
    assert.equal(err["type"], "TypeError");
    assert.ok(!("code" in err));
    assert.ok(!(lines[0] ?? "").includes("boom"));
  });
});

test("C-fc60a608 a request is logged as method and route pattern, never its URL", () => {
  assert.doesNotThrow(() => {
    const { destination, lines } = capture();
    const logger = createLogger({ level: "info", destination });

    logger.info(
      { req: { method: "GET", url: "/t/tok-Q9z?x=1", routeOptions: { url: "/*" } } },
      "r",
    );

    assert.equal(lines.length, 1);
    assert.deepEqual(parse(lines[0])["req"], { method: "GET", url: "/*" });
    assert.ok(!(lines[0] ?? "").includes("tok-Q9z"));
  });
});

test("C-fc60a608 a request without a route pattern logs url unmatched", () => {
  assert.doesNotThrow(() => {
    const { destination, lines } = capture();
    const logger = createLogger({ level: "info", destination });

    logger.info(
      { req: { method: "GET", url: "/t/tok-Q9z?x=1", routeOptions: { url: undefined } } },
      "r",
    );

    assert.deepEqual(parse(lines[0])["req"], { method: "GET", url: "unmatched" });
    assert.ok(!(lines[0] ?? "").includes("tok-Q9z"));
  });
});
