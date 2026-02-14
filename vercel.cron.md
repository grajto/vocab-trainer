# Vercel Cron Configuration

## Current Setup (Free Plan)
- **Schedule**: Daily at midnight UTC (`0 0 * * *`)
- **Limitation**: Vercel Free plan allows only 1 cron job per day
- **Purpose**: Keep Neon database warm to prevent cold starts

## Why Database Warmup Matters
- **Neon Behavior**: Database suspends after 5 minutes of inactivity
- **Cold Start Impact**: 5-10 seconds delay when database needs to wake up
- **User Experience**: First session start after idle period can be very slow

## Recommended for Paid Plans

### Hobby Plan
```json
{
  "schedule": "0 */6 * * *"
}
```
- Runs every 6 hours
- Keeps database warmer during active usage periods
- Reduces likelihood of cold starts

### Pro Plan
```json
{
  "schedule": "*/5 * * * *"
}
```
- Runs every 5 minutes
- Database stays consistently warm
- Minimal cold start impact

## Implementation Notes

The warmup endpoint (`/api/warmup`) performs a simple query to wake the database:
- Fetches 1 deck with minimal depth
- Returns latency measurement for monitoring
- Includes `Cache-Control: no-store` header to prevent caching

## Alternative Solutions

If frequent cron jobs aren't available:
1. **Client-side warmup**: Trigger warmup on app load
2. **Connection pooling**: Use Neon's connection pooling (already implemented)
3. **Edge runtime**: Faster cold starts (implemented in `/api/warmup`)
4. **Neon paid tier**: Never suspends with "Always On" feature
