// Negative control: same fake, but all state is in memory, so kill() loses every run.
// The durability tests (RT-1, RT-2, RT-3, RT-5) are EXPECTED to fail against this adapter.
import { makeFakeAdapter } from './fake-adapter.mjs';
export default makeFakeAdapter('volatile', 'fake-volatile');
