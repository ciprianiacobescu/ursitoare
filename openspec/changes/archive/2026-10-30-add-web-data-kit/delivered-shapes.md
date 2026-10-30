# Delivered shapes taken by add-web-data-kit

The M0 names this change takes (proposal.md, "Interfaces taken"), as declared by the merged code on main (fb48c96): `tsc --emitDeclarationOnly` output, with `export` and `declare` dropped. The code is the truth; this file only shows its shapes to the readiness judge.

```ts
// add-web-shell (web/src/api/client.ts)
class ApiRequestError extends Error { readonly status: number; readonly code: string; readonly details: unknown; readonly requestId: string | null; constructor(status: number, code: string, message: string, opts?: { details?: unknown; requestId?: string | null; cause?: unknown }) }
type QueryValue = string | number | boolean | undefined
interface RequestOptions { query?: Readonly<Record<string, QueryValue>>; headers?: Readonly<Record<string, string>>; signal?: AbortSignal; body?: unknown }
interface ApiClient { request<T>(method: string, path: string, opts?: RequestOptions): Promise<T>; get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T>; post<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T>; put<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T>; patch<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T>; delete<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T> }
```
