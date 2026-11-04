import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { ConfigError } from "./errors.ts";
import { NO_FAULT_POINTS, createFaultPoints } from "./faults.ts";

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "config-faults-"));
}

function assertConfigError(call: () => unknown, variable: string): void {
  assert.throws(call, (error: unknown) => {
    assert.ok(error instanceof ConfigError);
    assert.equal(error.code, "CONFIG_INVALID");
    assert.equal(error.variable, variable);
    return true;
  });
}

test("C-72547e12: an armed point writes its marker, kills once, and a later hit does nothing", () => {
  assert.doesNotThrow(() => {
    const root = tempDir();
    const markerDir = join(root, "m");
    const listings: string[][] = [];
    const argumentCounts: number[] = [];
    const kill = (...args: unknown[]): void => {
      listings.push(readdirSync(markerDir));
      argumentCounts.push(args.length);
    };
    const points = createFaultPoints({ armed: ["after:pay", "before:mail"], markerDir, kill });

    assert.deepEqual(points.armed, ["after:pay", "before:mail"]);
    assert.ok(Object.isFrozen(points.armed));

    const afterHash = sha256("after:pay");
    const beforeHash = sha256("before:mail");
    const otherHash = sha256("after:other");

    assert.equal(points.hit("after:pay"), undefined);
    assert.equal(points.hit("after:pay"), undefined);
    assert.equal(points.hit("after:other"), undefined);
    assert.equal(points.hit("before:mail"), undefined);

    assert.deepEqual(argumentCounts, [0, 0]);
    assert.deepEqual(listings[0], [afterHash]);
    assert.deepEqual([...(listings[1] ?? [])].sort(), [afterHash, beforeHash].sort());

    assert.equal(readFileSync(join(markerDir, afterHash), "utf8"), "after:pay");

    let secondKills = 0;
    const second = createFaultPoints({
      armed: ["after:pay", "before:mail"],
      markerDir,
      kill: () => {
        secondKills += 1;
      },
    });
    assert.equal(second.hit("after:pay"), undefined);
    assert.equal(second.hit("before:mail"), undefined);

    assert.equal(secondKills, 0);
    const finalListing = readdirSync(markerDir);
    assert.deepEqual([...finalListing].sort(), [afterHash, beforeHash].sort());
    assert.ok(!finalListing.includes(otherHash));
  });
});

test("C-0cfec0bf: a marker that cannot be written throws without killing", () => {
  assert.doesNotThrow(() => {
    const root = tempDir();
    const file = join(root, "f");
    writeFileSync(file, "keep");
    let kills = 0;
    const kill = (): void => {
      kills += 1;
    };

    const atFile = createFaultPoints({ armed: ["after:pay"], markerDir: file, kill });
    assert.throws(() => atFile.hit("after:pay"), { code: "EEXIST" });

    const belowFile = createFaultPoints({ armed: ["after:pay"], markerDir: join(file, "sub"), kill });
    assert.throws(() => belowFile.hit("after:pay"), { code: "ENOTDIR" });

    assert.equal(kills, 0);
    assert.ok(statSync(file).isFile());
    assert.equal(readFileSync(file, "utf8"), "keep");
    assert.deepEqual(readdirSync(root), ["f"]);
  });
});

test("C-cd6a62d5: a bad spec is refused and the null port does nothing", () => {
  assert.doesNotThrow(() => {
    const root = tempDir();
    const kill = (): void => {
      throw new Error("kill must not run");
    };

    const badArmed: readonly (readonly string[])[] = [
      ["pay"],
      ["after:"],
      ["after:../x"],
      ["after:" + "a".repeat(129)],
      "after:pay" as unknown as string[],
    ];
    for (const armed of badArmed) {
      assertConfigError(() => createFaultPoints({ armed, markerDir: root, kill }), "armed");
    }

    for (const markerDir of ["relative/dir", ""]) {
      assertConfigError(() => createFaultPoints({ armed: [], markerDir, kill }), "markerDir");
    }

    assertConfigError(
      () => createFaultPoints({ armed: [], markerDir: root, kill: undefined as unknown as () => void }),
      "kill",
    );

    assert.deepEqual(readdirSync(root), []);

    let emptyKills = 0;
    const empty = createFaultPoints({
      armed: [],
      markerDir: root,
      kill: () => {
        emptyKills += 1;
      },
    });
    assert.equal(empty.hit("after:pay"), undefined);
    assert.equal(empty.hit("before:mail"), undefined);
    assert.equal(emptyKills, 0);
    assert.deepEqual(empty.armed, []);

    assert.ok(Object.isFrozen(NO_FAULT_POINTS));
    assert.ok(Object.isFrozen(NO_FAULT_POINTS.armed));
    assert.deepEqual(NO_FAULT_POINTS.armed, []);
    assert.equal(NO_FAULT_POINTS.hit("after:pay"), undefined);
    assert.equal(NO_FAULT_POINTS.hit(""), undefined);

    assert.deepEqual(readdirSync(root), []);
  });
});
