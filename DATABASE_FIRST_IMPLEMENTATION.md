# Database-First Implementation for Positions & LP APIs

## Overview

This implementation provides a database-first approach for positions and LP API endpoints, reducing on-chain RPC calls while maintaining data freshness.

## Key Components

### 1. Freshness Utility (`src/lib/freshness.ts`)

- **FRESH_TTL_MS**: 3 minutes (180,000 ms) for data freshness
- **isFresh()**: Check if timestamp is within TTL
- **getDataAge()**: Get age of data in milliseconds
- **needsRefresh()**: Check if data needs refresh

### 2. Positions API (`src/pages/api/positions.ts`)

**Database-First Logic:**
- Query database for CLMM positions by wallet
- If all positions are fresh (updatedAt < 3 min) → return database data
- If any positions are stale → fetch from chain and merge results
- Best-effort database upsert for new positions

**AMM LP Handling:**
- Keeps existing on-chain scan for AMM positions (no DB schema needed)
- Falls back to in-memory cache for AMM data

**Response Source Tracking:**
- `"database"`: All data from database
- `"chain"`: All data from chain (database failed)
- `"mixed"`: Fresh database data + fresh chain data

### 3. Token LP API (`src/pages/api/token/lp.ts`)

**LP Presence Check:**
- Check database for fresh position data containing the mint
- If fresh database data exists → use for LP presence
- If database check fails or is stale → fall back to chain check
- Best-effort database upsert for new LP data

**Graceful Fallbacks:**
- Database failures don't break the request
- Chain data always available as fallback
- Partial data returned even on errors

## Database Schema

### PositionsClmm Table
```sql
model PositionsClmm {
  positionMint  String   @id
  wallet        String
  poolId        String
  tokenA        String
  tokenB        String
  decA          Int
  decB          Int
  tickLower     Int
  tickUpper     Int
  lastLiquidity String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([wallet])
  @@index([tokenA])
  @@index([tokenB])
  @@index([updatedAt])
}
```

## Benefits

1. **Reduced RPC Calls**: Database serves fresh data without hitting chain
2. **Faster Response**: Database queries are faster than RPC calls
3. **Cost Savings**: Fewer RPC calls reduce infrastructure costs
4. **Graceful Degradation**: Falls back to chain when database fails
5. **Data Consistency**: 3-minute TTL ensures reasonable data freshness

## Implementation Notes

- **Best-Effort Upserts**: Database operations don't fail the request
- **Parallel Processing**: Chain fetches happen in parallel when needed
- **Smart Merging**: Fresh database data merged with fresh chain data
- **Cache Fallback**: In-memory cache for AMM positions (no DB needed)

## Testing

To test the implementation:

1. **Fresh Database Data**: Query positions for a wallet with recent activity
2. **Stale Database Data**: Query positions for a wallet with old data
3. **Database Failure**: Test with invalid database connection
4. **Mixed Sources**: Test with some fresh and some stale data

## Future Enhancements

- Enhanced position metadata storage
- Better LP presence tracking
- Configurable TTL per data type
- Background refresh jobs
- Metrics and monitoring
