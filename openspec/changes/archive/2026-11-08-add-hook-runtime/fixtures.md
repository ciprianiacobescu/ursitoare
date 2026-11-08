# Fixtures of add-hook-runtime

Each block is the complete text of `test/support/hook-runs/flows/<name>.yaml` (task 1.2 writes it verbatim; `flow` is the file name), run on 2026-11-06 through `validateFlowText(text, "yaml", loadTestCatalogue())` on main@3e18238a, Node 24.22.2: `ok` true, no error or warning, `layers_run` `["L1", "L2", "L3"]` (layer `H` is not on main). The first six differ only in `flow` and their hook members, `redirect` and `undeclared` only in the `source` of `to_review`; `review` hangs on the switch because L2 ignores hook routes. A rule hook has no `id` (its label is `rule.<rule id>`). A variant of test-plan.md § Variants replaces the whole `source` scalar, or the one member it names, with the new text as a single-quoted YAML scalar (`'` doubled), so `\u0000` stays a JS escape.

### `onion`

```yaml
ursitoare: "0.1"
flow: onion
version: 1.0.0
inputs: {type: object, properties: {vendor: {type: string}, amount: {type: number}, currency: {type: string}}, required: [vendor, amount, currency]}
start: lookup
nodes:
  lookup: {kind: block, uses: erp.lookup_vendor@1, with: {vendor_name: "${{ inputs.vendor }}"}, next: normalize}
  normalize: {kind: code, language: js, input: {amount: "${{ inputs.amount }}", currency: "${{ inputs.currency }}"}, source: "return { amount: input.amount, currency: input.currency };", output_schema: {type: object, properties: {amount: {type: number}, currency: {type: string}}, required: [amount, currency]}, next: pay}
  pay: {kind: block, uses: erp.create_payment@1, with: {vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ nodes.normalize.output.amount }}", currency: "${{ nodes.normalize.output.currency }}", reference: inv-1}, next: done, pre: [{id: pay_pre_note, kind: code, source: "return;"}], post: [{id: pay_post_note, kind: code, source: "return;"}]}
  done: {kind: end, status: completed, output: {payment_id: "${{ nodes.pay.output.payment_id }}"}}
hooks:
  - {id: rule_a, match: {effect: [pay, send]}, pre: {kind: code, source: "return;"}, post: {kind: code, source: "return;"}}
  - {id: rule_b, match: {kind: [block]}, pre: {kind: code, source: "return;"}, post: {kind: code, source: "return;"}}
```

### `mutate`

```yaml
ursitoare: "0.1"
flow: mutate
version: 1.0.0
inputs: {type: object, properties: {vendor: {type: string}, amount: {type: number}, currency: {type: string}}, required: [vendor, amount, currency]}
start: lookup
nodes:
  lookup: {kind: block, uses: erp.lookup_vendor@1, with: {vendor_name: "${{ inputs.vendor }}"}, next: normalize, pre: [{id: trim_name, kind: code, source: 'return { action: "continue", input: { vendor_name: ctx.input.vendor_name.trim() } };'}]}
  normalize: {kind: code, language: js, input: {amount: "${{ inputs.amount }}", currency: "${{ inputs.currency }}"}, source: "return { amount: input.amount, currency: input.currency };", output_schema: {type: object, properties: {amount: {type: number}, currency: {type: string}}, required: [amount, currency]}, next: pay, post: [{id: upper_currency, kind: code, source: 'return { action: "continue", output: { amount: ctx.output.amount, currency: ctx.output.currency.toUpperCase() } };'}]}
  pay: {kind: block, uses: erp.create_payment@1, with: {vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ nodes.normalize.output.amount }}", currency: "${{ nodes.normalize.output.currency }}", reference: inv-1}, next: done}
  done: {kind: end, status: completed, output: {payment_id: "${{ nodes.pay.output.payment_id }}"}}
```

### `skip-read`

```yaml
ursitoare: "0.1"
flow: skip-read
version: 1.0.0
inputs: {type: object, properties: {vendor: {type: string}, amount: {type: number}, currency: {type: string}}, required: [vendor, amount, currency]}
start: lookup
nodes:
  lookup: {kind: block, uses: erp.lookup_vendor@1, with: {vendor_name: "${{ inputs.vendor }}"}, next: normalize, pre: [{id: cache_hit, kind: code, source: 'return { action: "skip", output: { vendor_id: "v-cached", status: "active" } };'}]}
  normalize: {kind: code, language: js, input: {amount: "${{ inputs.amount }}", currency: "${{ inputs.currency }}"}, source: "return { amount: input.amount, currency: input.currency };", output_schema: {type: object, properties: {amount: {type: number}, currency: {type: string}}, required: [amount, currency]}, next: pay}
  pay: {kind: block, uses: erp.create_payment@1, with: {vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ nodes.normalize.output.amount }}", currency: "${{ nodes.normalize.output.currency }}", reference: inv-1}, next: done}
  done: {kind: end, status: completed, output: {payment_id: "${{ nodes.pay.output.payment_id }}"}}
```

### `skip-pay`

```yaml
ursitoare: "0.1"
flow: skip-pay
version: 1.0.0
inputs: {type: object, properties: {vendor: {type: string}, amount: {type: number}, currency: {type: string}}, required: [vendor, amount, currency]}
start: lookup
nodes:
  lookup: {kind: block, uses: erp.lookup_vendor@1, with: {vendor_name: "${{ inputs.vendor }}"}, next: normalize}
  normalize: {kind: code, language: js, input: {amount: "${{ inputs.amount }}", currency: "${{ inputs.currency }}"}, source: "return { amount: input.amount, currency: input.currency };", output_schema: {type: object, properties: {amount: {type: number}, currency: {type: string}}, required: [amount, currency]}, next: pay}
  pay: {kind: block, uses: erp.create_payment@1, with: {vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ nodes.normalize.output.amount }}", currency: "${{ nodes.normalize.output.currency }}", reference: inv-1}, next: done, pre: [{id: fake_payment, kind: code, source: 'return { action: "skip", output: { payment_id: "fake", status: "paid" } };'}]}
  done: {kind: end, status: completed, output: {payment_id: "${{ nodes.pay.output.payment_id }}"}}
```

### `fail`

```yaml
ursitoare: "0.1"
flow: fail
version: 1.0.0
inputs: {type: object, properties: {vendor: {type: string}, amount: {type: number}, currency: {type: string}}, required: [vendor, amount, currency]}
start: lookup
nodes:
  lookup: {kind: block, uses: erp.lookup_vendor@1, with: {vendor_name: "${{ inputs.vendor }}"}, next: normalize, post: [{id: no_blocked, kind: code, source: 'if (ctx.output.status === "blocked") return { action: "fail", reason: "vendor blocked" };'}]}
  normalize: {kind: code, language: js, input: {amount: "${{ inputs.amount }}", currency: "${{ inputs.currency }}"}, source: "return { amount: input.amount, currency: input.currency };", output_schema: {type: object, properties: {amount: {type: number}, currency: {type: string}}, required: [amount, currency]}, next: pay}
  pay: {kind: block, uses: erp.create_payment@1, with: {vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ nodes.normalize.output.amount }}", currency: "${{ nodes.normalize.output.currency }}", reference: inv-1}, next: done}
  done: {kind: end, status: completed, output: {payment_id: "${{ nodes.pay.output.payment_id }}"}}
```

### `end-pre`

```yaml
ursitoare: "0.1"
flow: end-pre
version: 1.0.0
inputs: {type: object, properties: {vendor: {type: string}, amount: {type: number}, currency: {type: string}}, required: [vendor, amount, currency]}
start: lookup
nodes:
  lookup: {kind: block, uses: erp.lookup_vendor@1, with: {vendor_name: "${{ inputs.vendor }}"}, next: normalize}
  normalize: {kind: code, language: js, input: {amount: "${{ inputs.amount }}", currency: "${{ inputs.currency }}"}, source: "return { amount: input.amount, currency: input.currency };", output_schema: {type: object, properties: {amount: {type: number}, currency: {type: string}}, required: [amount, currency]}, next: pay}
  pay: {kind: block, uses: erp.create_payment@1, with: {vendor_id: "${{ nodes.lookup.output.vendor_id }}", amount: "${{ nodes.normalize.output.amount }}", currency: "${{ nodes.normalize.output.currency }}", reference: inv-1}, next: done}
  done: {kind: end, status: completed, output: {payment_id: "${{ nodes.pay.output.payment_id }}"}, pre: [{id: add_paid, kind: code, source: 'return { action: "continue", input: { payment_id: ctx.input.payment_id, paid: true } };'}]}
```

### `redirect`

```yaml
ursitoare: "0.1"
flow: redirect
version: 1.0.0
inputs: {type: object, properties: {vendor: {type: string}, amount: {type: number}, mode: {type: string}}, required: [vendor, amount, mode]}
start: gate
nodes:
  gate: {kind: switch, on: "${{ inputs.mode }}", cases: {manual: review}, default: classify, post: [{id: saw_default, kind: code, when: {outcome: [default]}, source: "return;"}]}
  classify: {kind: code, language: js, input: {amount: "${{ inputs.amount }}"}, source: "return { risk: input.amount > 1000 ? 'high' : 'low' };", output_schema: {type: object, properties: {risk: {type: string}}, required: [risk]}, next: pay, pre: [{id: pre_look, kind: code, when: {from: {kind: [switch]}}, input: {v: "${{ inputs.vendor }}"}, source: "return;"}], post: [{id: to_review, kind: code, routes: [review], input: {limit: 1000}, source: "if (ctx.output.risk === 'high' && ctx.next.id === 'pay') return { action: 'redirect', to: 'review' };"}, {id: after_redirect, kind: code, when: {next: {nodes: [review]}}, source: "return;"}]}
  pay: {kind: block, uses: erp.create_payment@1, with: {vendor_id: "${{ inputs.vendor }}", amount: "${{ inputs.amount }}", currency: EUR, reference: inv-1}, next: done}
  review: {kind: code, language: js, input: {amount: "${{ inputs.amount }}"}, source: "return { queued: true };", output_schema: {type: object, properties: {queued: {type: boolean}}, required: [queued]}, next: done}
  done: {kind: end, status: completed, output: {finished: true}}
```

### `undeclared`

```yaml
ursitoare: "0.1"
flow: undeclared
version: 1.0.0
inputs: {type: object, properties: {vendor: {type: string}, amount: {type: number}, mode: {type: string}}, required: [vendor, amount, mode]}
start: gate
nodes:
  gate: {kind: switch, on: "${{ inputs.mode }}", cases: {manual: review}, default: classify, post: [{id: saw_default, kind: code, when: {outcome: [default]}, source: "return;"}]}
  classify: {kind: code, language: js, input: {amount: "${{ inputs.amount }}"}, source: "return { risk: input.amount > 1000 ? 'high' : 'low' };", output_schema: {type: object, properties: {risk: {type: string}}, required: [risk]}, next: pay, pre: [{id: pre_look, kind: code, when: {from: {kind: [switch]}}, input: {v: "${{ inputs.vendor }}"}, source: "return;"}], post: [{id: to_review, kind: code, routes: [review], input: {limit: 1000}, source: "return { action: 'redirect', to: 'pay' };"}, {id: after_redirect, kind: code, when: {next: {nodes: [review]}}, source: "return;"}]}
  pay: {kind: block, uses: erp.create_payment@1, with: {vendor_id: "${{ inputs.vendor }}", amount: "${{ inputs.amount }}", currency: EUR, reference: inv-1}, next: done}
  review: {kind: code, language: js, input: {amount: "${{ inputs.amount }}"}, source: "return { queued: true };", output_schema: {type: object, properties: {queued: {type: boolean}}, required: [queued]}, next: done}
  done: {kind: end, status: completed, output: {finished: true}}
```

### `taint-hook`

```yaml
ursitoare: "0.1"
flow: taint-hook
version: 1.0.0
inputs: {type: object, properties: {invoice: {type: string}}, required: [invoice]}
start: fetch
nodes:
  fetch: {kind: block, uses: invoices.get@1, with: {invoice_id: "${{ inputs.invoice }}"}, next: use_id, post: [{id: sanitise, kind: code, input: {note: "${{ nodes.fetch.output.raw_text }}"}, source: "return { action: 'continue', output: { invoice_id: ctx.output.invoice_id, raw_text: 'clean' } };"}]}
  use_id: {kind: code, language: js, input: {id: "${{ nodes.fetch.output.invoice_id }}"}, source: "return { id: input.id };", output_schema: {type: object, properties: {id: {type: string}}, required: [id]}, next: done}
  done: {kind: end, status: completed, pre: [{id: tag, kind: code, input: {note: "${{ nodes.fetch.output.raw_text }}"}, source: "return { action: 'continue', input: { note: ctx.args.note } };"}]}
```
