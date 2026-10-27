import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { fixedClock } from "../core/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { appendAuditCommitted, canonicalize, verifyChain } from "./index.ts";

function makeRng(initial: number): () => number {
  let seed = initial;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

const STRING_BITS = ['"', "\\", "\u0001", "\n", "\t", "é", " ", "😀", "a", "Z", " ", "/"];
const NUMBERS = [0.1, 1e21, 5e-324, -0, 2 ** 53, 0, 1, -7.25, 123456789];

function randomValue(rng: () => number, depth: number): unknown {
  const kind = Math.floor(rng() * (depth > 2 ? 4 : 6));
  switch (kind) {
    case 0:
      return null;
    case 1:
      return rng() < 0.5;
    case 2:
      return NUMBERS[Math.floor(rng() * NUMBERS.length)];
    case 3: {
      let s = "";
      const n = Math.floor(rng() * 6);
      for (let i = 0; i < n; i++) {
        s += STRING_BITS[Math.floor(rng() * STRING_BITS.length)];
      }
      return s;
    }
    case 4: {
      const n = Math.floor(rng() * 4);
      return Array.from({ length: n }, () => randomValue(rng, depth + 1));
    }
    default: {
      const out: Record<string, unknown> = {};
      const n = Math.floor(rng() * 4);
      for (let i = 0; i < n; i++) {
        out[`k${Math.floor(rng() * 10)}`] = randomValue(rng, depth + 1);
      }
      return out;
    }
  }
}

async function makeChains(db: TestDatabase, rng: () => number): Promise<TenantContext[]> {
  const { a } = await seedTwoTenants(db);
  const ctxs: TenantContext[] = [];
  for (let c = 0; c < 12; c++) {
    const tenantId = `tenant_p${c}`;
    await db.ownerPool.query("INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ($1, $1)", [tenantId]);
    const ctx: TenantContext = { tenantId, reviewProfile: a.reviewProfile };
    ctxs.push(ctx);
    for (let i = 1; i <= 6; i++) {
      const note = `note${Math.floor(rng() * 1000)}`;
      await assert.doesNotReject(async () => {
        await appendAuditCommitted(
          db.appPool,
          ctx,
          {
            eventType: "role.granted",
            actor: { kind: "user", id: `u_${Math.floor(rng() * 100)}` },
            target: { kind: "role", id: `r_${Math.floor(rng() * 100)}` },
            payload: { value: randomValue(rng, 0), note },
          },
          { clock: fixedClock(`2031-03-10T00:00:${String(i).padStart(2, "0")}.000Z`) },
        );
      });
    }
  }
  return ctxs;
}

function flip(col: string): string {
  return `UPDATE ursitoare.audit_event SET ${col} = set_byte(${col}, 7, get_byte(${col}, 7) # 1) WHERE seq = $1::bigint`;
}
function lastChar(expr: string): string {
  return `left(${expr}, -1) || CASE WHEN right(${expr}, 1) = 'z' THEN 'y' ELSE 'z' END`;
}

const CHANGES: string[] = [
  flip("hash"),
  flip("prev_hash"),
  "UPDATE ursitoare.audit_event SET at = at + interval '1 microsecond' WHERE seq = $1::bigint",
  `UPDATE ursitoare.audit_event SET event_type = ${lastChar("event_type")} WHERE seq = $1::bigint`,
  `UPDATE ursitoare.audit_event SET actor = jsonb_set(actor, '{id}', to_jsonb(${lastChar("(actor->>'id')")})) WHERE seq = $1::bigint`,
  `UPDATE ursitoare.audit_event SET target = jsonb_set(target, '{id}', to_jsonb(${lastChar("(target->>'id')")})) WHERE seq = $1::bigint`,
  `UPDATE ursitoare.audit_event SET payload = jsonb_set(payload, '{note}', to_jsonb(${lastChar("(payload->>'note')")})) WHERE seq = $1::bigint`,
  "UPDATE ursitoare.audit_event SET origin = 'mintkey' WHERE seq = $1::bigint",
];

test("C-9dc2dff3 random JSON round trips and random chains verify", async () => {
  const rng = makeRng(12345);
  const values = Array.from({ length: 300 }, () => randomValue(rng, 0));
  let texts = 0;
  for (const v of values) {
    let first = "";
    await assert.doesNotReject(async () => {
      first = canonicalize(v);
    });
    assert.ok(first.length > 0, "canonical text is not empty");
    assert.equal(canonicalize(JSON.parse(first)), first);
    texts += 1;
  }
  assert.equal(texts, 300);

  const db = await withTestDatabase();
  try {
    const ctxs = await makeChains(db, rng);
    assert.equal(ctxs.length, 12);
    for (const ctx of ctxs) {
      assert.deepEqual(await verifyChain(db.appPool, ctx), { ok: true, checked: 6 });
    }
  } finally {
    await db.close();
  }
});

test("C-1651bb74 any single change to a random chain is a hash failure at that event", async () => {
  const rng = makeRng(12345);
  for (let i = 0; i < 300; i++) {
    randomValue(rng, 0);
  }
  const db = await withTestDatabase();
  try {
    const ctxs = await makeChains(db, rng);
    for (const ctx of ctxs) {
      const k = 1 + Math.floor(rng() * 6);
      const sql = CHANGES[Math.floor(rng() * CHANGES.length)] ?? "";
      const client = await db.ownerPool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT set_config('app.tenant_id', $1, true)", [ctx.tenantId]);
        await client.query("ALTER TABLE ursitoare.audit_event DISABLE TRIGGER audit_event_append_only");
        await client.query(sql, [k]);
        await client.query("ALTER TABLE ursitoare.audit_event ENABLE TRIGGER audit_event_append_only");
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw err;
      } finally {
        client.release();
      }
      assert.deepEqual(await verifyChain(db.appPool, ctx), {
        ok: false,
        checked: k - 1,
        firstBadSeq: BigInt(k),
        reason: "hash",
      });
    }
  } finally {
    await db.close();
  }
});
