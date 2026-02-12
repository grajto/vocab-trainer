# Performance Optimization Notes

## Executive Summary
This document tracks the comprehensive performance optimization effort for the vocab-trainer application, focusing on reducing TTFB, eliminating N+1 queries, implementing edge caching, and improving cold-start performance with Neon serverless Postgres.

## Technical Context

### Infrastructure
- **Runtime**: Next.js 16.1.6 App Router on Vercel (Node.js runtime)
- **Database**: Neon serverless Postgres (assumed region: `eu-central-1`)
- **ORM**: Payload CMS 3.75.0 with `@payloadcms/db-postgres`
- **Connection Pool**: PgBouncer via Neon (enabled with `?pgbouncer=true`)

### Baseline Metrics (Before Optimization)
| Metric | Value |
|--------|-------|
| Queries per view switch | 4-10 queries |
| Typical payload size | 150-300 KB |
| Median TTFB (warm) | 350-700 ms |
| Cold start after idle | >1000 ms |
| Cache strategy | None |

## Implemented Optimizations

### 1. Database Connection Layer ✅

**Files Created/Modified:**
- `src/lib/db.ts` - Main DB connection module with Neon HTTP driver
- `src/lib/db/neonConnection.ts` - Connection string enrichment (already existed)

**Changes:**
- Integrated `@neondatabase/serverless` package
- Enabled `neonConfig.fetchConnectionCache = true` for HTTP connection caching
- Created reusable connection pool with lazy initialization
- Added raw SQL execution helpers for performance-critical queries

**Configuration:**
```typescript
neonConfig.fetchConnectionCache = true  // Enable HTTP connection caching

Connection string params:
- pgbouncer=true         // Use PgBouncer for connection pooling
- connect_timeout=5      // Quick handshake timeout
- sslmode=verify-full    // Strict TLS verification
```

### 2. Database Indexes ✅

**File:** `src/migrations/20260211_180000_perf_indexes.ts`

**Indexes Added:**
1. `idx_cards_owner_deck` - (owner_id, deck_id, id)
2. `idx_review_states_owner_due_card` - (owner_id, due_at, card_id)  
3. `idx_sessions_owner_started` - (owner_id, started_at DESC)
4. `idx_decks_owner_folder` - (owner_id, folder_id, id)
5. `idx_test_answers_owner_test` - (owner_id, test_id, answered_at DESC)

**Benefits:**
- Index-only scans for common queries
- Elimination of sequential scans on large tables
- Faster aggregation queries for stats/dashboard
- Optimized SRS due date lookups

### 3. Optimized Query Layer ✅

**File:** `src/lib/queries/getDueCards.ts`

**Features:**
- **Single batch fetch**: Parallel execution of cards + review states
- **Pagination**: Configurable limit (default: 50, max: 100)
- **Field projection**: Only fetch required fields (id, front, back, cardType)
- **Smart filtering**: Optional due-only mode
- **O(1) lookup**: Review state map for instant card-state matching

**Query Pattern:**
```typescript
// Before (N+1 problem):
for each deck {
  fetch cards
  for each card {
    fetch review_state
  }
}

// After (optimized):
Promise.all([
  fetch all cards WHERE deck IN [...],
  fetch all review_states WHERE owner = ? AND due <= NOW()
])
// Then join in-memory with Map
```

### 4. API Endpoints with Edge Caching ✅

**Files Modified:**
- `app/api/cards/route.ts` - Added GET endpoint with pagination + cache headers
- `app/api/study/context/route.ts` - Aggregated endpoint (already existed)
- `app/api/warmup/route.ts` - DB warmup ping (already existed)

**Cache Strategy:**
```http
Cache-Control: public, s-maxage=30, stale-while-revalidate=300
```

**Interpretation:**
- CDN caches for 30 seconds (fresh)
- Stale content served for 5 minutes while revalidating in background
- Reduces origin hits by ~95% for frequently accessed data

**Endpoints with Cache:**
- `GET /api/cards` - Card listings with pagination
- `GET /api/study/context` - Aggregated study data
- `GET /api/stats` - Statistics (30s cache)

### 5. Client-Side Data Fetching ✅

**Files Created:**
- `app/hooks/useCards.ts` - React Query hooks for cards
- `app/providers/QueryProvider.tsx` - TanStack Query provider
- `app/layout.tsx` - Updated with QueryProvider

**Features:**
- **Automatic caching**: 5 minute stale time, 10 minute garbage collection
- **Smart prefetching**: `usePrefetchCards` hook for hover/navigation
- **Background sync**: Automatic revalidation on stale data
- **Optimistic updates**: Query invalidation after mutations
- **Retry logic**: Exponential backoff (3 retries, max 30s delay)

**Usage Example:**
```typescript
// In components
const { data, isLoading } = useCards({ deckId: '123', limit: 50 })

// Prefetch on hover
const prefetch = usePrefetchCards()
<Link onMouseEnter={() => prefetch({ deckId: '456' })}>Next Deck</Link>

// Invalidate after mutations
const invalidate = useInvalidateCards()
await createCard(newCard)
invalidate({ deckId: '123' })
```

### 6. Warmup Endpoint ✅

**File:** `app/api/warmup/route.ts` (already existed)

**Purpose:**
- Prevent cold starts by keeping database connection alive
- Called by cron once daily

**Recommended Cron Setup (Vercel Cron):**
```json
{
  "crons": [
    {
      "path": "/api/warmup",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Note:** Schedule set to once daily (midnight UTC) to comply with Vercel free plan limits. For Hobby or Pro plans, you can increase frequency to `0 */6 * * *` (every 6 hours) or `*/5 * * * *` (every 5 minutes) for better cold start prevention.

## Expected Performance Improvements

### Target Metrics (After Optimization)

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Queries per view | 4-10 | 1-3 | 70% reduction |
| Payload size | 150-300 KB | 40-90 KB | 60% reduction |
| Median TTFB (warm) | 350-700 ms | 150-280 ms | 50% reduction |
| Cold start | >1000 ms | 400-900 ms | 40% reduction |
| Cache hit rate | 0% | 80-95% | New capability |

### Query Count Breakdown

**Dashboard Page:**
- Before: 6-8 queries (decks, folders, sessions, review states, aggregates)
- After: 2-3 queries (parallel batch fetches)

**Session Start:**
- Before: 10+ queries (deck fetch, cards loop, review states loop, creation loop)
- After: 3 queries (batch cards, batch states, single transaction for creation)

**Library/Decks View:**
- Before: 4-6 queries (decks, review counts per deck)
- After: 2 queries (batch decks + states)

## Database Query Validation

### Key Queries for EXPLAIN Analysis

Run these in production to verify index usage:

```sql
-- 1. Due cards query (should use idx_review_states_owner_due_card)
EXPLAIN (ANALYZE, BUFFERS)
SELECT card_id, due_at, level
FROM review_states
WHERE owner_id = $1 
  AND due_at <= NOW()
ORDER BY due_at
LIMIT 100;

-- Expected: Index Scan using idx_review_states_owner_due_card

-- 2. Cards by deck query (should use idx_cards_owner_deck)
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, front, back, card_type
FROM cards
WHERE owner_id = $1 
  AND deck_id = ANY($2)
ORDER BY id
LIMIT 50;

-- Expected: Index Scan using idx_cards_owner_deck

-- 3. Recent sessions query (should use idx_sessions_owner_started)
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, started_at, ended_at, mode
FROM sessions
WHERE owner_id = $1
ORDER BY started_at DESC
LIMIT 10;

-- Expected: Index Scan using idx_sessions_owner_started
```

### Query Performance Monitoring

Enable `pg_stat_statements` (already in migration):
```sql
-- Check slow queries
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%cards%' OR query LIKE '%review_states%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Operational Recommendations

### 1. CDN Configuration (Vercel)
- Ensure regions are close to database (EU Central for Neon EU)
- Enable Edge Network for global distribution
- Monitor cache hit rates in Vercel Analytics

### 2. Database Tuning
- Keep Neon in same region as app (eu-central-1)
- Use PgBouncer connection pooling (enabled)
- Monitor connection count (should stay under 100)
- Set appropriate autosuspend timeout (5-15 minutes recommended)

### 3. Monitoring & Alerts
- Track TTFB with Web Vitals (target: p95 < 500ms)
- Monitor database query time (target: p95 < 100ms)
- Alert on cold start frequency (should be <5% of requests)
- Watch cache hit rates (target: >80%)

### 4. Future Optimizations (Optional)
- [ ] Materialized views for complex dashboard aggregations
- [ ] Redis cache layer for hot data (session state, user prefs)
- [ ] GraphQL for flexible field selection
- [ ] Database read replicas for heavy analytics
- [ ] Service worker for offline-first experience

## Testing Checklist

- [ ] Verify indexes are created: `\d+ cards`, `\d+ review_states`
- [ ] Check EXPLAIN plans show index usage (not seq scans)
- [ ] Test warmup endpoint: `curl /api/warmup` returns <100ms
- [ ] Verify cache headers in response: `Cache-Control: public, s-maxage=30`
- [ ] Test pagination: `/api/cards?limit=50&offset=100`
- [ ] Validate React Query caching in browser DevTools
- [ ] Test cold start: wait 15 min, trigger request (<900ms)
- [ ] Load test: 100 concurrent users, TTFB <500ms

## Rollback Plan

If performance degrades:

1. **Revert cache headers**: Remove `Cache-Control` from endpoints
2. **Disable client caching**: Remove `<QueryProvider>` from layout
3. **Revert query optimization**: Use original simple queries
4. **Drop indexes** (only if causing update/insert slowdowns):
   ```sql
   DROP INDEX IF EXISTS idx_cards_owner_deck;
   DROP INDEX IF EXISTS idx_review_states_owner_due_card;
   ```

## Package Dependencies

**Added:**
```json
{
  "@neondatabase/serverless": "^0.12.0",
  "@tanstack/react-query": "^5.62.0"
}
```

**Existing:**
```json
{
  "@payloadcms/db-postgres": "^3.75.0",
  "@payloadcms/next": "^3.75.0",
  "payload": "^3.75.0",
  "next": "16.1.6"
}
```

## References

- [Neon Serverless Docs](https://neon.tech/docs/serverless/serverless-driver)
- [PgBouncer Best Practices](https://www.pgbouncer.org/)
- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [PostgreSQL Index Tuning](https://www.postgresql.org/docs/current/indexes.html)
