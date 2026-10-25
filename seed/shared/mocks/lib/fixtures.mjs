// Single source of truth for the fixtures in design.md section 5.
export const LARGE_THRESHOLD = 1000; // RF-1 `normalize` node: is_large = amount > 1000

export const VENDORS = {
  'acme gmbh': { vendor_id: 'V-ACME', name: 'Acme GmbH', status: 'active', payment_terms_days: 30 },
  'globex': { vendor_id: 'V-GLOBEX', name: 'Globex', status: 'active', payment_terms_days: 45 },
  'blocked co': { vendor_id: 'V-BLOCKED', name: 'Blocked Co', status: 'blocked', payment_terms_days: 0 },
};

export const INVOICES = {
  'INV-1001': { vendor_name: 'Acme GmbH', amount: 2450.0, amount_text: '2450.00', currency: 'EUR', due_date: '2026-11-30', vendor_status: 'active', outcome: 'needs_review' },
  'INV-1002': { vendor_name: 'Globex', amount: 120.5, amount_text: '120.50', currency: 'usd', due_date: '2026-11-15', vendor_status: 'active', outcome: 'auto_approve' },
  'INV-1003': { vendor_name: 'Blocked Co', amount: 300, amount_text: '300', currency: 'EUR', due_date: '2026-12-01', vendor_status: 'blocked', outcome: 'reject' },
  'INV-1004': { vendor_name: 'Acme GmbH', amount: 20000.0, amount_text: '20000.00', currency: 'EUR', due_date: '2026-12-15', vendor_status: 'active', outcome: 'needs_review' },
};

export function invoiceRawText(id) {
  const f = INVOICES[id];
  if (!f) return null;
  return [
    `INVOICE ${id}`,
    `Vendor: ${f.vendor_name}`,
    `Total: ${f.amount_text} ${f.currency}`,
    `Due date: ${f.due_date}`,
    `Payment terms: net ${lookupVendor(f.vendor_name).payment_terms_days} days`,
    'Please remit to the account on file.',
  ].join('\n');
}

export function lookupVendor(name) {
  const hit = VENDORS[String(name || '').trim().toLowerCase()];
  if (hit) return hit;
  // Unknown vendors are treated as active so generic agent placeholder calls do not blow up.
  const slug = String(name || 'unknown').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 16) || 'UNKNOWN';
  return { vendor_id: `V-${slug}`, name: String(name || 'unknown'), status: 'active', payment_terms_days: 30 };
}

/** Find the first known invoice id mentioned anywhere in a text. */
export function findInvoiceId(text) {
  for (const m of String(text).matchAll(/INV-\d{4}/g)) if (INVOICES[m[0]]) return m[0];
  return null;
}
