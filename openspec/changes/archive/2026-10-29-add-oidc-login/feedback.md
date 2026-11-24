# Feedback — add-oidc-login

<!-- l4:feedback v1
Ask for changes here while the unit's branch is open. The easy way is `l4 feedback add` (see `l4 feedback --help`).
An item is read only when its **Status** is `submitted`; `draft` items wait and `withdrawn` items are ignored.
Kinds: refactor · duplication · tests · config · behaviour (see docs/feedback.md).
Do not change item IDs. Commit and push to the l4/… branch: the harness takes submitted items at its next
verification round, turns them into a fix unit and checks that each one was addressed. -->

<!-- l4:feedback-index:start -->
| ID | Status | Kind | Where | Feedback |
|----|--------|------|-------|----------|
| FB-001 | submitted | behaviour | src/identity/oidc/login.ts:101 | OIDC handlers send a reply and resolve undefined, so Fastify sends twice and logs a 500 |
<!-- l4:feedback-index:end -->

---

## FB-001: OIDC handlers send a reply and resolve undefined, so Fastify sends twice and logs a 500

- **Status:** submitted
- **Kind:** behaviour
- **Where:** `src/identity/oidc/login.ts:101-110`
- **Where:** `src/identity/oidc/callback.ts:185-218`
- **Where:** `src/identity/oidc/logout.ts:50-94`
- **Where:** `src/identity/oidc/routes.ts:29-36`
- **Where:** `src/api/server.ts:116-123`
- **Lesson:** yes
- **By:** CiprianSpot, 2026-11-24T09:03:45Z

### Code
`src/identity/oidc/login.ts:101-110`
```typescript
      reply.header("set-cookie", cookie);
    } catch (error) {
      const code = refusalCode(error);
      request.log.warn({ code }, "sign-in refused");
      reply.code(302).header("location", refusalLocation(code)).send();
      return;
    }

    reply.code(302).header("location", authorizeUrl).send();
  });
```
`src/identity/oidc/callback.ts:185-218`
```typescript
      const sessionCookie = serializeCookie(SESSION_COOKIE, session.sessionId, {
        path: SESSION_COOKIE_PATH,
        secure,
      });
      reply.header("set-cookie", [clearedLogin(), sessionCookie]);
      reply.code(302).header("location", state.returnTo).send();
    } catch (error) {
      const code = refusalCode(error);
      const reason = error instanceof OidcError ? error.details["reason"] : undefined;
      request.log.warn(reason === undefined ? { code } : { code, reason }, "sign-in refused");

      if (tenant !== null) {
        const refusedTenant = tenant;
        try {
          await appendAuditCommitted(
            deps.pool,
            refusedTenant,
            {
              eventType: "auth.login_refused",
              actor: { kind: "system", id: "oidc" },
              payload: { code },
            },
            { clock: deps.clock },
          );
        } catch (auditError) {
          request.log.error({ err: auditError }, "sign-in audit failed");
        }
      }

      reply.header("set-cookie", [clearedLogin()]);
      reply.code(302).header("location", refusalLocation(code)).send();
    }
  });
```
`src/identity/oidc/logout.ts:50-94`
```typescript
    const session = await resolveSession(deps.pool, cookieValue, { clock: deps.clock });
    if (session === null) {
      reply.header("set-cookie", clearSession());
      reply
        .code(401)
        .send(envelope("UNAUTHENTICATED", "Authentication required"));
      return;
    }

    const token = csrfHeader(request.headers["x-csrf-token"]);
    const csrfValid = await verifyCsrfToken(deps.pool, session, token);
    if (!csrfValid) {
      reply
        .code(403)
        .send(envelope("OIDC_CSRF_INVALID", "CSRF token missing or invalid"));
      return;
    }

    await revokeSession(deps.pool, session, { clock: deps.clock });

    let redirect = signInUrl;
    if (session.endSessionHint !== null) {
      try {
        const discovery = await deps.client.discovery();
        if (discovery.logoutUrl !== null) {
          const hint = hintSealer.open<string>(
            session.endSessionHint,
            `${session.tenant.tenantId}\n${session.userId}`,
          );
          if (typeof hint === "string" && hint.length > 0) {
            const url = new URL(discovery.logoutUrl);
            url.searchParams.set("id_token_hint", hint);
            url.searchParams.set("post_logout_redirect_uri", signInUrl);
            url.searchParams.set("client_id", deps.config.clientId);
            redirect = url.toString();
          }
        }
      } catch {
        redirect = signInUrl;
      }
…
```
`src/identity/oidc/routes.ts:29-36`
```typescript
function registerUnavailableRoutes(server: FastifyInstance): void {
  const unavailableHandler = async (
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    reply.header("cache-control", "no-store");
    reply.code(503).send(NOT_CONFIGURED);
  };
```
`src/api/server.ts:116-123`
```typescript
  server.setErrorHandler((error, request, reply) => {
    const mapped = toErrorResponse(error);
    if (mapped.status >= 500) {
      request.log.error({ err: error }, "request failed");
    }
    reply.code(mapped.status).send(mapped.body);
  });
```

### Feedback
The OIDC route handlers are async and call reply...send() without returning reply (login.ts:105 and :109, callback.ts:191 and :216, logout.ts:55, :64 and :93, routes.ts:35 for the not-configured 503). Fastify's wrap-thenable sees the handler resolve with undefined while the first send is still in its onSend hooks and calls send again. With two async onSend hooks (the x-request-id hook in server.ts and registerSecurityHeaders, as in the real app through registerWebApp) the second send throws ERR_HTTP_HEADERS_SENT, the error handler logs 'request failed' at error level, sets reply.code(500) on a response that is already out, and logs 'Reply was already sent'. The client still gets the right 302, 200, 401, 403 or 503 with one Set-Cookie, but every sign-in, callback and logout logs a false 5xx error, the 'request completed' line records statusCode 500, and the span's http status follows it. Unit tests miss it because buildServer alone has one onSend hook and the test loggers are silent. Return reply after each send (as idempotency.ts, admin-rbac.ts and mcp-tool-routes.ts already do), and make the error handler leave a response that was already sent alone. Test it with the real hook stack (buildServer, registerSecurityHeaders, registerOidcRoutes) and a capturing log destination.

### When / Then
- **When:** an OIDC login, callback, logout or not-configured route answers on a server with the real hook stack (the x-request-id onSend hook and the security-headers onSend hook)
- **Then:** exactly one response is written, no line at error level and no 'Reply was already sent' or FST_ERR_REP_ALREADY_SENT line is logged, and the 'request completed' log line carries the status the client received (302, 200, 401, 403 or 503), not 500

### Outcome
<!-- written by the harness -->
