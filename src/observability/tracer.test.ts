import assert from "node:assert/strict";
import { test } from "node:test";

import { noopTracer } from "./index.ts";
import type { Span, Tracer } from "./index.ts";

test("C-3c17bb81 C-595eb185 noopTracer spans accept attributes and repeated end", () => {
  assert.doesNotThrow(() => {
    const tracer: Tracer = noopTracer;
    const span: Span = tracer.startSpan("http.request", { "http.method": "GET" });

    assert.equal(typeof span.setAttribute, "function");
    assert.equal(typeof span.end, "function");

    span.setAttribute("http.route", "/health");
    span.setAttribute("http.status_code", 200);
    span.end();
    span.end();
  });
});

test("C-3c17bb81 noopTracer starts a span without attributes", () => {
  assert.doesNotThrow(() => {
    const span = noopTracer.startSpan("http.request");

    span.setAttribute("http.method", "GET");
    span.end();
  });
});
