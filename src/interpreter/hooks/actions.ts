// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { JsonValue } from "../../authoring/index.ts";
import type { HookPlacement, NodeMeta } from "../../authoring/index.ts";
import type { HookActionVerdict, HookOutcome } from "./types.ts";

export function normalizeHookReturn(_value: JsonValue | null, _label: string): HookOutcome {
  throw new Error("not implemented");
}

export function checkHookAction(
  _placement: HookPlacement,
  _outcome: HookOutcome,
  _node: NodeMeta,
): HookActionVerdict {
  throw new Error("not implemented");
}
