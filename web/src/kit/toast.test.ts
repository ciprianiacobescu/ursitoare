/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { KitError } from "./errors.ts";
import type { KitClock, ToastSpec } from "./toast.ts";
import {
  createToastQueue,
  dismissToast,
  focusAfterDismiss,
  toast,
  toastQueue,
} from "./toast.ts";

assert.equal(typeof createToastQueue, "function");
assert.equal(typeof focusAfterDismiss, "function");

const NOT_SET = Symbol("not set");

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

function isKitError(code: KitError["code"]): (error: unknown) => boolean {
  return (error: unknown) => error instanceof KitError && error.code === code;
}

function makeClock(iso: string) {
  let current = Date.parse(iso);
  return {
    clock: { now: () => new Date(current) } satisfies KitClock,
    set(nextIso: string): void {
      current = Date.parse(nextIso);
    },
    epochMs(iso: string): number {
      return Date.parse(iso);
    },
  };
}

function ids(queue: ReturnType<typeof createToastQueue>): string[] {
  return call(() => queue.list()).map((item) => item.id);
}

test("C-0b8be44d expiry by the clock", () => {
  const { clock, set, epochMs } = makeClock("2026-10-25T09:00:00Z");
  const queue = call(() => createToastQueue({ clock }));

  assert.equal(call(() => queue.push({ kind: "info", message: "Saved." })), "t1");
  assert.equal(call(() => queue.push({ kind: "error", message: "It failed." })), "t2");
  assert.equal(
    call(() => queue.push({ kind: "success", message: "Done.", durationMs: 1000 })),
    "t3",
  );

  assert.deepEqual(ids(queue), ["t1", "t2", "t3"]);
  assert.equal(call(() => queue.nextExpiry()), epochMs("2026-10-25T09:00:01Z"));

  set("2026-10-25T09:00:01Z");
  assert.deepEqual(call(() => queue.expire()), ["t3"]);

  set("2026-10-25T09:00:06Z");
  assert.deepEqual(call(() => queue.expire()), ["t1"]);
  assert.deepEqual(ids(queue), ["t2"]);
  assert.equal(call(() => queue.nextExpiry()), null);
});

test("C-278586d8 duplicates, limits and invalid specs", () => {
  const { clock, set, epochMs } = makeClock("2026-10-25T09:00:00Z");
  const queue = call(() => createToastQueue({ clock }));

  const firstId = call(() => queue.push({ kind: "info", message: "Saved." }));
  set("2026-10-25T09:00:02Z");
  const duplicateId = call(() => queue.push({ kind: "info", message: "Saved." }));
  assert.equal(duplicateId, firstId);
  const duplicateList = call(() => queue.list());
  assert.equal(duplicateList.length, 1);
  assert.equal(duplicateList[0]?.expiresAt, epochMs("2026-10-25T09:00:08Z"));

  const capped = call(() => createToastQueue({ clock, maxVisible: 5 }));
  for (let index = 1; index <= 7; index += 1) {
    call(() => capped.push({ kind: "info", message: `Message ${index}.` }));
  }
  assert.deepEqual(
    call(() => capped.list()).map((item) => item.message),
    ["Message 3.", "Message 4.", "Message 5.", "Message 6.", "Message 7."],
  );

  const invalidSpecs: ToastSpec[] = [
    { kind: "info", message: "" },
    { kind: "info", message: "x".repeat(301) },
    { kind: "info", message: "Too short a duration.", durationMs: 999 },
    { kind: "info", message: "Too long a duration.", durationMs: 60001 },
    { kind: "warn", message: "Unknown kind." } as unknown as ToastSpec,
  ];
  for (const spec of invalidSpecs) {
    assert.throws(
      () => queue.push(spec),
      isKitError("KIT_TOAST_INVALID"),
      `${JSON.stringify(spec).slice(0, 60)} is rejected`,
    );
  }

  for (const maxVisible of [0, 11]) {
    assert.throws(
      () => createToastQueue({ clock, maxVisible }),
      isKitError("KIT_TOAST_INVALID"),
      `maxVisible ${maxVisible} is rejected`,
    );
  }
});

test("C-c3a242d6 subscribers and stable snapshots", () => {
  const { clock } = makeClock("2026-10-25T09:00:00Z");
  const queue = call(() => createToastQueue({ clock }));

  let secondCalls = 0;
  const unsubscribeFirst = call(() =>
    queue.subscribe(() => {
      throw new Error("this listener fails");
    }),
  );
  const unsubscribeSecond = call(() =>
    queue.subscribe(() => {
      secondCalls += 1;
    }),
  );

  const pushedId = call(() => queue.push({ kind: "info", message: "Saved." }));
  assert.equal(secondCalls, 1, "the second subscriber hears the push");

  assert.equal(call(() => queue.dismiss(pushedId)), true);
  assert.equal(secondCalls, 2, "the second subscriber hears the dismissal");
  assert.equal(call(() => queue.dismiss("nope")), false);
  assert.equal(secondCalls, 2, "a dismissal of an unknown id is not a change");

  const firstRead = call(() => queue.list());
  const secondRead = call(() => queue.list());
  assert.equal(firstRead, secondRead, "an unchanged list returns the same array");

  call(() => unsubscribeSecond());
  call(() => queue.push({ kind: "info", message: "Another." }));
  assert.equal(secondCalls, 2, "an unsubscribed callback is not called again");

  call(() => unsubscribeFirst());
});

test("C-16e957dd focus after a dismissal and the default queue", () => {
  assert.deepEqual(call(() => focusAfterDismiss([], 0)), { kind: "main" });
  assert.deepEqual(call(() => focusAfterDismiss(["t2", "t3"], 0)), {
    kind: "toast",
    id: "t2",
  });
  assert.deepEqual(call(() => focusAfterDismiss(["t1", "t3"], 1)), {
    kind: "toast",
    id: "t3",
  });
  assert.deepEqual(call(() => focusAfterDismiss(["t1", "t2"], 2)), {
    kind: "toast",
    id: "t2",
  });
  assert.deepEqual(call(() => focusAfterDismiss(["t1"], -1)), {
    kind: "toast",
    id: "t1",
  });

  const defaultId = call(() => toast({ kind: "info", message: "Saved." }));
  assert.ok(
    call(() => toastQueue.list()).some((item) => item.id === defaultId),
    "the default queue holds the pushed toast",
  );
  assert.equal(call(() => dismissToast(defaultId)), true);
  assert.ok(
    !call(() => toastQueue.list()).some((item) => item.id === defaultId),
    "dismissToast removes it from the default queue",
  );
});
