export class RunFailure extends Error {
  code: string;
  node?: string;
  detail?: unknown;
  constructor(code: string, message: string, node?: string, detail?: unknown) {
    super(message);
    this.name = 'RunFailure';
    this.code = code; this.node = node; this.detail = detail;
  }
  toJSON() { return { code: this.code, message: this.message, node: this.node, detail: this.detail }; }
}
