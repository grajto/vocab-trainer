# perf-notes

## Assumptions
- Runtime: Next.js (Node runtime on Vercel), Neon Postgres serverless.
- ORM/DB layer: Payload + `@payloadcms/db-postgres`.
- Regions: app and Neon in same region (`eu-central-1`) **assumed**.
- Real SQL traces from production were not available in this workspace, so before/after is based on endpoint shape, query-count reduction and local build validation.

## Implemented changes
1. Added aggregated endpoint: `GET /api/study/context` (cards + due metadata + pagination).
2. Added cache headers (`s-maxage=30, stale-while-revalidate=300`) on critical GET endpoints.
3. Added DB warmup endpoint `GET /api/warmup` (intended for cron ping every 5 min).
4. Added performance migration with indexes for owner/deck/folder/due/test patterns.
5. Added Neon connection hints helper and DSN enrichment (`pgbouncer=true`, `connect_timeout=5`).

## Query tuning targets
- Main read path should be <= 1-3 queries per view switch.
- Avoid N+1 by using deckId/folderId-in filters and a single batch fetch.
- Keep payload small: paginated (50 default, max 100), compact fields only.

## Suggested EXPLAIN/ANALYZE commands (run in prod DB)
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, deck_id, front, back
FROM cards
WHERE owner_id = $1 AND deck_id = ANY($2) AND archived = false
ORDER BY id
LIMIT 50;

EXPLAIN (ANALYZE, BUFFERS)
SELECT card_id, due_at
FROM review_states
WHERE owner_id = $1 AND due_at <= now()
ORDER BY due_at
LIMIT 5000;
```

## Before vs After (expected)
| Metric | Before | After |
|---|---:|---:|
| Queries per switch | 4-10 | 1-3 |
| Typical payload | 150-300 KB | 40-90 KB |
| Median TTFB (warm) | 350-700 ms | 150-280 ms |
| Cold-after-idle | 1s+ | 400-900 ms (with warmup ping lower) |

## Operational notes
- If security policy allows: use `@neondatabase/serverless` with `neonConfig.fetchConnectionCache = true`.
- Keep DATABASE_URL flags: `sslmode=require&pgbouncer=true`.
- Configure cron to hit `/api/warmup` every 5 minutes.
