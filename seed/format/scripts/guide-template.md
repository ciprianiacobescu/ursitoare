# Writing flows in YAML (format v0)

A flow is a YAML document that describes a business process as a graph of **nodes**. Each node does one thing (call a block, ask an LLM, wait for a person, branch, loop over a list, end the flow) and names the node that runs next. This guide tells you everything you need to write a flow: the document layout, the reference syntax, every node kind, the full catalogue of blocks, and two complete examples.

Write the flow as a single YAML document. Use only the blocks, roles, model profiles, delegate targets and sub-flows listed in the catalogue below; nothing else exists.

## 1. Quick rules

1. The first line of every flow is `ursitoare: "0.1"` (a quoted string). `version` is a semantic version with three numbers, e.g. `"1.0.0"` (`1.0` is not valid).
2. Every node has a `kind`. Every node except `end` says where control goes next (`next`, `cases`, `default`, `on_timeout`), and every id it names must exist.
3. `start` names the first node. Every node must be reachable from `start`. Flows have no loops: control never returns to a node it has already visited.
4. Every path through the flow finishes at an `end` node.
5. Every outcome of an `llm.decide` is mapped to a node; every case of `human.approval` is mapped (`approved`, `rejected`, `timeout`).
6. A reference may only read a value from a node that has **already run on every path** leading to the node that uses it (section 4).
7. A reference must name a field that exists in the producer's output. Arrays cannot be indexed.
8. A value must have the type its parameter expects (section 6).
9. Text written by third parties (emails, web pages, invoices) is marked *untrusted* in the catalogue. Run it through an `llm.extract` node before it reaches any block that writes, sends or pays, or an agent that has such a block as a tool (section 7).
10. Quote every string that contains `${{ ... }}`.

## 2. Document layout

```yaml
ursitoare: "0.1"            # required, exactly this string
flow: invoice-intake        # required, kebab-case id: lowercase letters, digits, single hyphens
version: 1.0.0              # required, semantic version MAJOR.MINOR.PATCH
description: One sentence.  # optional
inputs:                     # required: a JSON Schema describing the flow's inputs; type must be object
  type: object
  properties:
    invoice_id: { type: string }
  required: [invoice_id]
start: fetch_invoice        # required: id of the first node
nodes:                      # required: map of node id -> node
  fetch_invoice: { ... }
```

* Node ids are snake_case: they start with a lowercase letter and contain only lowercase letters, digits and underscores (`fetch_invoice`, `notify_rejection`).
* No other top-level fields are allowed, and nodes accept only the fields listed for their kind.
* `inputs`, `output_schema` and `form_schema` are standard JSON Schema (draft 2020-12). Describe each field with `type`; list mandatory fields in `required`. Fields that are not listed in `required` may be missing at run time, so only rely on them where a missing value is acceptable.

## 3. Values and references

Wherever a node takes a *value* (the `with`, `input`, `items`, `on`, `summary` and `end.output` fields) you can write:

* a **literal**: a string, number, boolean, `null`, list or object;
* a **single reference**: a string that is exactly one `"${{ ref }}"`. It keeps the type of what it points to (a number stays a number, a list stays a list);
* a **template**: a string that mixes text and one or more references, such as `"Invoice ${{ inputs.invoice_id }} rejected"`. A template is always a string, whatever the references point to.

References take exactly these forms:

| Reference | Meaning |
|---|---|
| `inputs.<path>` | a field of the flow's inputs |
| `nodes.<id>.output.<path>` | a field of the output of node `<id>` |
| `nodes.<id>.outcome` | the label chosen by an `llm.decide` node (`llm.decide` only) |
| `item.<path>` or `item` | the current element inside a `foreach` node's `with` (and nowhere else) |

`<path>` is one or more field names joined by dots (`nodes.extract.output.vendor_name`, `inputs.customer.email`). There are no other expressions: no arithmetic, no comparisons, no string functions, no array indexing (`list[0]` and `list.0` do not exist) and no defaults. If you need to compute something, use a `code` node and reference its output.

Rules for references:

* Always quote them: `"${{ inputs.invoice_id }}"`. Unquoted `{` starts a YAML mapping.
* References are only interpreted in value fields. Free-text fields (`instructions`, `goal`, `description`, a code `source`) are plain text; to give an LLM or a code node some data, put it in `input` and mention the input by name in the instructions.
* A path can follow object fields only. To reach inside a list, hand the whole list to a `code` node, or iterate it with `foreach`.
* `item` alone (without a path) is the whole element, for lists of strings or numbers.
* `nodes.<id>.output` must always be followed by a path. `switch`, `wait` and `end` nodes produce no output, so there is nothing to read from them.
* Names in `with`, `input` and `output` maps use letters, digits and underscores and do not start with a digit.

## 4. Order of execution and what you can read

Control starts at `start` and follows the successor fields. A node can read the output of another node only if that node runs **on every path** from `start` to the reading node, and finishes normally. Consequences:

* Read values from nodes that come earlier on the same chain, or before the branch point.
* After a branch (`llm.decide`, `switch`, `human.approval`), a node reachable from several branches cannot read a value produced inside only one of them. If two branches both need a value, produce it **before** the branch.
* A node cannot read its own output or the output of a node that comes later.
* The `timeout` case of `human.approval`, the `on_timeout` successor of `human.form` and the `on_timeout` successor of `delegate` are taken when no answer arrived, so the waiting node has produced **no output** there. Use `inputs` and earlier nodes in those branches.
* The final `end` node can read anything that is available on every path that reaches it.

Example: if `pay` only runs on the approved path, a shared `end` node that also receives the rejected path cannot read `nodes.pay.output.payment_id`. Either give each path its own `end` node, or end only after both paths have produced the value.

## 5. Node kinds

`next`, `cases`, `default` and `on_timeout` hold node ids. Fields marked *required* must be present; no other fields are allowed.

### 5.1 `block`: call a catalogue block

| Field | |
|---|---|
| `uses` | required: `<name>@<major>` of a catalogue block, e.g. `erp.lookup_vendor@1` |
| `with` | required: a map with **exactly** the block's input parameters. Include every required input; do not invent others |
| `next` | the node that runs after |

Output: the block's output (see the catalogue). Example:

```yaml
lookup_vendor:
  kind: block
  uses: erp.lookup_vendor@1
  with:
    vendor_name: "${{ nodes.extract.output.vendor_name }}"
  next: normalize
```

### 5.2 `code`: deterministic JavaScript

| Field | |
|---|---|
| `language` | required: `js` |
| `source` | required: the **body of a function** that receives `input` and must `return` an object |
| `input` | required: a map `name: value`; the function reads `input.name` |
| `output_schema` | required: JSON Schema (`type: object`) of the returned object |
| `next` | the node that runs after |

Output: the object returned, described by `output_schema`. The code runs in a sandbox without network, files, imports, clock or randomness: do not use `fetch`, `require`, `Date`, `Math.random` or timers. Write pure computation (arithmetic, string handling, filtering and reshaping lists). The returned object must contain every field marked required in `output_schema`.

```yaml
normalize:
  kind: code
  language: js
  input:
    amount: "${{ nodes.extract.output.amount }}"
  source: |
    return { amount: Math.round(input.amount * 100) / 100, is_large: input.amount > 1000 };
  output_schema:
    type: object
    properties:
      amount: { type: number }
      is_large: { type: boolean }
    required: [amount, is_large]
  next: classify
```

### 5.3 `llm.extract`: pull structured data out of text

| Field | |
|---|---|
| `input` | required: map `name: value`, the data the model reads |
| `instructions` | required: plain-text instructions |
| `output_schema` | required: JSON Schema (`type: object`) of the result |
| `model_profile` | optional, one of the catalogue profiles (default `default`) |
| `next` | the node that runs after |

Output: an object matching `output_schema`. The model has no tools. This is the node to use when third-party text must be turned into trusted, structured fields (section 7).

### 5.4 `llm.generate`: write new text

Same fields as `llm.extract` (`input`, `instructions`, `output_schema`, optional `model_profile`, `next`). Output: an object matching `output_schema`. The model has no tools. Use it to draft messages, summaries and replies from clean data. If its input includes untrusted content, its output is still treated as untrusted.

### 5.5 `llm.decide`: choose one of several labelled outcomes

| Field | |
|---|---|
| `input` | required: map `name: value` |
| `instructions` | required: plain text explaining how to choose |
| `outcomes` | required: list of at least two distinct labels (strings) |
| `cases` | required: map `outcome label -> node id`. **Every outcome must be mapped, and no other keys are allowed.** Several outcomes may lead to the same node |
| `model_profile` | optional |

There is no `next`: control continues at the node mapped to the chosen outcome. Output: `{outcome, rationale}`, both strings. Read the label with `nodes.<id>.outcome` (or `nodes.<id>.output.outcome`), the explanation with `nodes.<id>.output.rationale`. Use exactly the outcome labels you are asked for. Because the label can only be one of the declared outcomes, it can be passed on to a parameter that accepts those values.

```yaml
classify:
  kind: llm.decide
  input:
    amount: "${{ nodes.normalize.output.amount }}"
  instructions: Reject blocked vendors. Send large amounts for review. Auto-approve the rest.
  outcomes: [auto_approve, needs_review, reject]
  cases:
    auto_approve: pay
    needs_review: approval
    reject: notify_rejection
```

### 5.6 `agent`: an LLM that may call a fixed set of blocks

| Field | |
|---|---|
| `input` | required: map `name: value` |
| `goal` | required: plain-text goal |
| `tools` | required: allowlist of at least one `<name>@<major>` catalogue block. The agent can call only these |
| `max_steps` | required: integer from 1 to 50, the most tool calls and reasoning steps the agent may take |
| `output_schema` | required: JSON Schema (`type: object`) of the result |
| `model_profile` | optional |
| `next` | the node that runs after |

Output: an object matching `output_schema`. Prefer a deterministic chain of nodes; use an agent only when the number or order of tool calls cannot be known in advance. Give the agent the smallest toolset that can do the job.

### 5.7 `switch`: branch on a value

| Field | |
|---|---|
| `on` | required: a single reference (`"${{ ... }}"`) to a string, number, integer or boolean |
| `cases` | required: map `literal -> node id` |
| `default` | required: node id used when no case matches |

No `next`, no output. Case keys are written as strings. For a boolean, the keys are `"true"` and `"false"`. For an integer or number, the keys are the numeric literals (`"1"`, `"-5"`, `"2.5"`). If the value can only be one of a known set (an `enum`, or the outcome of an `llm.decide`), every key must be one of the possible values.

```yaml
route:
  kind: switch
  on: "${{ nodes.prioritize.outcome }}"
  cases:
    urgent: alert_slack
  default: done
```

### 5.8 `human.approval`: ask a person to approve or reject

| Field | |
|---|---|
| `assignee_role` | required: a catalogue role |
| `summary` | required: a template string shown to the approver |
| `timeout` | required: ISO-8601 duration, e.g. `PT48H`, `P2D`, `PT30M` |
| `cases` | required: exactly the three keys `approved`, `rejected`, `timeout`, each mapped to a node id |

Output on the `approved` and `rejected` branches: `{decision, approver, comment}`, all strings. On the `timeout` branch there is no output.

### 5.9 `human.form`: collect data from a person

| Field | |
|---|---|
| `assignee_role` | required: a catalogue role |
| `form_schema` | required: JSON Schema (`type: object`) of the data to collect |
| `timeout` | required: ISO-8601 duration |
| `next` | the node that runs when the form is submitted |
| `on_timeout` | the node that runs when it is not |

Both `next` and `on_timeout` are needed. Output (on `next` only): the submitted data, described by `form_schema`.

### 5.10 `foreach`: apply a block or sub-flow to every element of a list

| Field | |
|---|---|
| `items` | required: a single reference to a list |
| `uses` + `with` | a catalogue block and its input map, **or** |
| `subflow` + `with` | a sub-flow `<name>@<major>` from the registry and its input map. Give exactly one of `uses` or `subflow` |
| `max_parallel` | optional integer, at least 1 (default 1) |
| `next` | the node that runs after the loop |

Inside `with`, `item.<field>` is the current element (`item` alone for plain values). Output: `{results: [...]}`, a list with one result per element, each shaped like the block's (or sub-flow's) output. Reference the whole list as `nodes.<id>.output.results`; it cannot be indexed, so pass it to a `code` node or an `llm.*` node to work with its contents. A `foreach` runs one block or sub-flow per element; it cannot contain LLM nodes, branches or other loops. To run an LLM step over many elements, hand the whole list to an `llm.extract` node instead.

```yaml
lookup_senders:
  kind: foreach
  items: "${{ nodes.read_inbox.output.messages }}"
  uses: crm.find_customer@1
  with:
    email: "${{ item.from }}"
  max_parallel: 4
  next: summarize
```

### 5.11 `subflow`: run another flow from the registry

| Field | |
|---|---|
| `flow` | required: `<name>@<major>` from the flows registry |
| `with` | required: a map with exactly the sub-flow's input parameters |
| `next` | the node that runs after |

Output: the sub-flow's declared outputs.

### 5.12 `delegate`: hand work to an external automation and wait for its callback

| Field | |
|---|---|
| `target` | required: a delegate target from the catalogue (`n8n`) |
| `workflow` | required: one of that target's workflows |
| `with` | required: a map of named values passed to the workflow (any names) |
| `callback_timeout` | required: ISO-8601 duration to wait for the callback |
| `next` | the node that runs when the callback arrives |
| `on_timeout` | the node that runs when it does not |

Both `next` and `on_timeout` are needed. Output (on `next` only): `{correlation_id: string, result: object}`. The fields inside `result` are not described, so `result` can only be passed on as a whole.

### 5.13 `wait`: pause for a fixed time

| Field | |
|---|---|
| `duration` | required: ISO-8601 duration |
| `next` | the node that runs after |

No output.

### 5.14 `end`: finish the flow

| Field | |
|---|---|
| `status` | required: `completed` or `failed` |
| `output` | optional: map `name: value` returned to the caller |

An `end` node has no successor and no other fields. A flow can have several `end` nodes (for example one for the happy path and one for a rejection). Use `failed` when the process did not achieve its purpose because of an error, and `completed` when it reached a legitimate conclusion, including a business rejection.

## 6. Types

* Types are JSON types: `string`, `number`, `integer`, `boolean`, `array`, `object`, `null`. An `integer` can be used where a `number` is expected, not the other way round.
* A single reference keeps its type. A parameter that expects a number needs a number: `amount: "${{ nodes.normalize.output.amount }}"`. If the reference points to a string, use a `code` node to convert it.
* A template is always a string, so it can only fill a text parameter; it cannot fill a number, integer, boolean, list or object parameter. A single reference to a number does not fit a text parameter either: write a template with surrounding text (`"Amount: ${{ nodes.normalize.output.amount }}"`) or convert the value in a `code` node (`String(input.amount)`).
* Literals must match too: `max: 5` (not `"5"`) for an integer, `values: ["a", "b"]` for a list of strings.
* Some parameters accept only fixed values (an `enum`, such as the ticket `priority`: `low`, `normal`, `high`, `urgent`). A literal must be one of them. When the source of a reference also has a fixed set of values (an `enum`, or the outcome labels of an `llm.decide`), every value it can take must be allowed by the parameter; an order `status` (`placed`, `shipped`, ...) cannot feed a ticket `status` (`open`, `pending`, ...).
* `foreach.items` must point to a list.

## 7. Untrusted content

Some block outputs carry text written by third parties: the body of an email, the text of a web page, the contents of an invoice. The catalogue marks those output fields **untrusted**. Treat them as follows.

* Never put an untrusted field (alone or inside a template, or inside an object or list literal) into a parameter of a block whose effect is `write`, `send` or `pay`. This includes blocks run by a `foreach`.
* Never give untrusted data in the `input` of an `agent` whose `tools` include a `write`, `send` or `pay` block.
* Instead, send the untrusted field to an `llm.extract` node (its `input`), with an `output_schema` that holds only the fields you need, and use the **extract node's output** downstream. The output of a `code` node is treated the same way.
* The output of `llm.generate` (and the `rationale` of `llm.decide`) is untrusted whenever the node received untrusted input. If you want to send a generated message, feed the generator from extracted fields, not from the raw text. The `outcome` of an `llm.decide` is always safe to use.
* Untrusted fields may freely feed read blocks, `llm.*` inputs, `code` inputs, `switch`, `foreach.items`, and the `summary` of a human approval.
* Avoid passing untrusted content to a `subflow` or `delegate`; extract first.

The same rule applies to every field of `untrusted_fields` listed in the catalogue, including list fields: `mail.read_inbox@1` marks `messages` as untrusted, so each `item.*` inside a `foreach` over `messages` is untrusted too.

## 8. Catalogue

Effects: **read** has no side effects; **write** changes internal data; **send** sends something outside; **pay** moves money. `write`, `send` and `pay` are *consequential*. Inputs marked `required` must appear in `with`; the other inputs are optional. Output fields marked `required` are always present; the others may be missing. Fields marked **untrusted** carry third-party content (section 7).

<!--CATALOGUE-->

## 9. Style

* Name nodes after what they do (`fetch_invoice`, `notify_rejection`), in snake_case.
* Use the exact outcome labels, roles, channels, addresses and literals given in the request, spelled the same way.
* Keep `instructions` short and concrete. Mention the input names the model will see. Do not paste references into instructions.
* Prefer deterministic nodes (`block`, `code`, `switch`) for anything that does not need judgement, and LLM nodes only for reading text or making a judgement call.
* Make the flow total: handle the rejection, timeout and failure branches explicitly, each ending in its own `end` node, and give every path a sensible end.
* When a request asks to change an existing flow, keep the ids and kinds of the nodes you are not asked to change, and keep the rest of the flow intact.
* Strings starting with a special YAML character (`#`, `*`, `&`, `@`, `{`, `[`, `%`, `!`, `|`, `>`) or containing `: ` or ` #` need quotes. Channel names such as `"#support"` must be quoted.

## 10. Worked examples

### 10.1 Invoice intake

Fetches an invoice, extracts its fields, looks the vendor up, normalises the amount, decides, asks a finance approver when needed, pays, and archives through n8n; rejected and timed-out cases send an email.

```yaml
<!--EXAMPLE_RF1-->
```

### 10.2 Support triage

Reads a support inbox, looks every sender up in the CRM with a `foreach`, extracts the most pressing issue, lets an LLM decide the ticket priority, creates the ticket, acknowledges the customer through a sub-flow, and alerts Slack when the priority is urgent. Note how the raw email text only ever goes to read blocks and to `llm.extract`; the ticket and the Slack message use the extracted fields.

```yaml
<!--EXAMPLE_TRIAGE-->
```

## 11. Before you answer

* The document starts with `ursitoare: "0.1"` and has `flow`, `version`, `inputs`, `start`, `nodes`.
* Every `uses`, `tools` entry, `flow`, `subflow`, role, model profile and delegate target is in the catalogue, and every `with` map has exactly the block's inputs.
* Every node except `end` has all its successors; every id named exists; nothing is unreachable; there are no loops.
* Every `llm.decide` outcome is mapped; every `human.approval` has `approved`, `rejected` and `timeout`; `human.form` and `delegate` have both `next` and `on_timeout`.
* Every reference points to a field that exists, from a node that always runs earlier; nothing reads the output of a `timeout` branch.
* Types match; templates are only used for text.
* Untrusted fields go through `llm.extract` before any write, send or pay.
* Output only the YAML document.
