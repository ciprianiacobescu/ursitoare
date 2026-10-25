import { parentPort } from 'node:worker_threads';
import { runCode } from './index.ts';
import type { RunCodeOptions } from './types.ts';

parentPort!.on('message', async (msg: { id: number; opts: RunCodeOptions }) => {
  const result = await runCode(msg.opts);
  parentPort!.postMessage({ id: msg.id, result });
});
parentPort!.postMessage({ ready: true });
