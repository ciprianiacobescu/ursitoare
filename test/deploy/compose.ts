// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export const COMPOSE_PATH: string = "";

export const STACK_SERVICES: readonly string[] = [];

export const ONE_SHOT_SERVICES: readonly string[] = [];

export const STACK_LIMITS: Readonly<Record<string, string>> = {};

export const MINTKEY_DIGESTS: Readonly<Record<string, string>> = {};

export const OWNER_JOB_STEPS: readonly string[] = [];

export function readCompose(_path?: string): unknown {
  throw new Error("not implemented");
}

export function composeProblems(
  _doc: unknown,
  _opts: { realmPlaceholders: readonly string[]; secretFiles: readonly string[] },
): string[] {
  throw new Error("not implemented");
}

export function ownerJobProblems(_script: string): string[] {
  throw new Error("not implemented");
}

export function idpExternalProblems(_base: unknown, _overlay: unknown): string[] {
  throw new Error("not implemented");
}

export function dockerfileProblems(_dockerfile: string, _dockerignore: string): string[] {
  throw new Error("not implemented");
}

export function buildContext(_dockerignore: string, _paths: readonly string[]): string[] {
  throw new Error("not implemented");
}
