// Minimal JSON-Schema helpers: a value filler and a validator covering the subset the
// catalogue and the flow output schemas use (type, enum, const, properties, required, items,
// oneOf/anyOf (first branch), nullable via type arrays). Not a general implementation.

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);

/**
 * Fill a schema with a value. `hints` maps property names to values (fixture data);
 * `stringDefault` is used for unknown string properties.
 */
export function fillSchema(schema, { hints = {}, stringDefault = 'n/a', name = '' } = {}) {
  if (!schema || typeof schema !== 'object') return null;
  if ('const' in schema) return schema.const;
  if (Array.isArray(schema.enum) && schema.enum.length) {
    if (name in hints && schema.enum.includes(hints[name])) return hints[name];
    return schema.enum[0];
  }
  if (schema.default !== undefined && !(name in hints)) return schema.default;
  const branch = schema.oneOf?.[0] || schema.anyOf?.[0];
  if (branch) return fillSchema({ ...branch }, { hints, stringDefault, name });
  let type = schema.type;
  if (Array.isArray(type)) type = type.find((t) => t !== 'null') || 'null';
  if (!type) type = schema.properties ? 'object' : schema.items ? 'array' : 'string';
  if (name in hints) {
    const h = hints[name];
    const ht = typeOf(h);
    if (ht === type || (type === 'number' && ht === 'integer')) return h;
    if (type === 'string' && (ht === 'number' || ht === 'integer')) return String(h);
    if (type === 'number' && ht === 'string' && !Number.isNaN(Number(h))) return Number(h);
    if (type === 'integer' && ht === 'number') return Math.round(h);
  }
  switch (type) {
    case 'object': {
      const out = {};
      for (const [k, sub] of Object.entries(schema.properties || {})) {
        out[k] = fillSchema(sub, { hints, stringDefault, name: k });
      }
      return out;
    }
    case 'array': {
      const min = schema.minItems || 0;
      const out = [];
      for (let i = 0; i < min; i++) out.push(fillSchema(schema.items || {}, { hints, stringDefault, name: '' }));
      return out;
    }
    case 'integer': return 0;
    case 'number': return 0;
    case 'boolean': return false;
    case 'null': return null;
    default: return stringDefault;
  }
}

/** Validate; returns an array of {path, message}. Empty array = valid. */
export function validate(schema, value, path = '$') {
  const errors = [];
  if (!schema || typeof schema !== 'object') return errors;
  if ('const' in schema && JSON.stringify(schema.const) !== JSON.stringify(value)) errors.push({ path, message: `must equal ${JSON.stringify(schema.const)}` });
  if (Array.isArray(schema.enum) && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) {
    errors.push({ path, message: `must be one of ${JSON.stringify(schema.enum)}, got ${JSON.stringify(value)}` });
  }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = typeOf(value);
    const ok = types.some((t) => t === actual || (t === 'number' && actual === 'integer'));
    if (!ok) {
      errors.push({ path, message: `expected ${types.join('|')}, got ${actual}` });
      return errors;
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const r of schema.required || []) if (!(r in value)) errors.push({ path: `${path}.${r}`, message: 'required property missing' });
    for (const [k, sub] of Object.entries(schema.properties || {})) if (k in value) errors.push(...validate(sub, value[k], `${path}.${k}`));
  }
  if (Array.isArray(value) && schema.items) value.forEach((v, i) => errors.push(...validate(schema.items, v, `${path}[${i}]`)));
  return errors;
}
