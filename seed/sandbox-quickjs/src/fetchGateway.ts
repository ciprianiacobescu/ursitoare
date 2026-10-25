import type { FetchRecord } from './types.ts';

const FORBIDDEN_HEADERS = new Set(['host', 'connection', 'content-length', 'transfer-encoding', 'upgrade', 'proxy-authorization', 'te', 'trailer']);
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']);

export class GatewayError extends Error {
  readonly kind: 'FetchDeniedError' | 'FetchError' | 'ReplayMismatchError';
  constructor(kind: GatewayError['kind'], message: string) {
    super(message);
    this.kind = kind;
  }
}

export function normalizeOrigins(list: string[]): Set<string> {
  const out = new Set<string>();
  for (const entry of list) {
    const u = new URL(entry); // throws on garbage -> caller maps to input_invalid
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new TypeError(`allowlist entry ${entry}: only http(s) origins`);
    out.add(u.origin);
  }
  return out;
}

export interface GatewayOptions {
  allowlist: Set<string>;
  replay?: FetchRecord[];
  impl?: typeof fetch;
  maxRequests: number;
  maxResponseBytes: number;
}

/**
 * Host side of the guest `fetch`. Every request goes through `checkUrl` (exact-origin allowlist, http(s) only,
 * no URL credentials) before anything touches the network, and redirects are never followed:
 * a 3xx is handed back to the guest as a plain response.
 */
export class FetchGateway {
  readonly log: FetchRecord[] = [];
  readonly abort = new AbortController();
  private replayIdx = 0;
  private readonly opts: GatewayOptions;
  constructor(opts: GatewayOptions) {
    this.opts = opts;
  }

  checkUrl(raw: string): URL {
    let u: URL;
    try {
      u = new URL(raw);
    } catch {
      throw new GatewayError('FetchDeniedError', `fetch denied: invalid URL`);
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new GatewayError('FetchDeniedError', `fetch denied: scheme ${u.protocol} not allowed`);
    if (u.username || u.password) throw new GatewayError('FetchDeniedError', 'fetch denied: credentials in URL');
    if (!this.opts.allowlist.has(u.origin)) throw new GatewayError('FetchDeniedError', `fetch denied: origin ${u.origin} is not allowlisted`);
    return u;
  }

  /** Returns the JSON string handed to the guest shim: a response object or `{error:{name,message}}`. */
  async handle(reqJson: string): Promise<string> {
    const req = JSON.parse(reqJson) as { url: string; method: string; headers: Record<string, string>; body: string | null };
    const rec: FetchRecord = { seq: this.log.length, method: req.method, url: req.url, requestHeaders: req.headers, requestBody: req.body };
    this.log.push(rec);
    try {
      if (this.log.length > this.opts.maxRequests) throw new GatewayError('FetchError', `too many fetch calls (max ${this.opts.maxRequests})`);
      if (!METHODS.has(req.method)) throw new GatewayError('FetchDeniedError', `fetch denied: method ${req.method}`);
      const url = this.checkUrl(req.url);
      for (const h of Object.keys(req.headers)) if (FORBIDDEN_HEADERS.has(h)) throw new GatewayError('FetchDeniedError', `fetch denied: header ${h}`);
      if (req.body !== null && (req.method === 'GET' || req.method === 'HEAD')) throw new GatewayError('FetchError', 'body not allowed on GET/HEAD');
      if (req.body !== null && req.body.length > 1_000_000) throw new GatewayError('FetchError', 'request body too large');

      let response: NonNullable<FetchRecord['response']>;
      if (this.opts.replay) {
        const next = this.opts.replay[this.replayIdx++];
        if (!next) throw new GatewayError('ReplayMismatchError', `replay exhausted at call #${rec.seq}`);
        if (next.method !== req.method || next.url !== req.url || next.requestBody !== req.body)
          throw new GatewayError('ReplayMismatchError', `replay mismatch at call #${rec.seq}: recorded ${next.method} ${next.url}, got ${req.method} ${req.url}`);
        if (next.error) throw new GatewayError(next.error.name, next.error.message);
        if (!next.response) throw new GatewayError('ReplayMismatchError', 'recorded entry has no response');
        response = next.response;
      } else {
        const impl = this.opts.impl ?? fetch;
        let res: Response;
        try {
          res = await impl(url, { method: req.method, headers: req.headers, body: req.body ?? undefined, redirect: 'manual', signal: this.abort.signal });
        } catch (e) {
          throw new GatewayError('FetchError', `fetch failed: ${(e as Error).message}`);
        }
        const headers: Record<string, string> = {};
        res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
        const body = await readCapped(res, this.opts.maxResponseBytes);
        response = { status: res.status, statusText: res.statusText, headers, body };
      }
      rec.response = response;
      return JSON.stringify({ ...response, url: req.url });
    } catch (e) {
      if (e instanceof GatewayError) {
        rec.error = { name: e.kind as 'FetchDeniedError' | 'FetchError', message: e.message };
        return JSON.stringify({ error: { name: e.kind, message: e.message } });
      }
      const message = `fetch failed: ${(e as Error).message}`;
      rec.error = { name: 'FetchError', message };
      return JSON.stringify({ error: { name: 'FetchError', message } });
    }
  }
}

async function readCapped(res: Response, max: number): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.byteLength;
    if (n > max) {
      await reader.cancel();
      throw new GatewayError('FetchError', `response larger than ${max} bytes`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}
