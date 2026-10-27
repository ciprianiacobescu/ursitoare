// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type StringMap = Readonly<Record<string, string>>;

export interface ContrastPair {
  id: string;
  fg: string;
  bg: string;
  min: number;
}

export interface ContrastFailure {
  id: string;
  ratio: number;
  min: number;
}

export interface SourceHit {
  line: number;
  text: string;
}

export const CONTRAST_PAIRS: readonly ContrastPair[] = [];

export function parseHexColour(_text: string): [number, number, number] | null {
  throw new Error("not implemented");
}

export function contrastRatio(_foreground: string, _background: string): number {
  throw new Error("not implemented");
}

export function parseTokens(_css: string): StringMap {
  throw new Error("not implemented");
}

export function checkTokenContrast(
  _tokens: StringMap,
  _pairs?: readonly ContrastPair[],
): ContrastFailure[] {
  throw new Error("not implemented");
}

export function findRawColours(_css: string): SourceHit[] {
  throw new Error("not implemented");
}

export function findInlineStyleUse(_source: string): SourceHit[] {
  throw new Error("not implemented");
}
