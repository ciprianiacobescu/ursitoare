# How RF-1 and its two variants are made

`test/support/catalogue/flows/rf-1-invoice-intake.yaml` is `seed/shared/flows/rf-1-invoice-intake.yaml` with one line changed: `assignee_role: finance-approver` becomes `assignee_role: approver` (the role the engine creates by default). The other two files are made from that file with the unified diffs below (apply with `patch`, or by hand). Tests assert node ids, cases and fields, not the text of `description`.

## rf-1-core.yaml

No approval node and no delegate; only `auto_approve` reaches `pay`; `pay` goes to `done`. Reason: the M9 journeys need a `pay` whose LLM-extracted amount has no approval on its path.

```diff
@@ -1,7 +1,7 @@
 ursitoare: "0.1"
-flow: invoice-intake
+flow: rf-1-core
 version: 1.0.0
-description: Extract an incoming invoice, decide, get approval when needed, pay, and archive through n8n.
+description: Extract an incoming invoice, decide, and pay when it is auto-approved. No approval step and no delegate.
 inputs:
   type: object
   properties:
@@ -65,17 +65,8 @@
     outcomes: [auto_approve, needs_review, reject]
     cases:
       auto_approve: pay
-      needs_review: approval
+      needs_review: notify_rejection
       reject: notify_rejection
-  approval:
-    kind: human.approval
-    assignee_role: approver
-    summary: "Approve payment of ${{ nodes.normalize.output.amount }} ${{ nodes.normalize.output.currency }} to ${{ nodes.extract.output.vendor_name }}?"
-    timeout: PT48H
-    cases:
-      approved: pay
-      rejected: notify_rejection
-      timeout: notify_rejection
   pay:
     kind: block
     uses: erp.create_payment@1
@@ -84,17 +75,7 @@
       amount: "${{ nodes.normalize.output.amount }}"
       currency: "${{ nodes.normalize.output.currency }}"
       reference: "${{ inputs.invoice_id }}"
-    next: archive
-  archive:
-    kind: delegate
-    target: n8n
-    workflow: archive-invoice
-    with:
-      invoice_id: "${{ inputs.invoice_id }}"
-      payment_id: "${{ nodes.pay.output.payment_id }}"
-    callback_timeout: PT1H
     next: done
-    on_timeout: done
   notify_rejection:
     kind: block
     uses: mail.send@1
```

## rf-1-core-approval.yaml

Every route to `pay` goes through `approval` (both `auto_approve` and `needs_review` lead there); no delegate; `pay` goes to `done`. Reason: the M11 journey pays after the approver's decision.

```diff
@@ -1,7 +1,7 @@
 ursitoare: "0.1"
-flow: invoice-intake
+flow: rf-1-core-approval
 version: 1.0.0
-description: Extract an incoming invoice, decide, get approval when needed, pay, and archive through n8n.
+description: Extract an incoming invoice, decide, get approval before every payment, and pay. No delegate.
 inputs:
   type: object
   properties:
@@ -64,7 +64,7 @@
     instructions: Reject blocked vendors. Send large amounts for review. Auto-approve the rest.
     outcomes: [auto_approve, needs_review, reject]
     cases:
-      auto_approve: pay
+      auto_approve: approval
       needs_review: approval
       reject: notify_rejection
   approval:
@@ -84,17 +84,7 @@
       amount: "${{ nodes.normalize.output.amount }}"
       currency: "${{ nodes.normalize.output.currency }}"
       reference: "${{ inputs.invoice_id }}"
-    next: archive
-  archive:
-    kind: delegate
-    target: n8n
-    workflow: archive-invoice
-    with:
-      invoice_id: "${{ inputs.invoice_id }}"
-      payment_id: "${{ nodes.pay.output.payment_id }}"
-    callback_timeout: PT1H
     next: done
-    on_timeout: done
   notify_rejection:
     kind: block
     uses: mail.send@1
```

## Facts a test relies on

After the edits, the node ids are: `rf-1-invoice-intake` `approval, archive, classify, done, extract, fetch_invoice, lookup_vendor, normalize, notify_rejection, pay, rejected`; `rf-1-core` the same without `approval` and `archive`; `rf-1-core-approval` the same without `archive`. The `pay` node uses `erp.create_payment@1` with `amount: "${{ nodes.normalize.output.amount }}"` in all three; `start` is `fetch_invoice`; `ursitoare` is `"0.1"`; `version` is `1.0.0`.
