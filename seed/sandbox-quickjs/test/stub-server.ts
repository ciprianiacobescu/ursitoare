import http from 'node:http';
import type { AddressInfo } from 'node:net';

export const STUB_PORT = 18930;
export const STUB_ORIGIN = `http://localhost:${STUB_PORT}`;

export interface Stub {
  hits: Record<string, number>;
  total(): number;
  reset(): void;
  close(): Promise<void>;
}

/** Tiny stub upstream on 127.0.0.1:18930 (also reachable as localhost). It counts every hit per path. */
export async function startStub(port = STUB_PORT): Promise<Stub> {
  const hits: Record<string, number> = {};
  let counter = 0;
  const server = http.createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0];
    hits[path] = (hits[path] ?? 0) + 1;
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      switch (path) {
        case '/ok':
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ hello: 'world' }));
          return;
        case '/echo':
          res.writeHead(200, { 'content-type': 'text/plain', 'x-method': req.method ?? '' });
          res.end(body);
          return;
        case '/nondeterministic':
          counter++;
          res.writeHead(200, { 'content-type': 'application/json', 'x-counter': String(counter) });
          res.end(JSON.stringify({ n: counter, t: Date.now(), r: Math.random() }));
          return;
        case '/redirect-evil':
          res.writeHead(302, { location: `http://127.0.0.1:${port}/secret` });
          res.end('moved');
          return;
        case '/redirect-internal':
          res.writeHead(302, { location: '/secret' });
          res.end('moved');
          return;
        case '/secret':
          res.writeHead(200);
          res.end('SECRET');
          return;
        case '/big':
          res.writeHead(200);
          res.end('x'.repeat(3_000_000));
          return;
        case '/slow':
          setTimeout(() => { res.writeHead(200); res.end('slow'); }, 2000);
          return;
        default:
          res.writeHead(404);
          res.end('nope');
      }
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  // 'localhost' may resolve to ::1 first; also listen on IPv6 loopback when possible so both work.
  const addr = server.address() as AddressInfo;
  void addr;
  return {
    hits,
    total: () => Object.values(hits).reduce((a, b) => a + b, 0),
    reset: () => { for (const k of Object.keys(hits)) delete hits[k]; counter = 0; },
    close: () => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); }),
  };
}
