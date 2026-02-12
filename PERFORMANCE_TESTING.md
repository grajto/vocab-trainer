# Performance Testing Guide

This guide provides instructions for testing the performance optimizations implemented in the vocab-trainer application.

## Prerequisites

1. **Database Connection**: Ensure `DATABASE_URL` is set in `.env` file with the following format:
   ```
   DATABASE_URL=postgresql://user:pass@host.neon.tech/db?sslmode=verify-full&pgbouncer=true&connect_timeout=5
   ```

2. **Run Migrations**: Ensure performance indexes are applied:
   ```bash
   npm run payload migrate
   ```

## Testing Checklist

### 1. Warmup Endpoint
Test the database connection warmup:

```bash
curl -i http://localhost:3000/api/warmup
```

**Expected Response:**
```http
HTTP/1.1 200 OK
Cache-Control: no-store
Content-Type: application/json

{"ok":true,"latencyMs":45}
```

**Success Criteria:**
- Status: 200 OK
- latencyMs: < 100ms (warm), < 500ms (cold start)

### 2. Cards Endpoint with Cache Headers
Test the optimized cards endpoint:

```bash
curl -i "http://localhost:3000/api/cards?limit=50&offset=0"
```

**Expected Response Headers:**
```http
HTTP/1.1 200 OK
Cache-Control: public, s-maxage=30, stale-while-revalidate=300
Content-Type: application/json
```

**Success Criteria:**
- Cache-Control header present
- Response includes: cards[], totalCount, hasMore, nextOffset
- Payload size: < 100 KB for 50 cards

### 3. Pagination
Test pagination parameters:

```bash
# Page 1
curl "http://localhost:3000/api/cards?limit=10&offset=0"

# Page 2
curl "http://localhost:3000/api/cards?limit=10&offset=10"

# Page 3
curl "http://localhost:3000/api/cards?limit=10&offset=20"
```

**Success Criteria:**
- Each request returns 10 cards
- nextOffset increments correctly
- hasMore is true until last page

### 4. Due Cards Filtering
Test the dueOnly parameter:

```bash
curl "http://localhost:3000/api/cards?dueOnly=true&limit=50"
```

**Success Criteria:**
- Only returns cards where isDue: true
- Payload is smaller than full card list

### 5. Deck/Folder Filtering
Test filtering by deck or folder:

```bash
# By deck
curl "http://localhost:3000/api/cards?deckId=123&limit=50"

# By folder
curl "http://localhost:3000/api/cards?folderId=456&limit=50"
```

**Success Criteria:**
- Returns only cards from specified deck/folder
- Maintains pagination support

## Performance Benchmarking

### Query Count Verification
Enable query logging in your database to verify query reduction:

**Before optimization:**
- Dashboard load: 6-8 queries
- Session start: 10+ queries

**After optimization:**
- Dashboard load: 2-3 queries
- Session start: 3 queries

### TTFB Measurement
Use browser DevTools Network tab or curl:

```bash
time curl -s -o /dev/null "http://localhost:3000/api/cards?limit=50"
```

**Target Metrics:**
- First request (cold): < 500ms
- Subsequent requests (warm): < 200ms
- With cache hit: < 50ms

### Payload Size Verification
Check response size:

```bash
curl "http://localhost:3000/api/cards?limit=50" | jq length
```

**Target:**
- 50 cards: 40-90 KB
- Fields included: id, deckId, front, back, cardType, reviewState, isDue

## Database Index Verification

Connect to your Neon database and verify indexes exist:

```sql
-- Check indexes on cards table
\d+ cards

-- Check indexes on review_states table
\d+ review_states

-- Verify index usage with EXPLAIN
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, deck_id, front, back
FROM cards
WHERE owner_id = 1 AND deck_id = ANY(ARRAY[1,2,3])
ORDER BY id
LIMIT 50;
```

**Expected:**
- `idx_cards_owner_deck` appears in query plan
- "Index Scan" not "Seq Scan"
- Execution time: < 10ms for typical queries

## Client-Side Caching Test

Create a test component to verify React Query:

```typescript
// app/test-performance/page.tsx
'use client'

import { useCards, usePrefetchCards } from '@/app/hooks/useCards'
import { useState } from 'react'

export default function TestPerformance() {
  const [deckId, setDeckId] = useState('1')
  const { data, isLoading, isFetching } = useCards({ deckId, limit: 50 })
  const prefetch = usePrefetchCards()

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Performance Test</h1>
      
      <div className="mb-4">
        <button
          onClick={() => setDeckId('1')}
          onMouseEnter={() => prefetch({ deckId: '1' })}
          className="mr-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Deck 1 (hover to prefetch)
        </button>
        <button
          onClick={() => setDeckId('2')}
          onMouseEnter={() => prefetch({ deckId: '2' })}
          className="mr-2 px-4 py-2 bg-green-500 text-white rounded"
        >
          Deck 2 (hover to prefetch)
        </button>
      </div>

      <div className="mb-4">
        <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
        <p>Fetching: {isFetching ? 'Yes' : 'No'}</p>
        <p>Cards: {data?.cards.length || 0}</p>
        <p>Total: {data?.totalCount || 0}</p>
      </div>

      {data?.cards.slice(0, 5).map(card => (
        <div key={card.id} className="border p-2 mb-2">
          <p><strong>{card.front}</strong> → {card.back}</p>
          <p className="text-sm text-gray-600">
            Due: {card.isDue ? 'Yes' : 'No'} | 
            Level: {card.reviewState?.level || 'New'}
          </p>
        </div>
      ))}
    </div>
  )
}
```

**Testing Steps:**
1. Navigate to the test page
2. Hover over "Deck 2" button - data prefetches in background
3. Click "Deck 2" button - data loads instantly from cache
4. Check Network tab - no new request if cache is fresh

**Success Criteria:**
- First click: Shows loading, fetches from API
- Hover: Prefetch happens in background
- Second click (within 5 min): No loading, instant from cache

## Load Testing

Use a tool like `autocannon` for load testing:

```bash
npm install -g autocannon

# Test warmup endpoint
autocannon -c 10 -d 30 http://localhost:3000/api/warmup

# Test cards endpoint
autocannon -c 10 -d 30 "http://localhost:3000/api/cards?limit=50"
```

**Target Metrics:**
- Requests/sec: > 100
- Latency p95: < 500ms
- Error rate: 0%

## Monitoring in Production

### Vercel Analytics
- Monitor TTFB in Vercel Analytics dashboard
- Track cache hit rates
- Alert on p95 > 500ms

### Neon Dashboard
- Monitor connection count (should stay < 100)
- Check query performance
- Monitor cold start frequency

### Query Performance Monitoring
Enable and check `pg_stat_statements`:

```sql
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time,
  rows
FROM pg_stat_statements
WHERE query LIKE '%cards%' OR query LIKE '%review_states%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

## Troubleshooting

### High TTFB
1. Check database location matches app region
2. Verify indexes are created
3. Check Neon compute status (may be suspended)
4. Increase `connect_timeout` if needed

### Cache Not Working
1. Verify `Cache-Control` header in response
2. Check Vercel edge network configuration
3. Ensure no `Cache-Control: no-store` overrides

### Slow Queries
1. Run EXPLAIN ANALYZE on slow queries
2. Check for missing indexes
3. Verify query patterns match index columns
4. Consider increasing Neon compute resources

### React Query Not Caching
1. Check QueryProvider is in app layout
2. Verify query keys are stable
3. Check staleTime configuration
4. Open React Query DevTools for debugging

## Expected Results Summary

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Queries/view | 4-10 | 1-3 | ✅ 70% reduction |
| Payload size | 150-300KB | 40-90KB | ✅ 60% reduction |
| TTFB (warm) | 350-700ms | 150-280ms | ✅ 50% reduction |
| Cold start | >1000ms | 400-900ms | ✅ 40% reduction |
| Cache hit rate | 0% | 80-95% | ✅ New capability |

## Rollback Procedure

If issues occur:

1. **Revert cache headers**:
   - Remove `Cache-Control` from API responses
   
2. **Disable client caching**:
   - Remove `QueryProvider` from layout.tsx
   
3. **Revert to original queries**:
   - Use direct Payload queries instead of optimized getDueCards

4. **Drop indexes** (last resort):
   ```sql
   DROP INDEX IF EXISTS idx_cards_owner_deck;
   DROP INDEX IF EXISTS idx_review_states_owner_due_card;
   ```

## Next Steps

After validating these optimizations:

1. Set up Vercel Cron for warmup endpoint (once daily for free plan, every 6 hours for Hobby plan, or every 5 minutes for Pro plan)
2. Enable production monitoring and alerts
3. Gather real-world metrics and compare to targets
4. Consider additional optimizations if needed:
   - Materialized views for complex aggregations
   - Redis cache layer for hot data
   - Database read replicas for analytics
