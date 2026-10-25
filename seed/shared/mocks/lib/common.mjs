// Shared helpers for the three mocks. No dependencies.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const MOCKS_DIR = path.resolve(HERE, '..');
export const STATE_DIR = process.env.MOCK_STATE_DIR ? path.resolve(process.env.MOCK_STATE_DIR) : path.join(MOCKS_DIR, 'state');
export const CATALOGUE_PATH = process.env.CATALOGUE_PATH
  ? path.resolve(process.env.CATALOGUE_PATH)
  : path.resolve(MOCKS_DIR, '..', 'catalogue', 'blocks.v0.json');

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function ensureStateDir() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

/** Append-only JSONL log, synchronous so an entry is on disk before the response is sent. */
export class JsonlLog {
  constructor(file) {
    this.file = path.join(STATE_DIR, file);
    ensureStateDir();
    this.clear();
  }
  append(obj) {
    fs.appendFileSync(this.file, JSON.stringify(obj) + '\n');
  }
  clear() {
    fs.writeFileSync(this.file, '');
  }
}

export async function readBody(req, limit = 5_000_000) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw Object.assign(new Error('body too large'), { status: 413 });
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function readJson(req) {
  const text = await readBody(req);
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    throw Object.assign(new Error('invalid JSON body: ' + e.message), { status: 400 });
  }
}

export function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

/** Parse `<run_id>:<node_id>:<attempt>`; returns null if malformed. run_id may contain ':'. */
export function parseCallHeader(value) {
  if (typeof value !== 'string' || !value) return null;
  const parts = value.split(':');
  if (parts.length < 3) return null;
  const attemptStr = parts.pop();
  const node = parts.pop();
  const run = parts.join(':');
  if (!/^\d+$/.test(attemptStr) || !node || !run) return null;
  return { run_id: run, node_id: node, attempt: Number(attemptStr) };
}

/** Wrap a request handler with routing, error handling and graceful shutdown. */
export function serve({ name, port, host, handler }) {
  return import('node:http').then(({ default: http }) => {
    const server = http.createServer(async (req, res) => {
      try {
        await handler(req, res, new URL(req.url, 'http://x'));
      } catch (e) {
        if (!res.headersSent) send(res, e.status || 500, { error: e.status ? 'bad_request' : 'internal_error', message: e.message });
        else res.destroy();
        if (!e.status) console.error(`[${name}] error:`, e);
      }
    });
    server.keepAliveTimeout = 5000;
    server.listen(port, host, () => console.log(`[${name}] listening on ${host}:${port} pid=${process.pid}`));
    const stop = () => { server.close(); server.closeAllConnections?.(); setTimeout(() => process.exit(0), 50); };
    process.on('SIGTERM', stop);
    process.on('SIGINT', stop);
    return server;
  });
}

export function bindHost() {
  return process.env.MOCK_HOST || '0.0.0.0';
}

export function hash(s, n = 10) {
  return createHash('sha256').update(String(s)).digest('hex').slice(0, n);
}
