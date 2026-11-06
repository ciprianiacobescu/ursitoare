/**
 * Guest-side prelude. It runs once per fresh context, before any user code, and returns the `drive`
 * function the host calls. Everything it needs from the engine is captured in closures first, so
 * later tampering with globals/prototypes by user code cannot change how output is validated.
 */
export function buildPrelude(cfg: { maxOutputChars: number; objectOrNull: boolean }): string {
  return `(function () {
'use strict';
const g = globalThis;
const MAX_OUT = ${JSON.stringify(cfg.maxOutputChars)};
const OR_NULL = ${JSON.stringify(cfg.objectOrNull)};

// ---- capture natives before user code can touch them
const ObjectProto = Object.prototype, ArrayProto = Array.prototype;
const jstringify = JSON.stringify, jparse = JSON.parse;
const defProp = Object.defineProperty, getProto = Object.getPrototypeOf;
const getDesc = Object.getOwnPropertyDescriptor, keysOf = Object.keys;
const isArray = Array.isArray, isFinite_ = Number.isFinite;
const hasOwn = Object.hasOwn, ReflectConstruct = Reflect.construct;
const NativeError = Error, NativeSet = Set;

const hidden = (o, k, v) => defProp(o, k, { value: v, writable: true, configurable: true, enumerable: false });
const fixed = (o, k, v) => defProp(o, k, { value: v, writable: false, configurable: false, enumerable: false });

// ---- remove observability / threading primitives
delete g.SharedArrayBuffer;
delete g.WeakRef;
delete g.FinalizationRegistry;

// ---- strict output validation + serialization
function bad(path, why) {
  const e = new NativeError('output is not JSON-serializable at ' + path + ': ' + why);
  e.name = 'OutputError';
  throw e;
}
function check(v, depth, stack, path, budget) {
  if (--budget.n < 0) bad(path, 'too many nodes');
  const t = typeof v;
  if (v === null || t === 'boolean' || t === 'string') return;
  if (t === 'number') { if (!isFinite_(v)) bad(path, 'non-finite number'); return; }
  if (t !== 'object') bad(path, t);
  if (depth > 64) bad(path, 'nesting deeper than 64');
  if (stack.has(v)) bad(path, 'cycle');
  const proto = getProto(v);
  if (isArray(v)) {
    if (proto !== ArrayProto) bad(path, 'array with non-standard prototype');
  } else if (proto !== ObjectProto && proto !== null) {
    bad(path, 'non-plain object (Date, Map, class instance, ...)');
  }
  if (proto !== null && 'toJSON' in v) bad(path, 'toJSON present');
  stack.add(v);
  if (isArray(v)) {
    for (let i = 0; i < v.length; i++) {
      if (!hasOwn(v, i)) bad(path + '[' + i + ']', 'sparse array hole');
      check(v[i], depth + 1, stack, path + '[' + i + ']', budget);
    }
  } else {
    for (const k of keysOf(v)) {
      if (k === '__proto__') bad(path, 'key "__proto__" is not allowed');
      const d = getDesc(v, k);
      if (!d || !('value' in d)) bad(path + '.' + k, 'accessor property');
      check(d.value, depth + 1, stack, path + '.' + k, budget);
    }
  }
  stack.delete(v);
}
function serialize(out) {
  if (OR_NULL && (out === undefined || out === null)) return 'null';
  if (out === null || typeof out !== 'object' || isArray(out)) bad('$', 'the code body must return a plain object');
  check(out, 0, new NativeSet(), '$', { n: 1000000 });
  const s = jstringify(out);
  if (s.length > MAX_OUT) { const e = new NativeError('output exceeds size limit'); e.name = 'OutputTooLargeError'; throw e; }
  return s;
}

// primitives only: JSON.stringify never consults toJSON for strings, so a polluted Object.prototype.toJSON cannot alter it
const envelope = (name, message) => 'E{"name":' + jstringify(name) + ',"message":' + jstringify(message) + '}';

// ---- driver: never throws for user-level failures; returns "O<json>" or "Onull" or "E<json {name,message}>"
return async function drive(fn, inputJson) {
  let out;
  try {
    out = await fn(jparse(inputJson));
  } catch (e) {
    let name = 'Error', message = '';
    // An allocation failure with no memory left to build an exception object surfaces as a thrown null.
    if (e === null) return envelope('NullThrown', 'null');
    try {
      if (e !== null && (typeof e === 'object' || typeof e === 'function')) {
        name = e.name === undefined ? 'Error' : String(e.name);
        message = e.message === undefined ? '<thrown ' + typeof e + ' without a message>' : String(e.message);
      } else message = String(e);
    } catch (_) { message = '<unprintable thrown value>'; }
    return envelope(name.slice(0, 200), message.slice(0, 2000));
  }
  try {
    return 'O' + serialize(out);
  } catch (e) {
    return envelope(String(e.name), String(e.message).slice(0, 2000));
  }
};
})()`;
}
