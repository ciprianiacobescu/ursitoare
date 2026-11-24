import { CODE_LIMITS, codeSeed, InterpreterError } from "../../interpreter/index.ts";
import type { ToolResult } from "../../interpreter/index.ts";
import type { WorkerSandbox } from "../../sandbox/index.ts";
import type { CodeRunner } from "./types.ts";

function failed(nodeId: string, fault: string): InterpreterError {
  return new InterpreterError("INTERPRETER_TOOL_FAILED", "node execution failed", nodeId, {
    stage: "code",
    fault,
  });
}

export function createCodeRunner(sandbox: () => WorkerSandbox | null): CodeRunner {
  return async (call, args, ctx): Promise<ToolResult> => {
    const pool = sandbox();
    if (pool === null) {
      throw new InterpreterError(
        "INTERPRETER_NO_SANDBOX",
        `no sandbox is available for tool call of "${ctx.nodeId}"`,
        ctx.nodeId,
        {},
      );
    }

    let result: Awaited<ReturnType<WorkerSandbox["run"]>>;
    try {
      result = await pool.run(call.source, args, CODE_LIMITS, {
        seed: codeSeed(ctx),
        nowIso: ctx.now.toISOString(),
        binding: "input",
        result: "object",
      });
    } catch {
      throw failed(ctx.nodeId, "sandbox_unavailable");
    }

    if (!result.ok) throw failed(ctx.nodeId, result.fault.code);
    if (result.value === null) throw failed(ctx.nodeId, "output_invalid");
    return { output: result.value };
  };
}
