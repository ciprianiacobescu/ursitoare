import http2 from "node:http2";

import type { FakeState } from "./state.ts";

export function createVaultServer(_state: FakeState): http2.Http2Server {
  const server = http2.createServer();
  server.on("stream", (stream) => {
    stream.on("error", () => {});
    stream.respond({ ":status": 200, "content-type": "application/grpc" }, { waitForTrailers: true });
    stream.on("wantTrailers", () => {
      stream.sendTrailers({ "grpc-status": "12", "grpc-message": "unimplemented" });
    });
    stream.resume();
    stream.end();
  });
  return server;
}
