# Data model and flow of add-effect-intents

`src/db/migrations/0340_effect_intent.sql` holds exactly this SQL (ledger version 340, name `effect_intent`; no `CREATE INDEX CONCURRENTLY`, because `src/db/migrate.ts` runs each file in one transaction):

```sql
CREATE TABLE ursitoare.effect_intent (
  tenant_id text NOT NULL REFERENCES ursitoare.tenant (tenant_id),
  idem_key text NOT NULL CHECK (idem_key ~ '^ik1_[0-9a-f]{64}$'),
  run_id text NOT NULL CHECK (run_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  node_id text NOT NULL CHECK (node_id ~ '^[a-z][a-z0-9_]{0,127}$'),
  tool text NOT NULL CHECK (char_length(tool) BETWEEN 1 AND 256),
  args_digest text NOT NULL CHECK (args_digest ~ '^[0-9a-f]{64}$'),
  mode text NOT NULL CHECK (mode IN ('live', 'mock', 'stub')),
  state text NOT NULL CHECK (state IN ('intent', 'done', 'unknown')),
  result_ref text CHECK (result_ref ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL,
  completed_at timestamptz,
  PRIMARY KEY (tenant_id, idem_key),
  FOREIGN KEY (tenant_id, run_id) REFERENCES ursitoare.run (tenant_id, run_id),
  CHECK ((state = 'done') = (result_ref IS NOT NULL) AND (state = 'done') = (completed_at IS NOT NULL)));
CREATE INDEX effect_intent_run_idx ON ursitoare.effect_intent (tenant_id, run_id);
ALTER TABLE ursitoare.effect_intent ENABLE ROW LEVEL SECURITY;
ALTER TABLE ursitoare.effect_intent FORCE ROW LEVEL SECURITY;
CREATE POLICY effect_intent_isolation ON ursitoare.effect_intent USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
GRANT SELECT, INSERT ON TABLE ursitoare.effect_intent TO ursitoare_app;
GRANT UPDATE (state, result_ref, completed_at) ON TABLE ursitoare.effect_intent TO ursitoare_app;
```

`result_ref` is plain text, as U31's `*_ref` columns (a payload may expire). The table is not partitioned. `state` is `intent` (before the call), `done` (result under `result_ref`) or `unknown` (an unsafe tool may or may not have run).

## `test/support/crash/flows/pay-once.yaml`

The file holds exactly this flow (U33's `pay-once`; `validateFlow` against `loadTestCatalogue()` gives `ok` true):

```yaml
ursitoare: "0.1"
flow: pay-once
version: 1.0.0
inputs:
  type: object
  properties:
    vendor: { type: string }
    invoice: { type: string }
    amount: { type: number }
  required: [vendor, invoice, amount]
start: lookup
nodes:
  lookup:
    kind: block
    uses: erp.lookup_vendor@1
    with:
      vendor_name: "${{ inputs.vendor }}"
    next: route
  route:
    kind: switch
    on: "${{ nodes.lookup.output.status }}"
    cases:
      active: pay
    default: rejected
  pay:
    kind: block
    uses: erp.create_payment@1
    with:
      vendor_id: "${{ nodes.lookup.output.vendor_id }}"
      amount: "${{ inputs.amount }}"
      currency: EUR
      reference: "${{ inputs.invoice }}"
    next: done
  done:
    kind: end
    status: completed
    output:
      payment_id: "${{ nodes.pay.output.payment_id }}"
  rejected:
    kind: end
    status: failed
```
