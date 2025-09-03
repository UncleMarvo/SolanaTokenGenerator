/**
 * Data freshness utilities for caching and database-first approaches
 * Provides consistent TTL checking across the application
 */

// 3 minutes TTL for fresh data
export const FRESH_TTL_MS = 180_000;

/**
 * Check if a timestamp is still fresh (within TTL)
 * @param ts - Timestamp as number (milliseconds) or Date object
 * @returns true if data is fresh, false if stale or invalid
 */
export function isFresh(ts?: number | Date): boolean {
  if (!ts) return false;
  
  const timestamp = typeof ts === "number" ? ts : ts.getTime();
  const now = Date.now();
  
  return (now - timestamp) < FRESH_TTL_MS;
}

/**
 * Get the age of data in milliseconds
 * @param ts - Timestamp as number (milliseconds) or Date object
 * @returns Age in milliseconds, or Infinity if invalid
 */
export function getDataAge(ts?: number | Date): number {
  if (!ts) return Infinity;
  
  const timestamp = typeof ts === "number" ? ts : ts.getTime();
  const now = Date.now();
  
  return now - timestamp;
}

/**
 * Check if data needs refresh (is stale)
 * @param ts - Timestamp as number (milliseconds) or Date object
 * @returns true if data needs refresh, false if still fresh
 */
export function needsRefresh(ts?: number | Date): boolean {
  return !isFresh(ts);
}
