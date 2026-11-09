import { FAKE_TOOLS_HOST, startFakeTools } from "../fake-tools/index.ts";
import type { FakeTools } from "../fake-tools/index.ts";
import { egressApi } from "./egress-part.ts";
import { E2eStackError } from "./part.ts";
import type { E2eStackPart, PartContext, PartHandle } from "./part.ts";

interface ToolsState {
  readonly tools: FakeTools;
  closed: boolean;
}

const states = new WeakMap<PartHandle, ToolsState>();
const startedFor = new WeakMap<object, FakeTools>();

function missing(): E2eStackError {
  return new E2eStackError("STACK_PART_MISSING", "the tools part has not started", {
    part: "tools",
  });
}

async function start(context: PartContext): Promise<PartHandle> {
  const egress = egressApi(context.handles).fake;
  const tools = await startFakeTools();
  try {
    egress.addUpstream(FAKE_TOOLS_HOST, tools.origin);
  } catch (error) {
    await tools.close().catch(() => undefined);
    throw error;
  }

  const state: ToolsState = { tools, closed: false };
  const handle: PartHandle = {
    env: {},
    api: { tools },
    close: async (): Promise<void> => {
      if (state.closed) {
        return;
      }
      state.closed = true;
      await tools.close();
    },
  };
  states.set(handle, state);
  startedFor.set(context.handles, tools);
  return handle;
}

async function beforeReset(context: PartContext): Promise<void> {
  toolsApi(context.handles).tools.reset();
}

export const toolsPart: E2eStackPart = {
  name: "tools",
  start,
  beforeReset,
};

export function toolsApi(handles: ReadonlyMap<string, PartHandle>): { tools: FakeTools } {
  const direct = handles.get("tools");
  const state = direct === undefined ? undefined : states.get(direct);
  if (state !== undefined) {
    return { tools: state.tools };
  }
  const remembered = startedFor.get(handles);
  if (remembered !== undefined) {
    return { tools: remembered };
  }
  throw missing();
}
