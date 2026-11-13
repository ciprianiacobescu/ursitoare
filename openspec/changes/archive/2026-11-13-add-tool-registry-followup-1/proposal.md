# Proposal: follow-up 1 for add-tool-registry

## Why
Requested by CiprianSpot, 2026-11-09T21:50:04Z in FB-001 (behaviour, src/tools/store.ts:131-143): The requirement on submitSurface says a new digest SHALL be stored as the newest surface. newestSurface orders by submitted_at DESC, surface_digest DESC, and submitted_at is clock.now() at millisecond precision, so when a new surface gets the same timestamp as the newest stored one (two submissions in one millisecond, a fixed clock, or a clock that steps back) and its digest sorts lower, the older surface stays newest. The new surface then cannot be approved (digest_mismatch), cannot be submitted again (surface_known) and never shows as pendingDigest; if the server was approved it is set to drifted with pendingDigest null, so approval answers nothing_pending and only a third, later surface frees it. The route test's drift assertion passes only because D_B sorts above D_A under fixedClock(NOW). Keep the ordering rule of design.md; for example, under the row lock already held, store submitted_at as the later of now and the newest surface's submitted_at plus one microsecond.

    async function newestSurface(
      tx: TenantTx,
      ctx: TenantContext,
      serverId: string,
    ): Promise<SurfaceRow | null> {
      const result = await tx.query<SurfaceRow>(
        `SELECT ${SURFACE_COLUMNS} FROM ursitoare.tool_surface
         WHERE tenant_id = $1 AND tool_server_id = $2
         ORDER BY submitted_at DESC, surface_digest DESC LIMIT 1`,
        [ctx.tenantId, serverId],
      );
      return result.rows[0] ?? null;
    }

Requested by CiprianSpot, 2026-11-09T21:50:05Z in FB-002 (tests, src/api/tool-server-routes.ts:128-140): Add new tests (existing tests unchanged) for the rows of test-plan-routes.md that src/api/tool-server-routes.test.ts does not send: § Register and read, the POST surface refusals untrusted_fields ["zzz"], output { type: "bogus" }, GET /x on the first tool and tools [t, t], each with its field and reason; § Malformed, PUT /acme/surface [] (body: must be object), PUT /acme/surface { tools: [t], meta: 1 } (body: unknown_property; the only row that reaches the surface-to-body field mapping on PUT), PUT /BAD!/surface (params/id pattern), approve { digest: {} } (body/digest: must be string) and approve { digest: "abc" } on pending acme (422 digest_mismatch), each also showing nothing was written. In src/tools/store.test.ts add a test that, after registerToolServerTx is refused with TOOLS_TENANT_MISMATCH in tenant b's transaction, reads ursitoare.tool_server as tenant b with withTenantTx and finds no row, so the refusal is shown to write nothing in the transaction's own tenant too.

        case "TOOLS_INVALID": {
          const raw = details["field"] ?? "";
          let field: string;
          if (scope === "register") {
            field = raw.startsWith("tools") ? `body/surface/${raw}` : `body/${raw}`;
          } else {
            field = raw === "surface" ? "body" : `body/${raw}`;
          }
          const entry = ERROR_CODES["VALIDATION_FAILED"];
          return new ApiError(entry?.status ?? 400, "VALIDATION_FAILED", entry?.message ?? "Invalid", {
            fields: [{ field, message: details["reason"] ?? "bad_value" }],
          });
        }

`add-tool-registry` was merged, and a person asked for the changes above in its `feedback.md`. This change carries them out; each task names the finding it answers.

## What Changes
- F-53e5bf9d: Feedback FB-001 (behaviour): A new surface submitted in the same millisecond is shadowed by an ol...
- F-5e11a405: Feedback FB-002 (tests): Route and tenant rows of the test plan that no test sends

## Impact
The code and the tests of `add-tool-registry`.
