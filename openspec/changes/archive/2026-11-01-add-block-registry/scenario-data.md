# Scenario data of add-block-registry

The spec's scenarios use these names. Tenants A and B come from `seedTwoTenants(db)`; tenant C (`tenant_c`) is inserted with the owner pool and has no blocks. The fixed clock reads `2026-10-31T09:00:00Z`, so an `importedAt` is `"2026-10-31T09:00:00.000000Z"`. The import actor is `{ kind: "system", id: "operator:e2e-seed" }`. Sessions come from `createTestSession(db, a, "alice", clock)` (tenant B: `"bob"`, tenant C: `"cara"`).

## Blocks, as passed to `importCatalogue` (key order and field order as written)

**I** = `invoices.get@1`:
`{ effect: "read", description: "Fetch an invoice.", input: { type: "object", properties: { invoice_id: { type: "string" } }, required: ["invoice_id"] }, output: { type: "object", properties: { raw_text: { type: "string" }, vendor_name: { type: "string" } } }, untrusted_fields: ["vendor_name", "raw_text"], data_class: "private" }`

**D** = `docs.fetch@1`:
`{ effect: "read", input: { type: "object", properties: { url: { type: "string" } }, required: ["url"] }, output: { type: "object", properties: { content: { type: "string" } } }, untrusted_fields: ["content"], data_class: "public", untrusted_result: true }`

**M** = `mail.send@1`:
`{ effect: "send", description: "Send a mail.", input: { type: "object", properties: { to: { type: "string" } } }, output: { type: "object" }, unsafe_to_retry: true, binding: { server: "mail", tool: "send" } }`

**I2** = I with `description: "Other."` (same ref `invoices.get@1`, other content). **M-B** = M with `description: "Send a mail (tenant B)."`.

**X**, **Y**, **Z**: `{ effect: "pay", description: "X", input: { type: "object" }, output: { type: "object" } }`; Y and Z differ by `description` `"Y"` and `"Z"`; X and Y go to `pay.run@1`, Z to `pay.two@1` and `pay.three@1`.

## Normalised forms (what is stored and what `block(ref)` returns)

Defaults are filled, `untrusted_fields` is sorted by code unit, `description` and `data_class` appear only when given, and `binding` is not part of the definition. **I** becomes `{ effect: "read", description: "Fetch an invoice.", input, output, untrusted_fields: ["raw_text", "vendor_name"], data_class: "private", untrusted_result: false, unsafe_to_retry: false }`; **D** has `untrusted_result: true`, `unsafe_to_retry: false` and no `description`; **M** has `untrusted_fields: []`, `untrusted_result: false`, `unsafe_to_retry: true`, no `data_class`, and its `binding` `{ server: "mail", tool: "send" }` is kept beside the definition.

`contentHash` is derived in each test with `node:crypto` and the audit module's `canonicalize` (design.md Decision 3), never from the code under test.
