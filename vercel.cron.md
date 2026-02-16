# Vercel Cron Configuration

## Current Setup (Pro Plan)
- **Schedule**: Every 5 minutes (`*/5 * * * *`)
- **Purpose**: Keep Neon database warm to prevent cold starts
- **Rationale**: Aggressive warmup schedule ensures database stays consistently warm for optimal performance

## Why Database Warmup Matters
- **Neon Behavior**: Database can suspend after periods of inactivity
- **Cold Start Impact**: 5-10 seconds delay when database needs to wake up
- **User Experience**: First session start after idle period can be very slow

## Schedule Options by Plan

### Free Plan
```json
{
  "schedule": "0 0 * * *"
}
```
- Runs once daily at midnight UTC
- Limitation: Vercel Free plan allows only 1 cron job per day
- Minimal protection against cold starts

### Hobby Plan
```json
{
  "schedule": "0 */6 * * *"
}
```
- Runs every 6 hours
- Keeps database warmer during active usage periods
- Reduces likelihood of cold starts

### Pro Plan (Current)
```json
{
  "schedule": "*/5 * * * *"
}
```
- Runs every 5 minutes (288 times per day)
- Database stays consistently warm
- Minimal cold start impact
- Trade-off: Higher execution count but much better UX

## Implementation Notes

The warmup endpoint (`/api/warmup`) performs a simple query to wake the database:
- Edge runtime for fast execution
- Minimal query (`SELECT 1`) to wake the DB
- Region-pinned to `fra1` (close to Neon EU)
- Returns latency measurement for monitoring
- Includes `Cache-Control: no-store` header to prevent caching
- Public endpoint (no auth) for Vercel cron compatibility

## Alternative Solutions

If frequent cron jobs aren't available:
1. **Client-side warmup**: Trigger warmup on app load
2. **Connection pooling**: Use Neon's connection pooling (already implemented)
3. **Edge runtime**: Faster cold starts (implemented in `/api/warmup`)
4. **Neon paid tier**: Never suspends with "Always On" feature
