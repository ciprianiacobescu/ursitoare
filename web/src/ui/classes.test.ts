import assert from "node:assert/strict";
import { test } from "node:test";

import { buttonClasses } from "./button-classes.ts";
import { cn } from "./cn.ts";
import { findPaletteUtilities } from "./rules.ts";

const words = (value: string): string[] => value.split(" ");

test("C-d69c05cb cn merges by Tailwind rules", () => {
  assert.equal(typeof cn, "function");
  assert.equal(cn("text-sm", "text-text-muted"), "text-sm text-text-muted");
  assert.equal(cn("bg-surface", "bg-accent"), "bg-accent");
  assert.equal(cn("text-accent", "text-danger-text"), "text-danger-text");
  assert.equal(cn("px-3", "px-2", undefined, false, "py-1"), "px-2 py-1");
  assert.equal(cn("min-h-8", "min-h-10"), "min-h-10");
  assert.equal(cn("rounded", "rounded-lg"), "rounded-lg");
  assert.equal(cn("ui-button", "bg-accent"), "ui-button bg-accent");
  assert.equal(cn("text-text-muted", "text-sm"), "text-text-muted text-sm");
  assert.equal(cn("border-border", "border-danger"), "border-danger");
  assert.equal(cn("bg-quiet-surface", "bg-warning-surface"), "bg-warning-surface");
  assert.equal(cn(), "");
  assert.equal(cn("a", ["b", { c: true, d: false }]), "a b c");
});

test("C-d69c05cb buttonClasses has the members of each row", () => {
  assert.equal(typeof buttonClasses, "function");
  const has = (value: string, present: string[], absent: string[]): void => {
    const set = words(value);
    for (const name of present) assert.ok(set.includes(name), `${name} in ${value}`);
    for (const name of absent) assert.ok(!set.includes(name), `no ${name} in ${value}`);
  };
  has(
    buttonClasses(),
    ["ui-button", "border-border", "bg-surface", "text-text", "px-3"],
    ["bg-accent"],
  );
  has(
    buttonClasses({ tone: "primary", size: "sm" }),
    ["bg-accent", "text-on-accent", "border-accent", "min-h-8", "px-2", "text-sm"],
    ["px-3", "bg-surface"],
  );
  has(
    buttonClasses({ tone: "danger", className: "w-full" }),
    ["bg-danger", "text-on-danger", "border-danger", "w-full"],
    ["bg-surface"],
  );
  has(
    buttonClasses({ tone: "ghost" }),
    ["bg-transparent", "text-accent", "border-transparent"],
    [],
  );
  has(buttonClasses({ className: "bg-accent" }), ["bg-accent", "text-text"], ["bg-surface"]);
  has(
    buttonClasses({ size: "sm" }),
    ["bg-surface", "min-h-8", "px-2", "text-sm"],
    ["px-3"],
  );
});

test("C-d69c05cb every tone and size pair keeps the kit class and no palette utility", () => {
  const tones = ["primary", "secondary", "danger", "ghost"] as const;
  const sizes = ["sm", "md"] as const;
  let count = 0;
  for (const tone of tones) {
    for (const size of sizes) {
      const result = buttonClasses({ tone, size });
      const set = words(result);
      assert.ok(set.includes("ui-button"), result);
      assert.ok(set.includes("aria-disabled:cursor-not-allowed"), result);
      assert.deepEqual(findPaletteUtilities(result), []);
      count += 1;
    }
  }
  assert.equal(count, 8);
});
