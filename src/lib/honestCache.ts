import { PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import { getConnection } from "@/lib/rpc";

/**
 * Honest status result type
 * Contains mint authority information and verification status
 */
export type Honest = { 
  mint: string; 
  mintNull: boolean; 
  freezeNull: boolean; 
  isHonest: boolean; 
  error?: string 
};

// Cache configuration - 60 seconds default TTL
const CACHE_MS = Number(process.env.HONEST_CACHE_MS || 60000);

// In-memory cache storage
// Key: mint address string, Value: { timestamp, cached value }
const cache = new Map<string, { t: number; v: Honest }>();

// Inflight request deduplication
// Prevents multiple simultaneous requests for the same mint
const inflight = new Map<string, Promise<Honest>>();

/**
 * Invalidate cached honest status for a specific mint
 * @param mint - The mint address to invalidate from cache
 */
export function invalidateHonest(mint: string) {
  cache.delete(mint);
}

/**
 * Read honest status directly from blockchain (bypasses cache)
 * @param mintStr - The mint address to check
 * @returns Promise<Honest> - The honest status result
 */
export async function readHonestFresh(mintStr: string): Promise<Honest> {
  try {
    // Get connection to Solana blockchain
    const conn = getConnection("primary");
    const mintPk = new PublicKey(mintStr);
    
    // Fetch mint account information
    const acc = await getMint(conn, mintPk);
    
    // Check if authorities are null (honest launch requirement)
    const mintNull = acc.mintAuthority === null;
    const freezeNull = acc.freezeAuthority === null;
    
    // Token is honest if both authorities are null
    const isHonest = mintNull && freezeNull;
    
    return { 
      mint: mintStr, 
      mintNull, 
      freezeNull, 
      isHonest 
    };
  } catch (e: any) {
    // Return error result with structured format
    return { 
      mint: mintStr, 
      isHonest: false, 
      mintNull: false, 
      freezeNull: false, 
      error: e?.message || "read-failed" 
    };
  }
}

/**
 * Read honest status with caching support
 * @param mintStr - The mint address to check
 * @param options - Cache options
 * @param options.bust - If true, bypass cache and fetch fresh data
 * @returns Promise<Honest> - The honest status result (cached or fresh)
 */
export async function readHonestCached(
  mintStr: string, 
  { bust = false } = {}
): Promise<Honest> {
  // Force cache bust if requested
  if (bust) {
    invalidateHonest(mintStr);
  }
  
  const now = Date.now();
  const hit = cache.get(mintStr);
  
  // Return cached result if still valid (within TTL)
  if (hit && now - hit.t < CACHE_MS) {
    return hit.v;
  }

  // Check if there's already an inflight request for this mint
  if (inflight.has(mintStr)) {
    return inflight.get(mintStr)!;
  }

  // Create new request and store in inflight map
  const p = (async () => {
    try {
      // Fetch fresh data from blockchain
      const v = await readHonestFresh(mintStr);
      
      // Cache the result with current timestamp
      cache.set(mintStr, { t: now, v });
      
      return v;
    } finally {
      // Always clean up inflight request
      inflight.delete(mintStr);
    }
  })();

  // Store the promise to prevent duplicate requests
  inflight.set(mintStr, p);
  return p;
}
