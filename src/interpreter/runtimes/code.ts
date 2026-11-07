import type { JsonValue } from "../../authoring/index.ts";
import { payloadDigest } from "../../runs/index.ts";
import { DEFAULT_SANDBOX_LIMITS } from "../../sandbox/index.ts";
import type { SandboxLimits, SandboxResult } from "../../sandbox/index.ts";
import { InterpreterError, toInterpreterError } from "../errors.ts";
import { checkSchema } from "../schema.ts";
import type { NodeRuntime, StepContext } from "../types.ts";

export const CODE_LIMITS: Readonly<SandboxLimits> = Object.freeze({
  ...DEFAULT_SANDBOX_LIMITS,
});

export function codeSeed(ctx: StepContext): string {
  return `${ctx.runId}:${ctx.nodeId}:${ctx.attempt}`;
}

function failed(nodeId: string, fault: string): InterpreterError {
  return new InterpreterError(
    "INTERPRETER_CODE_FAILED",
    `code node "${nodeId}" failed (${fault})`,
    nodeId,
    { fault },
  );
}

function safePath(path: string): string {
  if (path.length > 256 || path.includes("\u0000") || !path.isWellFormed()) return "/";
  return path;
}

export const codeRuntime: NodeRuntime = {
  async execute(node, ctx, services) {
    if (node.kind !== "code") {
      throw new Error(`code runtime received kind ${node.kind}`);
    }
    const nodeId = ctx.nodeId;
    const output = await services.ops.runStep<JsonValue>(nodeId, async () => {
      const sandbox = services.sandbox;
      if (sandbox === undefined) {
        throw new InterpreterError(
          "INTERPRETER_NO_SANDBOX",
          `no sandbox is available for code node "${nodeId}"`,
          nodeId,
        );
      }

      let input: JsonValue;
      try {
        input = services.resolve(node.input);
      } catch (error) {
        const copied = toInterpreterError(error);
        if (copied !== null && copied.node === null) {
          throw new InterpreterError(copied.code, copied.message, nodeId, { ...copied.details });
        }
        throw error;
      }

      let result: SandboxResult;
      try {
        result = await sandbox.run(node.source, input, CODE_LIMITS, {
          seed: codeSeed(ctx),
          nowIso: ctx.now.toISOString(),
          binding: "input",
          result: "object",
        });
      } catch {
        throw failed(nodeId, "sandbox_unavailable");
      }
      if (!result.ok) {
        throw failed(nodeId, result.fault.code);
      }
      if (result.value === null) {
        throw failed(nodeId, "output_invalid");
      }

      const checked = checkSchema(node.output_schema, result.value);
      // An unstorable value is reported as such, unless the schema miss sits at a key that
      // cannot be named in a path: that miss is reported at the root instead.
      const pathUsable = checked.ok || safePath(checked.path) === checked.path;
      let storable = true;
      try {
        payloadDigest(result.value);
      } catch {
        storable = false;
      }
      if (!storable && pathUsable) {
        throw new InterpreterError(
          "INTERPRETER_OUTPUT_INVALID",
          `output of "${nodeId}" cannot be stored`,
          nodeId,
          { path: "/", keyword: "payload" },
        );
      }
      if (!checked.ok) {
        throw new InterpreterError(
          "INTERPRETER_OUTPUT_INVALID",
          `output of "${nodeId}" does not match its output_schema`,
          nodeId,
          { path: safePath(checked.path), keyword: checked.keyword },
        );
      }
      return result.value;
    });

    return {
      output,
      outcome: null,
      next: node.next ?? null,
      end: null,
    };
  },
};
