Data that scenarios and tasks refer to. Every layout was computed with the algorithm of `design.md` decision 2 (a throwaway script).

## Numbers

Text cuts (with `clip` from `web/src/admin/shared.ts`): drawing title 22, drawing edge label 24, list label 80, unknown kind 40, detail value and id 300.

## Texts

`UNSAVED`: "The graph shows a saved version. Save the flow text as a version in the editor to draw it." `NOT_MAPPING`: "This version's document is not a flow: it is not a mapping." `NO_NODES`: `This version's document has no "nodes" mapping.` `FORBIDDEN` (the kit's text): "You are not allowed to do this. If you think you should be, give the decision id to an administrator." `INTERNAL`: "The engine hit an unexpected problem. Try again, and tell an administrator if it keeps happening." `TOO_LARGE`: "This flow has <count> nodes. The graph draws at most 200 nodes. Read the flow text in the editor." `EMPTY`: "This flow has no nodes yet." `READY`: "Flow graph: <n> node(s), <e> edge(s), <l> layer(s)." plus, when u > 0 nodes are not reachable, " <u> node(s) cannot be reached from the start node." (singular "1 node", "1 edge", "1 layer"; otherwise the plural). Other texts: the details hint "Select a node in the list or in the drawing to see its fields."; `versionNote(2)` "Showing version 2."; `versionNote(null)` "No version saved yet."; loading label "Loading graph"; "Try again", "Open the graph on its own page", "Back to the editor".

## Test documents

- `S` = `{ start: "a", nodes: { a: { kind: "block", next: "b" }, b: { kind: "switch", on: "x", cases: { x: "c", y: "d" }, default: "d" }, c: { kind: "block", next: "e" }, d: { kind: "end" }, e: { kind: "end" } } }`
- `CYCLE` = `{ start: "a", nodes: { a: { kind: "block", next: "b" }, b: { kind: "block", next: "a" } } }`
- `LOOP` = `{ start: "a", nodes: { a: { kind: "block", next: "a" } } }`
- `ODD` = `{ start: "a", nodes: { a: { kind: "block", next: "ghost" }, q: { kind: "mystery", next: "a" }, z: 7, constructor: { kind: "block", next: "toString" } } }`
- `UNREACH` = `{ start: "a", nodes: { a: { kind: "end" }, b: { kind: "block", next: "c" }, c: { kind: "block", next: "a" } } }`
- `NOSTART` = `{ nodes: { b: { kind: "end" }, a: { kind: "end" } } }`; `ONE` = `{ start: "a", nodes: { a: { kind: "end" } } }`
- `SLASH` = `{ start: "a", nodes: { a: { kind: "switch", on: "x", cases: { "a/b": "b", "c~d": "b" }, default: "b" }, b: { kind: "end" } } }`

## Layouts

Node columns: layer, index, x, y, `successors`; also `missing: []` unless stated, `kind` (`null` when absent or the node is no object), `known` true exactly for the 14 kinds, `reachable` true unless stated, `start` true only for the node named by `start`. Edge columns: from, to, `label`, x1, y1, x2, y2, labelX, labelY; `paths` are the successor pointers sorted by code unit; `upward` is false unless stated.

**S**: width 384, height 392, layers 4, start "a". Nodes: a 0 0 112 16 [b]; b 1 0 112 120 [c, d]; c 2 0 16 224 [e]; d 2 1 208 224 []; e 3 0 112 328 []. Edges: a b null 192 64 192 120 192 92 (paths `/next`); b c "x" 192 168 96 224 144 196 (`/cases/x`); b d "y, default" 192 168 288 224 240 196 (`/cases/y`, `/default`); c e null 96 272 192 328 144 300.

**CYCLE**: width 192, height 184, layers 2. a 0 0 16 16 [b]; b 1 0 16 120 [a]. Edges: a b null 96 64 96 120 96 92; b a null 96 168 96 16 96 92 with `upward` true.

**LOOP**: width 192, height 80, layers 1. a 0 0 16 16 [a]. Edge: a a null 96 64 96 16 96 40, `upward` true.

**ODD**: width 576, height 184, layers 2, start "a", edges `[]`. a 0 0 208 16 [] with `missing: ["ghost"]`; constructor 1 0 16 120 [] with `missing: ["toString"]`, unreachable, kind "block"; q 1 1 208 120 [], kind "mystery", `known` false, unreachable; z 1 2 400 120 [], kind `null`, `known` false, unreachable.

**NOSTART**: width 384, height 80, layers 1, start `null`, edges `[]`. a 0 0 16 16 and b 0 1 208 16, both unreachable, kind "end".

**UNREACH**: width 384, height 184, layers 2. a 0 0 112 16 []; b 1 0 16 120 [c], unreachable; c 1 1 208 120 [a], unreachable. Edges: b c null 96 168 288 120 192 144, `upward` true; c a null 288 168 192 16 240 92, `upward` true.

**SLASH**: width 192, height 184. One edge a b with label "a/b, c~d, default", paths `/cases/a~1b`, `/cases/c~0d`, `/default`, coordinates 96 64 96 120 96 92.

**Chain200**: ids `n000` to `n199`, each `block` with `next` the following id, the last an `end`, `start` "n000": 200 nodes, 200 layers, width 192, height 20776, node `n199` at layer 199, index 0, x 16, y 20712.

**EMPTY** (`{ start: "a", nodes: {} }`): `{ nodes: [], edges: [], width: 0, height: 0, layers: 0, start: null }`. **ONE**: width 192, height 80, layers 1, a at 16 16.

**RF-1** (`loadTestFlow("rf-1-invoice-intake")`): width 384, height 912, layers 9, start "fetch_invoice". Nodes: fetch_invoice 0 0 112 16 [extract]; extract 1 0 112 120 [lookup_vendor]; lookup_vendor 2 0 112 224 [normalize]; normalize 3 0 112 328 [classify]; classify 4 0 112 432 [approval, notify_rejection, pay]; approval 5 0 112 536 [notify_rejection, pay]; notify_rejection 6 0 16 640 [rejected]; pay 6 1 208 640 [archive]; archive 7 0 16 744 [done]; rejected 7 1 208 744 []; done 8 0 112 848 []. Edges (from, to, `label`; coordinates by rule 2(h), all `upward` false): fetch_invoice extract null; extract lookup_vendor null; lookup_vendor normalize null; normalize classify null; classify approval "needs_review"; classify notify_rejection "reject"; classify pay "auto_approve"; approval notify_rejection "rejected, timeout"; approval pay "approved"; notify_rejection rejected null; pay archive null; archive done "next, timeout".

**G** (the journey flow, below): width 384, height 288, layers 3, start "fetch". fetch 0 0 112 16 [route]; route 1 0 112 120 [done, failed]; done 2 0 16 224 []; failed 2 1 208 224 []. Edges (by rule 2(h)): fetch route null; route done "fast"; route failed "default".

## Views of the documents

`graphView(S, true)`: state "ready", message "Flow graph: 5 nodes, 4 edges, 4 layers."; items `{ id, label, summary }` in layout order, label = id: a "block · Start · Next: b"; b "switch · Next: c, d"; c "block · Next: e"; d "end · Next: none"; e "end · Next: none". `graphView(ODD, true)`: message "Flow graph: 4 nodes, 0 edges, 2 layers. 3 nodes cannot be reached from the start node."; a "block · Start · Next: ghost (missing)"; constructor "block · Next: toString (missing) · Not reachable"; q "mystery (unknown kind) · Next: none · Not reachable"; z "no kind · Next: none · Not reachable". `graphView(ONE, true)` "Flow graph: 1 node, 0 edges, 1 layer."; `graphView(NOSTART, true)` "Flow graph: 2 nodes, 0 edges, 1 layer. 2 nodes cannot be reached from the start node."

## Graph source data

`H` = "sha256:" followed by 64 times "a". `V` = `{ flowId: "demo-graph", number: 2, hash: H, state: "validated", surface: "yaml", author: "u1", requestedBy: null, createdAt: "2026-10-25T09:00:00.000000Z", validatedAt: "2026-10-25T09:00:00.000000Z", validationOk: true }`. `F` = `{ flowId: "demo-graph", ownerTeam: "finance", createdBy: "u1", createdAt: V.createdAt, versionCount: 2, latest: V }`; `F0` is `F` with `versionCount: 0`, `latest: null`; `D` = `{ ...V, text: "flow: demo-graph\n", canonical: S, result: null }` (wire shapes U28's `parseFlow` and `parseVersionDetail` accept).

## Journey texts

`GRAPH_GOOD` (checked with the Phase-0 validator against the seed catalogue that `parts/35-catalogue.ts` seeds: `ok`, no warning):

```yaml
ursitoare: "0.1"
flow: demo-graph
version: 1.0.0
inputs:
  type: object
  properties:
    url:
      type: string
    mode:
      type: string
  required:
    - url
    - mode
start: fetch
nodes:
  fetch:
    kind: block
    uses: docs.fetch@1
    with:
      url: ${{ inputs.url }}
    next: route
  route:
    kind: switch
    on: ${{ inputs.mode }}
    cases:
      fast: done
    default: failed
  done:
    kind: end
    status: completed
  failed:
    kind: end
    status: failed
```

`GRAPH_BAD` is `GRAPH_GOOD` with `uses: nope.missing@1`: one error `L2_UNKNOWN_BLOCK` at `/nodes/fetch/uses`, and the same graph. Both are string constants in `test/journeys/m3-authoring.test.ts` and `e2e/test_m3_authoring.py`. The field rows of `route`, sorted by name after the three fixed rows: `cases` `{"fast":"done"}`, `default` "failed", `on` "${{ inputs.mode }}".
