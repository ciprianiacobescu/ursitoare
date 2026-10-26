export type SpanValue = string | number | boolean;

export interface Span {
  setAttribute(key: string, value: SpanValue): void;
  end(): void;
}

export interface Tracer {
  startSpan(name: string, attrs?: Readonly<Record<string, SpanValue>>): Span;
}

const noopSpan: Span = {
  setAttribute: () => undefined,
  end: () => undefined,
};

export const noopTracer: Tracer = {
  startSpan(_name: string, _attrs?: Readonly<Record<string, SpanValue>>): Span {
    return noopSpan;
  },
};
