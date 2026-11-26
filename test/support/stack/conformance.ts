// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export interface MainIo {
  stdout(text: string): void;
  stderr(text: string): void;
}

export type Env = Readonly<Record<string, string | undefined>>;

export interface ContainerSnapshot {
  service: string;
  running: boolean;
  memoryBytes: number;
  oomKilled: boolean;
  restartCount: number;
  env: Readonly<Record<string, string>>;
}

export const SNAPSHOT_ENV_KEEP: readonly string[] = [];

export function snapshotOf(_inspect: unknown, _opts?: { keep?: readonly string[] }): ContainerSnapshot[] {
  throw new Error("not implemented");
}

export function readSnapshot(_path: string): ContainerSnapshot[] {
  throw new Error("not implemented");
}

export function exit10Problems(_snap: readonly ContainerSnapshot[]): string[] {
  throw new Error("not implemented");
}

export function limitSummary(_snap: readonly ContainerSnapshot[]): string {
  throw new Error("not implemented");
}

export function exit12EnvProblems(_snap: readonly ContainerSnapshot[]): string[] {
  throw new Error("not implemented");
}

export function restartProblems(
  _before: readonly ContainerSnapshot[],
  _after: readonly ContainerSnapshot[],
  _opts: { exclude: readonly string[] },
): string[] {
  throw new Error("not implemented");
}

export function writeRunFile(_path: string, _text: string): void {
  throw new Error("not implemented");
}

export function runDirectory(_env: Env): string | null {
  throw new Error("not implemented");
}

export async function conformanceMain(
  _argv: readonly string[],
  _io: MainIo,
  _opts?: { env?: Env; stdin?: string },
): Promise<number> {
  throw new Error("not implemented");
}
