export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Poll `fn` until it returns a truthy value; returns that value. Errors thrown by `fn` count as "not yet"
 * (the engine may be mid-restart). On timeout throws with the last value/error for diagnosis.
 */
export async function waitFor(fn, { timeoutMs = 60000, intervalMs = 100, label = 'condition' } = {}) {
  const t0 = Date.now();
  let last, lastErr;
  for (;;) {
    try {
      last = await fn();
      lastErr = undefined;
      if (last) return last;
    } catch (e) { lastErr = e; }
    if (Date.now() - t0 > timeoutMs) {
      const detail = lastErr ? `last error: ${lastErr.message}` : `last value: ${JSON.stringify(last)}`;
      throw new Error(`timed out after ${timeoutMs} ms waiting for ${label} (${detail})`);
    }
    await sleep(intervalMs);
  }
}
