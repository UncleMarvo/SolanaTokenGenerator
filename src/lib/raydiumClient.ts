import { PublicKey } from '@solana/web3.js';
import { getDexScreenerPair, USDC_MINT as DEXSCREENER_USDC_MINT, WSOL_MINT as DEXSCREENER_WSOL_MINT } from './dexScreener';

// Common token mints
const WSOL_MINT = 'So11111111111111111111111111111111111111112'; // Wrapped SOL
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_RESPONSE_SIZE = 8 * 1024 * 1024; // 8 MB in bytes
const REQUEST_TIMEOUT = 8000; // 8 seconds in milliseconds

// In-memory cache for Raydium API responses
const raydiumCache = new Map<string, { ts: number; json: any }>();

// Set up periodic cache cleanup every 10 minutes
setInterval(clearExpiredCache, 10 * 60 * 1000);

/**
 * Helper function to reconstruct response from chunks
 */
function reconstructResponseFromChunks(chunks: Uint8Array[]): string {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combinedArray = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combinedArray.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(combinedArray);
}

export interface RaydiumQuoteRequest {
  tokenMint: string;
  baseAmount: string;
  quoteMint: string;
}

export interface RaydiumQuoteResponse {
  pool: string;
  priceImpact: number;
  lpFee: number;
  expectedLpTokens: string;
  minOut: string;
  source?: 'Raydium' | 'DexScreener'; // Optional source for debugging
}

interface RaydiumPool {
  id: string;
  baseMint: string;
  quoteMint: string;
  lpMint: string;
  baseDecimals: number;
  quoteDecimals: number;
  lpDecimals: number;
  baseReserve: string;
  quoteReserve: string;
  lpSupply: string;
  feeRate: number;
  poolType: 'AMM' | 'CLMM';
}

interface RaydiumAMMPool {
  id: string;
  baseMint: string;
  quoteMint: string;
  lpMint: string;
  baseDecimals: number;
  quoteDecimals: number;
  lpDecimals: number;
  baseReserve: string;
  quoteReserve: string;
  lpSupply: string;
  feeRate: number;
}

interface RaydiumCLMMPool {
  id: string;
  baseMint: string;
  quoteMint: string;
  lpMint: string;
  baseDecimals: number;
  quoteDecimals: number;
  lpDecimals: number;
  baseReserve: string;
  quoteReserve: string;
  lpSupply: string;
  feeRate: number;
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL;
}

/**
 * Fetch Raydium AMM pools from public API with caching, timeout, and size limits
 */
async function fetchRaydiumAMMPools(): Promise<RaydiumAMMPool[]> {
  const cacheKey = 'amm';
  const cached = raydiumCache.get(cacheKey);
  
  // Check cache first
  if (cached && isCacheValid(cached.ts)) {
    console.info('Using cached AMM pools data');
    return cached.json.official || [];
  }
  
  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    const response = await fetch('https://api.raydium.io/v2/sdk/liquidity/mainnet.json', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch AMM pools: ${response.status}`);
    }
    
    // Check response size using body reader
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body not readable');
    }
    
    let totalSize = 0;
    const chunks: Uint8Array[] = [];
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        totalSize += value.length;
        chunks.push(value);
        
        // Check size limit
        if (totalSize > MAX_RESPONSE_SIZE) {
          reader.cancel();
          throw new Error(`Response too large: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    // Reconstruct response from chunks
    const responseText = reconstructResponseFromChunks(chunks);
    
    const data = JSON.parse(responseText);
    
    // Cache successful response
    raydiumCache.set(cacheKey, { ts: Date.now(), json: data });
    
    return data.official || [];
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('AMM pools fetch timeout, will use DexScreener fallback');
      } else if (error.message.includes('too large')) {
        console.warn('AMM pools response too large, will use DexScreener fallback');
      } else {
        console.error('Error fetching Raydium AMM pools:', error.message);
      }
    }
    return [];
  }
}

/**
 * Fetch Raydium CLMM pools from public API with caching, timeout, and size limits
 */
async function fetchRaydiumCLMMPools(): Promise<RaydiumCLMMPool[]> {
  const cacheKey = 'clmm';
  const cached = raydiumCache.get(cacheKey);
  
  // Check cache first
  if (cached && isCacheValid(cached.ts)) {
    console.info('Using cached CLMM pools data');
    return cached.json.data || [];
  }
  
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
    
    // Check response size using body reader
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body not readable');
    }
    
    let totalSize = 0;
    const chunks: Uint8Array[] = [];
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        totalSize += value.length;
        chunks.push(value);
        
        // Check size limit
        if (totalSize > MAX_RESPONSE_SIZE) {
          reader.cancel();
          throw new Error(`Response too large: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
        }
      }
    } finally {
      reader.releaseLock();
    }
    
    // Reconstruct response from chunks
    const responseText = reconstructResponseFromChunks(chunks);
    
    const data = JSON.parse(responseText);
    
    // Cache successful response
    raydiumCache.set(cacheKey, { ts: Date.now(), json: data });
    
    return data.data || [];
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('CLMM pools fetch timeout, will use DexScreener fallback');
      } else if (error.message.includes('too large')) {
        console.warn('CLMM pools response too large, will use DexScreener fallback');
      } else {
        console.error('Error fetching Raydium CLMM pools:', error.message);
      }
    }
    return [];
  }
}

/**
 * Find the best matching pool for a token pair
 */
function findBestPool(
  pools: RaydiumPool[],
  tokenMint: string,
  quoteMint: string
): RaydiumPool | null {
  // Filter pools that match our token pair
  const matchingPools = pools.filter(pool => {
    return (pool.baseMint === tokenMint && pool.quoteMint === quoteMint) ||
           (pool.baseMint === quoteMint && pool.quoteMint === tokenMint);
  });

  if (matchingPools.length === 0) {
    return null;
  }

  // Prefer CLMM pools over AMM pools
  const clmmPools = matchingPools.filter(pool => pool.poolType === 'CLMM');
  const ammPools = matchingPools.filter(pool => pool.poolType === 'AMM');

  // Sort by liquidity (higher reserves = better pool)
  const sortByLiquidity = (pools: RaydiumPool[]) => {
    return pools.sort((a, b) => {
      const liquidityA = Number(a.baseReserve) + Number(a.quoteReserve);
      const liquidityB = Number(b.baseReserve) + Number(b.quoteReserve);
      return liquidityB - liquidityA;
    });
  };

  // Return best CLMM pool if available, otherwise best AMM pool
  if (clmmPools.length > 0) {
    return sortByLiquidity(clmmPools)[0];
  } else if (ammPools.length > 0) {
    return sortByLiquidity(ammPools)[0];
  }

  return null;
}

/**
 * Calculate price impact based on amount and reserves
 */
function calculatePriceImpact(baseAmount: number, baseReserve: number): number {
  const impact = (baseAmount / baseReserve) * 100;
  return Math.min(impact, 5); // Cap at 5%
}

/**
 * Get Raydium quote for adding liquidity
 */
export async function getRaydiumQuote(request: RaydiumQuoteRequest): Promise<RaydiumQuoteResponse> {
  try {
    const { tokenMint, baseAmount, quoteMint } = request;
    
    // Validate inputs
    if (!tokenMint || !baseAmount || !quoteMint) {
      throw new Error('Missing required parameters');
    }
    
    // Parse public keys to validate format
    new PublicKey(tokenMint);
    new PublicKey(quoteMint);
    const baseAmountBN = BigInt(baseAmount);
    const baseAmountNum = Number(baseAmountBN);
    
    try {
      // Fetch both AMM and CLMM pools
      const [ammPools, clmmPools] = await Promise.all([
        fetchRaydiumAMMPools(),
        fetchRaydiumCLMMPools()
      ]);
      
      // Combine and normalize pools
      const allPools: RaydiumPool[] = [
        ...ammPools.map(pool => ({ ...pool, poolType: 'AMM' as const })),
        ...clmmPools.map(pool => ({ ...pool, poolType: 'CLMM' as const }))
      ];
      
      // Find the best pool for our token pair
      const bestPool = findBestPool(allPools, tokenMint, quoteMint);
      
      if (!bestPool) {
        throw new Error('No Raydium pool available');
      }
      
      // Determine which token is base and which is quote
      const isBaseToken = bestPool.baseMint === tokenMint;
      const baseReserve = Number(bestPool.baseReserve);
      const quoteReserve = Number(bestPool.quoteReserve);
      const lpSupply = Number(bestPool.lpSupply);
      
      // Calculate price
      const price = quoteReserve / baseReserve;
      
      // Calculate required quote amount
      const requiredQuote = baseAmountNum * price;
      
              // Calculate expected LP tokens
        let expectedLpTokens: string;
        if (lpSupply > 0) {
          const lpForBase = baseAmountNum * lpSupply / baseReserve;
          const lpForQuote = requiredQuote * lpSupply / quoteReserve;
          const expected = Math.min(lpForBase, lpForQuote);
          expectedLpTokens = (Math.round(expected * 100) / 100).toString(); // Round to 2 decimals
        } else {
          expectedLpTokens = '~'; // Conservative estimate when lpSupply not available
        }
      
      // Calculate price impact
      const priceImpact = calculatePriceImpact(baseAmountNum, baseReserve);
      
      // Get LP fee (use pool's fee rate or default to 0.25% for AMM)
      const lpFee = bestPool.feeRate || (bestPool.poolType === 'AMM' ? 0.0025 : 0.003);
      
              // Calculate minimum output with 1% slippage
        const minOut = baseAmountNum * 0.99;
        
        return {
          pool: bestPool.id,
          priceImpact: Math.round(priceImpact * 100) / 100, // Round to 2 decimals
          lpFee: Math.round(lpFee * 10000) / 10000, // Round to 4 decimals
          expectedLpTokens: expectedLpTokens,
          minOut: (Math.round(minOut * 100) / 100).toString(), // Round to 2 decimals
          source: 'Raydium'
        };
      
    } catch (raydiumError) {
      console.warn('Raydium pool fetch failed, trying DexScreener fallback:', raydiumError);
      
      // Try DexScreener fallback
      const dexScreenerPair = await getDexScreenerPair({ tokenMint, quoteMint });
      
      if (dexScreenerPair) {
        console.log('Using DexScreener fallback for quote');
        
        // Calculate required quote amount
        const requiredQuote = baseAmountNum * dexScreenerPair.price;
        
        // Calculate price impact (crude estimate, capped at 2.5%)
        const priceImpactBp = Math.min((baseAmountNum / dexScreenerPair.reservesBase) * 10000, 250);
        
        // Use conservative default LP fee (0.25%)
        const lpFeeBp = 25;
        
        // Expected LP tokens unknown without LP supply
        const expectedLpTokens = '~';
        
        // Calculate minimum output with 1% slippage
        const minOut = baseAmountNum * 0.99;
        
        return {
          pool: dexScreenerPair.pool,
          priceImpact: Math.round(priceImpactBp / 100) / 100, // Convert from bps to percentage
          lpFee: Math.round(lpFeeBp / 10000 * 100) / 100, // Convert from bps to decimal
          expectedLpTokens,
          minOut: (Math.round(minOut * 100) / 100).toString(),
          source: 'DexScreener'
        };
      }
      
      // If both Raydium and DexScreener fail, throw the original error
      throw raydiumError;
    }
    
  } catch (error) {
    console.error('Error getting Raydium quote:', error);
    
    // If it's a validation error, throw it
    if (error instanceof Error && error.message.includes('Invalid public key')) {
      throw new Error('Invalid token mint address');
    }
    
    // Re-throw the error
    throw error;
  }
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  const now = Date.now();
  const entries = Array.from(raydiumCache.entries());
  for (const [key, value] of entries) {
    if (!isCacheValid(value.ts)) {
      raydiumCache.delete(key);
    }
  }
}

/**
 * Manually clear all cache entries
 */
export function clearAllCache(): void {
  raydiumCache.clear();
  console.info('Raydium cache cleared');
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): { size: number; entries: Array<{ key: string; age: number }> } {
  const now = Date.now();
  const entries = Array.from(raydiumCache.entries()).map(([key, value]) => ({
    key,
    age: Math.round((now - value.ts) / 1000) // age in seconds
  }));
  
  return {
    size: raydiumCache.size,
    entries
  };
}

/**
 * Get available Raydium pools for a token
 */
export async function getAvailableRaydiumPools(tokenMint: string): Promise<string[]> {
  try {
    // Validate token mint format
    new PublicKey(tokenMint);
    
    // Fetch pools
    const [ammPools, clmmPools] = await Promise.all([
      fetchRaydiumAMMPools(),
      fetchRaydiumCLMMPools()
    ]);
    
    // Find pools containing the token
    const allPools = [...ammPools, ...clmmPools];
    const matchingPools = allPools.filter(pool => 
      pool.baseMint === tokenMint || pool.quoteMint === tokenMint
    );
    
    return matchingPools.map(pool => pool.id);
    
  } catch (error) {
    console.error('Error getting available Raydium pools:', error);
    return [];
  }
}

