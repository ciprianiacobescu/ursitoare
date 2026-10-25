// Thin client for the three mocks' observability and reset endpoints.
export const URLS = {
  llm: process.env.MOCK_LLM_URL || 'http://127.0.0.1:18901',
  tools: process.env.MOCK_TOOLS_URL || 'http://127.0.0.1:18902',
  n8n: process.env.MOCK_N8N_URL || 'http://127.0.0.1:18903',
};

async function getJson(url, init) {
  const r = await fetch(url, { signal: AbortSignal.timeout(5000), ...init });
  if (!r.ok) throw new Error(`${init?.method || 'GET'} ${url} -> HTTP ${r.status}`);
  return r.json();
}

export const mocks = {
  urls: URLS,
  async health() {
    const out = {};
    for (const [k, u] of Object.entries(URLS)) {
      try { await getJson(`${u}/health`); out[k] = true; } catch (e) { out[k] = false; }
    }
    return out;
  },
  /** Reset all three mocks. Optional runtime overrides: tools delays, n8n delegate delay. */
  async reset({ toolDelays = {}, delegateDelayMs } = {}) {
    const post = (u, body) => getJson(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    await post(`${URLS.llm}/reset`, {});
    await post(`${URLS.tools}/reset`, { delays: toolDelays });
    await post(`${URLS.n8n}/reset`, delegateDelayMs === undefined ? {} : { delegate_delay_ms: delegateDelayMs });
  },
  /** Change mock-tools delays without clearing counters. */
  async setToolDelays(delays) {
    return getJson(`${URLS.tools}/config`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ delays }) });
  },
  llm: (q = '') => getJson(`${URLS.llm}/calls${q}`),
  tools: (q = '') => getJson(`${URLS.tools}/calls${q}`),
  n8n: (q = '') => getJson(`${URLS.n8n}/calls${q}`),
  /** Compact snapshot for the results file. */
  async snapshot() {
    const [l, t, n] = await Promise.all([this.llm(), this.tools(), this.n8n()]);
    return {
      llm: { total: l.total, counts: l.counts },
      tools: { calls: t.calls, effects: t.effects, duplicates: t.duplicates, by_block: t.by_block },
      n8n: { webhook_calls: n.webhook_calls, callback_attempts: n.callback_attempts, callbacks_failed: n.callbacks_failed, callbacks_delivered: n.callbacks_delivered, gave_up: n.gave_up },
    };
  },
};
