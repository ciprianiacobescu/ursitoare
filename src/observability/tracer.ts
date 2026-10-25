// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

export type SpanValue = string | number | boolean;

export interface Span {
  setAttribute(key: string, value: SpanValue): void;
  end(): void;
}

export interface Tracer {
  startSpan(name: string, attrs?: Readonly<Record<string, SpanValue>>): Span;
}

export const noopTracer: Tracer = {
  startSpan(_name: string, _attrs?: Readonly<Record<string, SpanValue>>): Span {
    throw new Error("not implemented");
  },
};
