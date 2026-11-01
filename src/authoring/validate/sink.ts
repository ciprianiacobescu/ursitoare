import type { Issue, Layer } from "./types.ts";

/** Collects the issues one validation run finds; ordering and de-duplication happen in `validateFlow`. */
export class Sink {
  readonly errors: Issue[] = [];
  readonly warnings: Issue[] = [];

  err(layer: Layer, code: string, node: string | null, path: string, message: string): void {
    this.errors.push({ layer, code, node, path, message });
  }

  warn(layer: Layer, code: string, node: string | null, path: string, message: string): void {
    this.warnings.push({ layer, code, node, path, message });
  }
}
