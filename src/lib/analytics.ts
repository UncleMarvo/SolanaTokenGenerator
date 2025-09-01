export type TokenStats = {
  price?: number;
  change24h?: number;
  liquidityUSD?: number;
  holders?: number;
  source?: "dexscreener";
};

// In-memory cache with 60 second TTL
const tokenStatsCache = new Map<string, { ts: number; data: TokenStats }>();
const CACHE_TTL = 60 * 1000; // 60 seconds

export async function fetchTokenStats(mint: string): Promise<TokenStats> {
  // Check cache first
  const cached = tokenStatsCache.get(mint);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const stats: TokenStats = {};
  
  try {
    // Fetch DexScreener data with 8 second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.pairs && Array.isArray(data.pairs) && data.pairs.length > 0) {
          // Find the best Solana pair (highest liquidity)
          const solanaPairs = data.pairs.filter((pair: any) => 
            pair.chainId === 'solana' && pair.liquidity?.usd
          );
          
          if (solanaPairs.length > 0) {
            // Sort by liquidity (highest first)
            solanaPairs.sort((a: any, b: any) => 
              (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
            );
            
            const bestPair = solanaPairs[0];
            
            // Extract price data
            if (bestPair.priceUsd) {
              stats.price = parseFloat(bestPair.priceUsd);
            }
            
            // Extract 24h change
            if (bestPair.priceChange?.h24) {
              stats.change24h = parseFloat(bestPair.priceChange.h24);
            }
            
            // Extract liquidity
            if (bestPair.liquidity?.usd) {
              stats.liquidityUSD = parseFloat(bestPair.liquidity.usd);
            }
            
            stats.source = "dexscreener";
          }
        }
      }
    } catch (dexError) {
      clearTimeout(timeoutId);
      console.warn("DexScreener fetch failed:", dexError);
    }
    
    // Try to fetch holders count from Solscan (best-effort)
    try {
      const holdersController = new AbortController();
      const holdersTimeoutId = setTimeout(() => holdersController.abort(), 5000);
      
      const holdersResponse = await fetch(
        `https://public-api.solscan.io/token/holders?tokenAddress=${mint}&offset=0&limit=1`,
        { signal: holdersController.signal }
      );
      
      clearTimeout(holdersTimeoutId);
      
      if (holdersResponse.ok && holdersResponse.status !== 429) {
        const holdersData = await holdersResponse.json();
        if (holdersData.total) {
          stats.holders = parseInt(holdersData.total);
        }
      }
    } catch (holdersError) {
      // Silently fail for holders - it's optional
      console.warn("Solscan holders fetch failed:", holdersError);
    }
    
  } catch (error) {
    console.warn("Token stats fetch failed:", error);
  }
  
  // Cache the result (even if partial)
  tokenStatsCache.set(mint, { ts: Date.now(), data: stats });
  
  return stats;
}

// Utility function to clear expired cache entries
export function clearExpiredCache() {
  const now = Date.now();
  const entries = Array.from(tokenStatsCache.entries());
  for (const [key, value] of entries) {
    if (now - value.ts >= CACHE_TTL) {
      tokenStatsCache.delete(key);
    }
  }
}

// Clear cache every 2 minutes
setInterval(clearExpiredCache, 2 * 60 * 1000);
