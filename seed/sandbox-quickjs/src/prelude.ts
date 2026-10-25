/**
 * Guest-side prelude. It runs once per fresh context, before any user code, and returns the `drive`
 * function the host calls. Everything it needs from the engine is captured in closures first, so
 * later tampering with globals/prototypes by user code cannot change how output is validated.
 *
 * Determinism removals/overrides (documented in README):
 *   - Date: replaced by a frozen-clock Date; all local-time API aliased to UTC; non-ISO strings -> Invalid Date.
 *   - Math.random: seeded mulberry32 (non-writable, non-configurable).
 *   - SharedArrayBuffer, WeakRef, FinalizationRegistry: deleted (GC / threading observability).
 *   - The host TZ leak (Date.prototype.getTimezoneOffset etc.) is removed by the UTC aliasing.
 */
export function buildPrelude(cfg: {
  nowMs: number;
  seed: number;
  maxOutputChars: number;
  fetchEnabled: boolean;
}): string {
  return `(function () {
'use strict';
const g = globalThis;
const NOW = ${JSON.stringify(cfg.nowMs)};
const SEED = ${JSON.stringify(cfg.seed >>> 0)};
const MAX_OUT = ${JSON.stringify(cfg.maxOutputChars)};
const FETCH_ENABLED = ${JSON.stringify(cfg.fetchEnabled)};

// ---- capture natives before user code can touch them
const RD = g.Date, RDP = RD.prototype;
const ObjectProto = Object.prototype, ArrayProto = Array.prototype;
const jstringify = JSON.stringify, jparse = JSON.parse;
const defProp = Object.defineProperty, getProto = Object.getPrototypeOf;
const getDesc = Object.getOwnPropertyDescriptor, keysOf = Object.keys;
const isArray = Array.isArray, isFinite_ = Number.isFinite;
const hasOwn = Object.hasOwn, ReflectConstruct = Reflect.construct;
const NativeError = Error, NativeSet = Set, NativePromise = Promise;
const hostFetch = g.__hf;
delete g.__hf;

const hidden = (o, k, v) => defProp(o, k, { value: v, writable: true, configurable: true, enumerable: false });
const fixed = (o, k, v) => defProp(o, k, { value: v, writable: false, configurable: false, enumerable: false });

// ---- remove observability / threading primitives
delete g.SharedArrayBuffer;
delete g.WeakRef;
delete g.FinalizationRegistry;

// ---- Math.random: mulberry32
{
  let s = SEED >>> 0;
  const random = function random() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  fixed(Math, 'random', random);
}

// ---- Date: frozen clock + UTC-only
{
  const pad = (n, w) => { let s = String(Math.abs(n)); while (s.length < (w || 2)) s = '0' + s; return (n < 0 ? '-' : '') + s; };
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const valid = (d) => RDP.getTime.call(d) === RDP.getTime.call(d);
  const dateStr = (d) => DAYS[d.getUTCDay()] + ' ' + MONS[d.getUTCMonth()] + ' ' + pad(d.getUTCDate()) + ' ' + pad(d.getUTCFullYear(), 4);
  const timeStr = (d) => pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds());
  for (const name of Object.getOwnPropertyNames(RDP)) {
    const m = /^(get|set)(FullYear|Month|Date|Day|Hours|Minutes|Seconds|Milliseconds)$/.exec(name);
    if (m) hidden(RDP, name, RDP[m[1] + 'UTC' + m[2]]);
  }
  delete RDP.getYear; delete RDP.setYear;
  hidden(RDP, 'getTimezoneOffset', function getTimezoneOffset() { RDP.getTime.call(this); return 0; });
  hidden(RDP, 'toString', function toString() { return valid(this) ? dateStr(this) + ' ' + timeStr(this) + ' GMT+0000 (UTC)' : 'Invalid Date'; });
  hidden(RDP, 'toDateString', function toDateString() { return valid(this) ? dateStr(this) : 'Invalid Date'; });
  hidden(RDP, 'toTimeString', function toTimeString() { return valid(this) ? timeStr(this) + ' GMT+0000 (UTC)' : 'Invalid Date'; });
  hidden(RDP, 'toLocaleString', function toLocaleString() { return valid(this) ? this.toISOString().slice(0, 10) + ' ' + timeStr(this) : 'Invalid Date'; });
  hidden(RDP, 'toLocaleDateString', function toLocaleDateString() { return valid(this) ? this.toISOString().slice(0, 10) : 'Invalid Date'; });
  hidden(RDP, 'toLocaleTimeString', function toLocaleTimeString() { return valid(this) ? timeStr(this) : 'Invalid Date'; });

  const ISO = /^(?:[+-]\\d{6}|\\d{4})(?:-\\d{2}(?:-\\d{2})?)?(T\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d{1,9})?)?)?(Z|[+-]\\d{2}:\\d{2})?$/;
  const UTCSTR = /^[A-Za-z]{3}, \\d{2} [A-Za-z]{3} \\d{4} \\d{2}:\\d{2}:\\d{2} GMT$/;
  const OWNSTR = /^[A-Za-z]{3} [A-Za-z]{3} \\d{2} \\d{4} \\d{2}:\\d{2}:\\d{2} GMT\\+0000 \\(UTC\\)$/;
  // Strings with a zone, plus ISO date-only/date-time (a missing zone on a date-time means UTC here).
  // Everything else (host-timezone-dependent legacy formats) becomes Invalid Date.
  const normalize = (s) => {
    s = String(s);
    const iso = ISO.exec(s);
    if (iso) return (iso[1] && !iso[2]) ? s + 'Z' : s;
    if (UTCSTR.test(s)) return s;
    if (OWNSTR.test(s)) return s.slice(0, 24) + ' GMT';
    return 'invalid';
  };
  const D = function Date(...a) {
    if (!new.target) return RDP.toString.call(new RD(NOW));
    if (a.length === 0) return ReflectConstruct(RD, [NOW], new.target);
    if (a.length === 1) {
      let v = a[0];
      if (typeof v === 'string') v = normalize(v);
      return ReflectConstruct(RD, [v], new.target);
    }
    return ReflectConstruct(RD, [RD.UTC(...a)], new.target);
  };
  fixed(D, 'prototype', RDP);
  hidden(RDP, 'constructor', D);
  fixed(D, 'UTC', RD.UTC);
  fixed(D, 'now', function now() { return NOW; });
  fixed(D, 'parse', function parse(s) { return RD.parse(normalize(s)); });
  hidden(g, 'Date', D);
}

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
  if (out === null || typeof out !== 'object' || isArray(out)) bad('$', 'the code body must return a plain object');
  check(out, 0, new NativeSet(), '$', { n: 1000000 });
  const s = jstringify(out);
  if (s.length > MAX_OUT) { const e = new NativeError('output exceeds size limit'); e.name = 'OutputTooLargeError'; throw e; }
  return s;
}

// ---- optional gateway-only fetch (the host enforces policy; this is just the shim)
if (FETCH_ENABLED) {
  const mkErr = (name, message) => { const e = new NativeError(message); e.name = name; return e; };
  class Headers_ {
    constructor(obj) { hidden(this, '_h', obj); }
    get(n) { const v = this._h[String(n).toLowerCase()]; return v === undefined ? null : v; }
    has(n) { return this.get(n) !== null; }
    entries() { return Object.entries(this._h); }
  }
  class Response_ {
    constructor(r) {
      this.status = r.status; this.statusText = r.statusText; this.ok = r.status >= 200 && r.status < 300;
      this.headers = new Headers_(r.headers); this.url = r.url; this.redirected = false;
      hidden(this, '_b', r.body);
    }
    async text() { return this._b; }
    async json() { return jparse(this._b); }
  }
  hidden(g, 'fetch', async function fetch(url, init) {
    init = init || {};
    const headers = {};
    if (init.headers) for (const k of keysOf(init.headers)) headers[String(k).toLowerCase()] = String(init.headers[k]);
    const req = { url: String(url), method: init.method ? String(init.method).toUpperCase() : 'GET', headers,
                  body: init.body === undefined || init.body === null ? null : String(init.body) };
    const res = jparse(await hostFetch(jstringify(req)));
    if (res.error) throw mkErr(res.error.name, res.error.message);
    return new Response_(res);
  });
}

// primitives only: JSON.stringify never consults toJSON for strings, so a polluted Object.prototype.toJSON cannot alter it
const envelope = (name, message) => 'E{"name":' + jstringify(name) + ',"message":' + jstringify(message) + '}';

// ---- driver: never throws for user-level failures; returns "O<json>" or "E<json {name,message}>"
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
