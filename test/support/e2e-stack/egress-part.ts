import { promises as fs } from "node:fs";
import path from "node:path";

import { startFakeEgress } from "../fake-egress/index.ts";
import type { FakeEgress } from "../fake-egress/index.ts";
import { E2eStackError } from "./part.ts";
import type { E2eStackPart, PartContext, PartHandle } from "./part.ts";

const BROKER_TOKEN_FILE = "broker-token";
const VAULT_TOKEN_FILE = "vault-token";
const FILE_MODE = 0o600;
const DIRECTORY_MODE = 0o700;

interface EgressState {
  readonly fake: FakeEgress;
  closed: boolean;
}

const states = new WeakMap<PartHandle, EgressState>();
const startedFor = new WeakMap<object, FakeEgress>();

function missing(): E2eStackError {
  return new E2eStackError("STACK_PART_MISSING", "the egress part has not started", {
    part: "egress",
  });
}

async function start(context: PartContext): Promise<PartHandle> {
  const fake = await startFakeEgress();
  try {
    await fs.mkdir(context.dataDir, { recursive: true, mode: DIRECTORY_MODE });
    const brokerTokenFile = path.join(context.dataDir, BROKER_TOKEN_FILE);
    const vaultTokenFile = path.join(context.dataDir, VAULT_TOKEN_FILE);
    await fs.writeFile(brokerTokenFile, fake.brokerServiceToken, { mode: FILE_MODE });
    await fs.writeFile(vaultTokenFile, fake.vaultAdmin.token, { mode: FILE_MODE });
    await fs.chmod(brokerTokenFile, FILE_MODE);
    await fs.chmod(vaultTokenFile, FILE_MODE);

    const state: EgressState = { fake, closed: false };
    const handle: PartHandle = {
      env: {
        URSITOARE_EGRESS_BROKER_URL: fake.brokerUrl,
        URSITOARE_EGRESS_PROXY_URL: fake.proxyUrl,
        URSITOARE_EGRESS_BROKER_TOKEN_FILE: brokerTokenFile,
        URSITOARE_EGRESS_VAULT_URL: fake.vaultUrl,
        URSITOARE_EGRESS_VAULT_IDENTITY: fake.vaultAdmin.identity,
        URSITOARE_EGRESS_VAULT_TOKEN_FILE: vaultTokenFile,
      },
      api: { fake },
      close: async (): Promise<void> => {
        if (state.closed) {
          return;
        }
        state.closed = true;
        await fake.close();
      },
    };
    states.set(handle, state);
    startedFor.set(context.handles, fake);
    return handle;
  } catch (error) {
    await fake.close().catch(() => undefined);
    throw error;
  }
}

async function beforeReset(context: PartContext): Promise<void> {
  egressApi(context.handles).fake.clearRecords();
}

export const egressPart: E2eStackPart = {
  name: "egress",
  start,
  beforeReset,
};

export function egressApi(handles: ReadonlyMap<string, PartHandle>): { fake: FakeEgress } {
  const direct = handles.get("egress");
  const state = direct === undefined ? undefined : states.get(direct);
  if (state !== undefined) {
    return { fake: state.fake };
  }
  const remembered = startedFor.get(handles);
  if (remembered !== undefined) {
    return { fake: remembered };
  }
  throw missing();
}
