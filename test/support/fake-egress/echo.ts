import { createHash } from "node:crypto";
import http from "node:http";
import type { Socket } from "node:net";

export interface EchoUpstream {
  readonly origin: string;
  close(): Promise<void>;
}

export async function startEchoUpstream(): Promise<EchoUpstream> {
  const sockets = new Set<Socket>();
  const server = http.createServer((req, res) => {
    const raw = req.url ?? "/";
    const q = raw.indexOf("?");
    const path = q === -1 ? raw : raw.slice(0, q);
    const query = q === -1 ? "" : raw.slice(q + 1);
    if (path === "/redirect") {
      req.resume();
      res.writeHead(302, { location: "/landing?from=echo", "content-length": "0" });
      res.end();
      return;
    }
    const hash = createHash("sha256");
    req.on("data", (c: Buffer) => hash.update(c));
    req.on("end", () => {
      const headers: Record<string, string> = {};
      for (const [name, value] of Object.entries(req.headers)) {
        if (value !== undefined) headers[name] = Array.isArray(value) ? value.join(", ") : value;
      }
      const body = JSON.stringify({ method: req.method, path, query, headers, bodySha256: hash.digest("hex") });
      res.writeHead(200, { "content-type": "application/json", "content-length": String(Buffer.byteLength(body)) });
      res.end(body);
    });
  });
  server.on("connection", (s: Socket) => {
    sockets.add(s);
    s.on("close", () => sockets.delete(s));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("echo upstream has no port");
  const origin = `http://127.0.0.1:${address.port}`;
  let closing: Promise<void> | undefined;
  return {
    origin,
    close(): Promise<void> {
      closing ??= new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
        for (const s of sockets) s.destroy();
      });
      return closing;
    },
  };
}
