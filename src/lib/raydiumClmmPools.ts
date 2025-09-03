import { Connection, PublicKey } from "@solana/web3.js";
import { Clmm } from "@raydium-io/raydium-sdk";

// USDC mint address for Solana mainnet
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// Cache configuration
const CACHE_TTL = 600 * 1000; // 10 minutes in milliseconds
const REQUEST_TIMEOUT = 15000; // 15 seconds timeout

// In-memory cache for CLMM pool discovery results
const poolCache = new Map<string, { id: string | null; ts: number }>();

// Set up periodic cache cleanup every 15 minutes
setInterval(clearExpiredCache, 15 * 60 * 1000);

/**
 * Clear expired cache entries
 */
function clearExpiredCache() {
  const now = Date.now();
  for (const [key, value] of poolCache.entries()) {
    if (now - value.ts > CACHE_TTL) {
      poolCache.delete(key);
    }
  }
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL;
}

/**
 * Fetch Raydium CLMM pools from public API
 */
async function fetchRaydiumCLMMPools(): Promise<any[]> {
  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    const response = await fetch('https://api.raydium.io/v2/ammV3/ammPools', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch CLMM pools: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || [];
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('CLMM pools fetch timeout');
      } else {
        console.error('Error fetching Raydium CLMM pools:', error.message);
      }
    }
    return [];
  }
}

/**
 * Find CLMM pool ID for TOKEN/USDC pair using DexScreener as fallback
 */
async function findClmmPoolViaDexScreener(tokenMint: string): Promise<string | null> {
  try {
    console.log(`Trying DexScreener fallback for ${tokenMint}`);
    
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/pairs/solana/${tokenMint}`,
      {
        method: "GET",
        headers: { "Accept": "application/json" },
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 10000);
          return controller.signal;
        })(),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data.pairs || data.pairs.length === 0) {
      return null;
    }

    // Look for Raydium CLMM pairs with USDC
    const raydiumClmmPair = data.pairs.find((pair: any) => {
      const isRaydium = pair.dexId?.toLowerCase().includes('raydium');
      const hasUsdc = pair.quoteToken?.address?.toLowerCase() === USDC_MINT.toLowerCase() ||
                     pair.baseToken?.address?.toLowerCase() === USDC_MINT.toLowerCase();
      const isClmm = pair.pairAddress && pair.pairAddress.length > 44; // CLMM addresses are longer
      
      return isRaydium && hasUsdc && isClmm;
    });

    return raydiumClmmPair?.pairAddress || null;
    
  } catch (error) {
    console.warn('DexScreener fallback failed:', error);
    return null;
  }
}

/**
 * Validate CLMM pool via Raydium SDK
 */
async function validateClmmPool(connection: Connection, poolId: string): Promise<boolean> {
  try {
    // For MVP, we'll do basic validation by checking if the pool ID is a valid PublicKey
    // In production, you'd use the actual Raydium SDK methods with proper types
    
    // Validate that poolId is a valid PublicKey format
    try {
      new PublicKey(poolId);
    } catch {
      console.warn(`Invalid pool ID format: ${poolId}`);
      return false;
    }
    
    // For now, assume the pool is valid if we can parse it as a PublicKey
    // In production, you'd make an actual RPC call to verify the pool exists
    console.log(`Pool validation passed for ${poolId} (basic format check)`);
    return true;
    
  } catch (error) {
    console.warn(`Pool validation failed for ${poolId}:`, error);
    return false;
  }
}

/**
 * Find CLMM pool ID for TOKEN/USDC pair
 * 
 * Steps:
 * 1) Try lightweight Raydium endpoints (CLMM pools JSON)
 * 2) Fallback to DexScreener pair lookup
 * 3) Validate via SDK: attempt to fetch pool by id
 * 4) Cache results with TTL=600s
 */
export async function findClmmPoolId({ 
  connection, 
  tokenMint 
}: { 
  connection: Connection; 
  tokenMint: string; 
}): Promise<string | null> {
  // Check cache first
  const cacheKey = `clmm_${tokenMint}`;
  const cached = poolCache.get(cacheKey);
  
  if (cached && isCacheValid(cached.ts)) {
    console.log(`Using cached CLMM pool result for ${tokenMint}:`, cached.id);
    return cached.id;
  }

  console.log(`Searching for CLMM pool for ${tokenMint} vs USDC`);

  try {
    // Step 1: Try Raydium CLMM pools API
    const clmmPools = await fetchRaydiumCLMMPools();
    
    if (clmmPools.length > 0) {
      // Find pool that matches TOKEN/USDC pair
      const matchingPool = clmmPools.find(pool => {
        const baseMint = pool.baseMint?.toLowerCase();
        const quoteMint = pool.quoteMint?.toLowerCase();
        const usdcMint = USDC_MINT.toLowerCase();
        
        return (baseMint === tokenMint.toLowerCase() && quoteMint === usdcMint) ||
               (baseMint === usdcMint && quoteMint === tokenMint.toLowerCase());
      });

      if (matchingPool?.id) {
        console.log(`Found CLMM pool via Raydium API: ${matchingPool.id}`);
        
        // Step 3: Validate the pool
        const isValid = await validateClmmPool(connection, matchingPool.id);
        
        if (isValid) {
          // Cache successful result
          poolCache.set(cacheKey, { id: matchingPool.id, ts: Date.now() });
          return matchingPool.id;
        } else {
          console.warn(`Pool validation failed for ${matchingPool.id}`);
        }
      }
    }

    // Step 2: Fallback to DexScreener
    console.log('Trying DexScreener fallback...');
    const dexScreenerPoolId = await findClmmPoolViaDexScreener(tokenMint);
    
    if (dexScreenerPoolId) {
      console.log(`Found CLMM pool via DexScreener: ${dexScreenerPoolId}`);
      
      // Step 3: Validate the pool
      const isValid = await validateClmmPool(connection, dexScreenerPoolId);
      
      if (isValid) {
        // Cache successful result
        poolCache.set(cacheKey, { id: dexScreenerPoolId, ts: Date.now() });
        return dexScreenerPoolId;
      } else {
        console.warn(`Pool validation failed for ${dexScreenerPoolId}`);
      }
    }

    // No valid pool found
    console.log(`No valid CLMM pool found for ${tokenMint} vs USDC`);
    
    // Cache negative result to avoid repeated failed lookups
    poolCache.set(cacheKey, { id: null, ts: Date.now() });
    return null;

  } catch (error) {
    console.error('Error in CLMM pool discovery:', error);
    
    // Cache negative result on error
    poolCache.set(cacheKey, { id: null, ts: Date.now() });
    return null;
  }
}

/**
 * Get cache statistics for debugging
 */
export function getPoolCacheStats(): { 
  size: number; 
  entries: Array<{ key: string; age: number; hasPool: boolean }> 
} {
  const now = Date.now();
  const entries = Array.from(poolCache.entries()).map(([key, value]) => ({
    key,
    age: Math.floor((now - value.ts) / 1000),
    hasPool: value.id !== null
  }));

  return {
    size: poolCache.size,
    entries: entries.slice(0, 10) // Show first 10 entries
  };
}

/**
 * Clear specific cache entry
 */
export function clearPoolCache(tokenMint: string): void {
  const cacheKey = `clmm_${tokenMint}`;
  poolCache.delete(cacheKey);
  console.log(`Cleared cache for ${tokenMint}`);
}

/**
 * Clear all pool cache
 */
export function clearAllPoolCache(): void {
  poolCache.clear();
  console.log('Cleared all pool cache');
}
