import type { JsonValue } from "../../authoring/index.ts";
import type { HookPlacement, NodeMeta } from "../../authoring/index.ts";
import { payloadDigest } from "../../runs/index.ts";
import { InterpreterError } from "../errors.ts";
import type { HookActionVerdict, HookOutcome } from "./types.ts";

const NODE_ID = /^[a-z][a-z0-9_]*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidAction(label: string, key: "reason" | "keyword", cause: string): InterpreterError {
  return new InterpreterError(
    "HOOK_ACTION_INVALID",
    `hook "${label}" returned an invalid action (${cause})`,
    null,
    { hook: label, [key]: cause },
  );
}

function storable(value: unknown, label: string): JsonValue {
  try {
    payloadDigest(value as JsonValue);
  } catch {
    throw invalidAction(label, "keyword", "payload");
  }
  return value as JsonValue;
}

function validReason(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 200 &&
    value.isWellFormed() &&
    !value.includes("\u0000")
  );
}

export function normalizeHookReturn(value: JsonValue | null, label: string): HookOutcome {
  if (value === null) return { action: "continue" };
  if (!isRecord(value)) throw invalidAction(label, "reason", "not_object");
  if (Object.keys(value).length === 0) return { action: "continue" };
  switch (value["action"]) {
    case "continue": {
      const out: HookOutcome = { action: "continue" };
      if (value["input"] !== undefined) out.input = storable(value["input"], label);
      if (value["output"] !== undefined) out.output = storable(value["output"], label);
      return out;
    }
    case "skip": {
      const output = value["output"];
      if (!isRecord(output)) throw invalidAction(label, "reason", "skip_output");
      return { action: "skip", output: storable(output, label) };
    }
    case "redirect": {
      const to = value["to"];
      if (typeof to !== "string" || !NODE_ID.test(to)) {
        throw invalidAction(label, "reason", "redirect_to");
      }
      return { action: "redirect", to };
    }
    case "retry": {
      const out: HookOutcome = { action: "retry" };
      if (value["input"] !== undefined) out.input = storable(value["input"], label);
      if (value["feedback"] !== undefined) out.feedback = storable(value["feedback"], label);
      return out;
    }
    case "fail": {
      const reason = value["reason"];
      if (!validReason(reason)) throw invalidAction(label, "reason", "fail_reason");
      return { action: "fail", reason };
    }
    default:
      throw invalidAction(label, "reason", "unknown_action");
  }
}

const allowed: HookActionVerdict = { allowed: true };

function forbidden(what: string): HookActionVerdict {
  return { allowed: false, code: "HOOK_ACTION_FORBIDDEN", what };
}

const REDIRECT_KINDS = ["block", "code", "switch", "wait"];

export function checkHookAction(
  placement: HookPlacement,
  outcome: HookOutcome,
  node: NodeMeta,
): HookActionVerdict {
  const pre = placement.phase === "pre";
  const hook = placement.hook;
  switch (outcome.action) {
    case "continue":
      if (pre) {
        return outcome.output !== undefined ? forbidden("mutate output in a pre-hook") : allowed;
      }
      if (outcome.input !== undefined) return forbidden("mutate input in a post-hook");
      if (outcome.output !== undefined && node.kind !== "code" && node.kind !== "block") {
        return forbidden("mutate output");
      }
      return allowed;
    case "skip":
      if (!pre) return forbidden("skip in a post-hook");
      return node.kind === "code" || (node.kind === "block" && node.effect === "read")
        ? allowed
        : forbidden("skip");
    case "redirect": {
      if (pre || !REDIRECT_KINDS.includes(node.kind)) return forbidden("redirect");
      const routes = hook.kind === "code" ? (hook.routes ?? []) : [];
      return routes.includes(outcome.to)
        ? allowed
        : { allowed: false, code: "HOOK_ROUTE_UNDECLARED", what: "redirect" };
    }
    case "retry": {
      if (pre) return forbidden("retry");
      if (node.kind === "code") {
        // fall through to the max_retries check
      } else if (node.kind === "block") {
        if (node.effect === "pay") return forbidden("retry");
        if (node.effect !== "read") {
          if (hook.kind !== "code" || hook.allow_effect_retry !== true) return forbidden("retry");
        }
      } else {
        return forbidden("retry");
      }
      if (hook.kind !== "code" || hook.max_retries === undefined) {
        return forbidden("retry (no max_retries)");
      }
      return allowed;
    }
    case "fail":
      return allowed;
  }
}
