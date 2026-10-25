// The process the L4 e2e gate serves (`gates.e2e.serve.command`), offline: the gate runs with loopback only.
// Bootstrap placeholder: starts the placeholder engine. The e2e-stack unit (openspec change add-e2e-stack) composes
// the real engine with embedded Postgres, the fake OIDC provider and the fake egress proxy here.
// Test-support file: only a task that names it may change it.
import { startServer } from "../../../src/main.ts";

const port = Number(process.env.E2E_PORT ?? "39080");
const running = await startServer(port, "127.0.0.1");
process.stdout.write(`e2e stack ready on ${running.url}\n`);

const stop = (): void => void running.close().then(() => process.exit(0));
process.once("SIGTERM", stop);
process.once("SIGINT", stop);
