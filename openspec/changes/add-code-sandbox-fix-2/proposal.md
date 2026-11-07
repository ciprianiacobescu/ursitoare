# Proposal: fix 2 for add-code-sandbox

## Why
The verifier found problems in `add-code-sandbox` that this change fixes. The findings are listed below with their ids; each task of this change names the ones it answers.

## What Changes
- F-44115141 (major): Proxy getPrototypeOf traps escape option validation: Decided by delegate in Q-005: The finding is correct and is not waived. The requirement says createWorkerSandbox throws SandboxError SANDBOX_INVALID with option opts for a getter or Proxy trap that throws. In pool.ts the plain-object check isPlainObject runs on the raw argument before either try/catch of readPoolOptions, and it calls Object.getPrototypeOf on the value, which invokes a Proxy's getPrototypeOf trap. A Proxy whose getPrototypeOf trap throws therefore leaks its raw error out of createWorkerSandbox instead of the typed SandboxError. The fix is in production code only: the prototype check must be inside the same protected path that already turns a throwing ownKeys trap or getter into the opts could not be read error. WHEN createWorkerSandbox receives an opts value that is a Proxy whose getPrototypeOf trap throws THEN it throws synchronously a SandboxError with code SANDBOX_INVALID, message opts could not be read and details option opts, and no other error escapes.. createWorkerSandbox calls isPlainObject before it enters the protected option...

## Impact
The code and the tests of `add-code-sandbox`.
