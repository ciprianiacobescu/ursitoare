// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export const STACK_PROJECT: string = "";

export const STACK_DIR: string = "";

export const STACK_OUT: string = "";

export const STACK_CONTROL_PORT: number = 0;

export const RESERVED_HOST_PORTS: readonly number[] = [];

export const STACK_STATE_FILES: readonly string[] = [];

export function readOverlay(_path?: string): unknown {
  throw new Error("not implemented");
}

export function mergeCompose(_base: unknown, _overlay: unknown): unknown {
  throw new Error("not implemented");
}

export function overlayProblems(_config: unknown): string[] {
  throw new Error("not implemented");
}

export function stateProblems(
  _present: readonly string[],
  _volumes: readonly string[],
): { firstRun: boolean; lost: string[] } {
  throw new Error("not implemented");
}

export function scriptProblems(_script: string, _steps: Readonly<Record<string, string>>): string[] {
  throw new Error("not implemented");
}

export interface OverlayUser {
  username: string;
  password: string;
  displayName: string;
  tenantName: string;
  organization: "org-a" | "org-b";
  groups: readonly string[];
  capabilities: readonly string[];
}

export const OVERLAY_USERS: readonly Omit<OverlayUser, "password">[] = [];

export function readUsers(_dir: string): Readonly<Record<string, OverlayUser>> {
  throw new Error("not implemented");
}

export function readClients(_dir: string): Readonly<Record<"e2e-mcp-caller" | "e2e-plain-caller", string>> {
  throw new Error("not implemented");
}

export function prepareState(_dir: string, _random?: (n: number) => Uint8Array, _now?: Date): void {
  throw new Error("not implemented");
}

export function projectMain(
  _argv: readonly string[],
  _io: { stdin: string; stdout(text: string): void; stderr(text: string): void },
): number {
  throw new Error("not implemented");
}
