import { FAKE_MCP_HOST, startFakeMcp } from "../fake-mcp/index.ts";
import type { FakeMcp } from "../fake-mcp/index.ts";
import { egressApi } from "./egress-part.ts";
import { E2eStackError } from "./part.ts";
import type { E2eStackPart, PartContext, PartHandle } from "./part.ts";

interface McpState {
  readonly mcp: FakeMcp;
  closed: boolean;
}

const states = new WeakMap<PartHandle, McpState>();
const startedFor = new WeakMap<object, FakeMcp>();

function missing(): E2eStackError {
  return new E2eStackError("STACK_PART_MISSING", "the mcp part has not started", {
    part: "mcp",
  });
}

async function start(context: PartContext): Promise<PartHandle> {
  const egress = egressApi(context.handles).fake;
  const mcp = await startFakeMcp({ era: "dual" });
  try {
    egress.addUpstream(FAKE_MCP_HOST, mcp.origin);
  } catch (error) {
    await mcp.close().catch(() => undefined);
    throw error;
  }

  const state: McpState = { mcp, closed: false };
  const handle: PartHandle = {
    env: {},
    api: { mcp },
    close: async (): Promise<void> => {
      if (state.closed) {
        return;
      }
      state.closed = true;
      await mcp.close();
    },
  };
  states.set(handle, state);
  startedFor.set(context.handles, mcp);
  return handle;
}

async function beforeReset(context: PartContext): Promise<void> {
  mcpApi(context.handles).mcp.reset();
}

export const mcpPart: E2eStackPart = {
  name: "mcp",
  start,
  beforeReset,
};

export function mcpApi(handles: ReadonlyMap<string, PartHandle>): { mcp: FakeMcp } {
  const direct = handles.get("mcp");
  const state = direct === undefined ? undefined : states.get(direct);
  if (state !== undefined) {
    return { mcp: state.mcp };
  }
  const remembered = startedFor.get(handles);
  if (remembered !== undefined) {
    return { mcp: remembered };
  }
  throw missing();
}
