// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

export class E2eStackError extends Error {
  code: string;
  details: Readonly<Record<string, string | number | string[]>>;
  constructor(
    _code: string,
    _message: string,
    _details?: Record<string, string | number | string[]>,
    _options?: { cause?: unknown },
  ) {
    super();
    throw new Error("not implemented");
  }
}

export interface PartHandle {
  readonly env: Readonly<Record<string, string>>;
  readonly api?: unknown;
  close(): Promise<void>;
}

export type PartContext = Readonly<{
  name: string;
  dataDir: string;
  engineOrigin: string;
  controlOrigin: string;
  env: Readonly<Record<string, string>>;
  handles: ReadonlyMap<string, PartHandle>;
}>;

export interface E2eStackPart {
  name: string;
  start(ctx: PartContext): Promise<PartHandle>;
  seed?(ctx: PartContext): Promise<void>;
}

export function createPartRegistry(): { register(part: E2eStackPart): void; list(): E2eStackPart[] } {
  throw new Error("not implemented");
}
