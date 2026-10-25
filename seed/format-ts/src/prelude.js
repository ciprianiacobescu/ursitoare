// Builder for the Ursitoare TS call-list surface. Evaluated INSIDE QuickJS, before the author's module.
// It uses no host functions: the host reads the result by calling the function this script evaluates to.
// The KINDS placeholder below is replaced by the JSON of KIND_SPECS (src/kinds.ts) before evaluation.
(function () {
  "use strict";
  const KINDS = __KINDS__;
  const stringify = JSON.stringify;
  const isArray = Array.isArray;
  const keysOf = Object.keys;
  const defProp = Object.defineProperty;
  const getProto = Object.getPrototypeOf;
  const ObjProto = Object.prototype;
  const isFin = Number.isFinite;
  const snakeToCamel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

  const refInfo = new WeakMap(); // ref proxy -> dotted path
  const handleSet = new WeakSet(); // node handles
  const misuseLog = [];
  const nodes = []; // {id, spec, fields, extras, next, cases}
  const nodeById = new Map();
  let flowCalls = 0;
  let sealed = true;
  let startId; // from f.start or meta.start
  let meta = null;

  function misuse(message) {
    if (message.length > 300) message = message.slice(0, 140) + " ... " + message.slice(-140);
    const e = new Error(message);
    e.name = "BuilderMisuseError";
    misuseLog.push({ message: message, stack: String(e.stack || "") });
    throw e;
  }

  // ---- references --------------------------------------------------------------------------------------------
  const marker = (path) => "${{ " + path + " }}";
  function mkRef(path) {
    const toStr = () => marker(path);
    const p = new Proxy(
      {},
      {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === "toString" || key === "toJSON" || key === "valueOf") return toStr;
          if (typeof key === "symbol" || key === "then") return undefined;
          return mkRef(path + "." + key);
        },
        set() {
          misuse("a reference (" + path + ") is read-only");
        },
        defineProperty() {
          misuse("a reference (" + path + ") is read-only");
        },
        deleteProperty() {
          misuse("a reference (" + path + ") is read-only");
        },
      },
    );
    refInfo.set(p, path);
    return p;
  }

  // ---- values ------------------------------------------------------------------------------------------------
  // Convert an author value to plain JSON. References become "${{ ... }}" strings. `undefined` object members are
  // dropped (JSON semantics); everything JSON cannot hold is a misuse.
  function ser(v, where, depth) {
    if (v === null) return null;
    const t = typeof v;
    if (t === "string" || t === "boolean") return v;
    if (t === "number") {
      if (!isFin(v)) misuse(where + ": " + String(v) + " is not a JSON number");
      return v;
    }
    if (t === "undefined") return undefined;
    if (t === "function" || t === "symbol" || t === "bigint") misuse(where + ": a " + t + " cannot be used as a value");
    if (depth > 120) misuse(where + ": value nested deeper than 120 levels (cycle?)");
    if (refInfo.has(v)) return marker(refInfo.get(v));
    if (handleSet.has(v)) misuse(where + ": a node handle cannot be used as a value; read a field with `<handle>.out.<field>` (or `<decide>.outcome`)");
    if (isArray(v)) {
      const out = [];
      for (let i = 0; i < v.length; i++) {
        const x = ser(v[i], where + "[" + i + "]", depth + 1);
        if (x === undefined) misuse(where + "[" + i + "]: undefined cannot be a list element");
        out.push(x);
      }
      return out;
    }
    const proto = getProto(v);
    if (proto !== ObjProto && proto !== null) misuse(where + ": only plain objects, lists, strings, numbers, booleans, null and references can be used as values");
    const out = {};
    for (const k of keysOf(v)) {
      const x = ser(v[k], where + "." + k, depth + 1);
      if (x !== undefined) defProp(out, k, { value: x, enumerable: true, writable: true, configurable: true });
    }
    return out;
  }
  const isPlain = (v) => v !== null && typeof v === "object" && !isArray(v) && !refInfo.has(v) && !handleSet.has(v) && (getProto(v) === ObjProto || getProto(v) === null);

  // a successor value: node handle -> its id; anything else is serialised and left for the validator to judge
  function succ(v, where) {
    if (v !== null && typeof v === "object" && handleSet.has(v)) return v.id;
    return ser(v, where, 0);
  }
  // an existing node designated by a handle or a string id
  function existing(v, where) {
    const id = v !== null && typeof v === "object" && handleSet.has(v) ? v.id : v;
    if (typeof id !== "string") misuse(where + ": expected a node handle or a node id string");
    const n = nodeById.get(id);
    if (!n) misuse(where + ': no node "' + id + '" has been created yet');
    return n;
  }

  // ---- nodes -------------------------------------------------------------------------------------------------
  function checkOpen(what) {
    if (sealed) misuse(what + ": the builder can only be used inside the function passed to flow()");
  }

  function addNode(spec, args) {
    const name = spec.method;
    checkOpen("f." + name + "()");
    const id = args[0];
    if (typeof id !== "string") misuse("f." + name + "(): the first argument must be the node id (a string)");
    if (nodeById.has(id)) misuse('f.' + name + '(): duplicate node id "' + id + '"');
    const node = { id: id, spec: spec, fields: {}, extras: {}, next: undefined, cases: undefined };
    const where = "f." + name + '("' + id + '")';
    if (spec.positional) {
      if (args.length > 1 + spec.positional.length) misuse(where + ": too many arguments (expected " + (1 + spec.positional.length) + ")");
      spec.positional.forEach((field, i) => {
        const x = ser(args[1 + i], where + " " + snakeToCamel(field), 0);
        if (x !== undefined) node.fields[field] = x;
      });
    } else {
      if (args.length > 2) misuse(where + ": too many arguments (expected the id and one options object)");
      const opts = args[1];
      if (opts !== undefined) {
        if (!isPlain(opts)) misuse(where + ": the second argument must be an options object");
        const camel = {};
        for (const f of spec.fields) camel[snakeToCamel(f)] = f;
        const seen = {};
        for (const key of keysOf(opts)) {
          const field = camel[key] || key;
          if (seen[field]) misuse(where + ": option given twice (" + field + ")");
          seen[field] = true;
          const raw = opts[key];
          if (field === "next" && spec.succ === "next") node.next = succ(raw, where + " next");
          else if (field === "cases" && spec.succ === "cases") node.cases = casesOf(raw, where + " cases");
          else {
            const x = spec.idFields.indexOf(field) >= 0 ? succ(raw, where + " " + key) : ser(raw, where + " " + key, 0);
            if (x === undefined) continue;
            if (spec.fields.indexOf(field) >= 0) node.fields[field] = x;
            else defProp(node.extras, field, { value: x, enumerable: true, writable: true, configurable: true });
          }
        }
      }
    }
    nodes.push(node);
    nodeById.set(id, node);
    const handle = Object.create(null);
    handle.id = id;
    handle.out = mkRef("nodes." + id + ".output");
    handle.outcome = mkRef("nodes." + id + ".outcome");
    handleSet.add(handle);
    return Object.freeze(handle);
  }

  function casesOf(map, where) {
    if (!isPlain(map)) misuse(where + ": expected an object mapping each case to a node id");
    const out = {};
    for (const k of keysOf(map)) defProp(out, k, { value: succ(map[k], where + "." + k), enumerable: true, writable: true, configurable: true });
    return out;
  }

  function template(strings) {
    checkOpen("f.template");
    if (typeof strings === "string") return strings;
    if (!isArray(strings) || !isArray(strings.raw)) misuse("f.template must be used as a tagged template: f.template`text ${ref} text`");
    let s = strings[0];
    for (let i = 1; i < strings.length; i++) {
      const v = arguments[i];
      if (v !== null && typeof v === "object" && refInfo.has(v)) s += marker(refInfo.get(v));
      else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") s += String(v);
      else misuse("f.template: interpolated value " + i + " must be a reference, string, number or boolean");
      s += strings[i];
    }
    return s;
  }

  function makeBuilder() {
    const f = {};
    for (const spec of KINDS) {
      f[spec.method] = function () {
        return addNode(spec, Array.prototype.slice.call(arguments));
      };
    }
    f.cases = function (node, map) {
      checkOpen("f.cases()");
      if (arguments.length !== 2) misuse("f.cases() takes a node and an object of cases");
      const n = existing(node, "f.cases()");
      if (n.spec.succ !== "cases") misuse('f.cases(): node "' + n.id + '" (' + n.spec.kind + ") has no cases; use it on llm.decide, switch or human.approval");
      if (n.cases !== undefined) misuse('f.cases(): cases of "' + n.id + '" were already set');
      n.cases = casesOf(map, 'f.cases("' + n.id + '")');
    };
    f.next = function (from, to) {
      checkOpen("f.next()");
      if (arguments.length !== 2) misuse("f.next() takes two arguments: the node and the node that runs after it");
      const n = existing(from, "f.next()");
      if (n.spec.succ !== "next") misuse('f.next(): node "' + n.id + '" (' + n.spec.kind + ") has no next; " + (n.spec.succ === "cases" ? "use f.cases()" : "it ends the flow"));
      if (n.next !== undefined) misuse('f.next(): next of "' + n.id + '" was already set');
      n.next = succ(to, 'f.next("' + n.id + '")');
    };
    f.start = function (node) {
      checkOpen("f.start()");
      if (arguments.length !== 1) misuse("f.start() takes one argument: the id of the first node");
      if (startId !== undefined) misuse("the start node was already set");
      startId = succ(node, "f.start()");
    };
    f.template = template;
    f.inputs = mkRef("inputs");
    f.item = mkRef("item");
    return Object.freeze(f);
  }

  // ---- flow() ------------------------------------------------------------------------------------------------
  globalThis.flow = function flow(m, build) {
    if (flowCalls > 0) misuse("flow() was called more than once; a file defines exactly one flow");
    flowCalls++;
    if (arguments.length !== 2) misuse("flow() takes two arguments: flow({ id, version, description?, inputs }, f => { ... })");
    if (!isPlain(m)) misuse("flow(): the first argument must be an object { id, version, description?, inputs }");
    if (typeof build !== "function") misuse("flow(): the second argument must be a function f => { ... }");
    meta = ser(m, "flow()", 0);
    if (meta.start !== undefined) {
      startId = meta.start;
      delete meta.start;
    }
    sealed = false;
    let r;
    try {
      r = build(makeBuilder());
    } finally {
      sealed = true;
    }
    if (r !== null && typeof r === "object" && typeof r.then === "function") misuse("flow(): the function must be synchronous (no async, no await)");
  };

  // ---- result ------------------------------------------------------------------------------------------------
  function assemble() {
    const doc = {};
    const m = meta;
    doc.ursitoare = m.ursitoare !== undefined ? m.ursitoare : "0.1";
    if (m.id !== undefined) doc.flow = m.id;
    for (const k of ["version", "description", "inputs"]) if (m[k] !== undefined) doc[k] = m[k];
    const start = startId !== undefined ? startId : nodes.length ? nodes[0].id : undefined;
    if (start !== undefined) doc.start = start;
    const out = {};
    nodes.forEach((n, i) => {
      const o = { kind: n.spec.kind };
      for (const f of n.spec.fields) if (n.fields[f] !== undefined) o[f] = n.fields[f];
      if (n.cases !== undefined) o.cases = n.cases;
      if (n.spec.succ === "next") {
        // default sequencing: only node-creating calls advance the sequence; an explicit next wins
        if (n.next !== undefined) o.next = n.next;
        else if (i + 1 < nodes.length) o.next = nodes[i + 1].id;
      }
      for (const k of keysOf(n.extras)) defProp(o, k, { value: n.extras[k], enumerable: true, writable: true, configurable: true });
      defProp(out, n.id, { value: o, enumerable: true, writable: true, configurable: true });
    });
    doc.nodes = out;
    for (const k of keysOf(m)) {
      if (k === "ursitoare" || k === "id" || k === "version" || k === "description" || k === "inputs") continue;
      defProp(doc, k, { value: m[k], enumerable: true, writable: true, configurable: true });
    }
    return doc;
  }

  return function finish() {
    const res = { called: flowCalls, misuse: misuseLog };
    if (flowCalls > 0 && meta !== null && misuseLog.length === 0) res.doc = assemble();
    return stringify(res);
  };
})()
