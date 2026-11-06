// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Flow, JsonValue } from "../../authoring/index.ts";
import type { RunScope } from "../types.ts";
import type { HookPlacement, NodeMeta } from "../../authoring/index.ts";
import type { HookRunner } from "./types.ts";

export const blockHookRunner: HookRunner = {
  async run(_placement, _hctx, _step, _services, _site) {
    throw new Error("not implemented");
  },
};

export function hookMockKey(_nodeId: string, _placement: HookPlacement): string {
  throw new Error("not implemented");
}

export function hookBlockRefs(_flow: Flow): string[] {
  throw new Error("not implemented");
}

export interface HookValues {
  input: JsonValue | null;
  output: JsonValue | null;
  node: NodeMeta;
  next: NodeMeta | null;
  from: NodeMeta | null;
}

export function resolveHookValue(_value: unknown, _scope: RunScope, _hook: HookValues): JsonValue {
  throw new Error("not implemented");
}
