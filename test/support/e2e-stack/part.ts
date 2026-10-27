const PART_NAME_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;

export class E2eStackError extends Error {
  code: string;
  details: Readonly<Record<string, string | number | string[]>>;
  constructor(
    code: string,
    message: string,
    details: Record<string, string | number | string[]> = {},
    options?: { cause?: unknown },
  ) {
    super(message, options?.cause === undefined ? undefined : { cause: options.cause });
    this.name = "E2eStackError";
    this.code = code;
    this.details = details;
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

interface PartShape {
  name?: unknown;
  start?: unknown;
  seed?: unknown;
}

function validatePart(part: E2eStackPart): void {
  const candidate = part as unknown as PartShape;
  if (
    typeof candidate.name !== "string" ||
    !PART_NAME_PATTERN.test(candidate.name) ||
    candidate.name === "engine" ||
    typeof candidate.start !== "function" ||
    (candidate.seed !== undefined && typeof candidate.seed !== "function")
  ) {
    throw new E2eStackError("STACK_PART_INVALID", "Invalid part");
  }
}

export function createPartRegistry(): { register(part: E2eStackPart): void; list(): E2eStackPart[] } {
  const parts: E2eStackPart[] = [];

  return {
    register(part: E2eStackPart): void {
      validatePart(part);
      if (parts.some((existing) => existing.name === part.name)) {
        throw new E2eStackError("STACK_PART_DUPLICATE", `Duplicate part: ${part.name}`, {
          name: part.name,
        });
      }
      parts.push(part);
    },
    list(): E2eStackPart[] {
      return [...parts];
    },
  };
}
