import { Connection, PublicKey } from "@solana/web3.js";
import { getTokenSymbol } from "./tokenSymbols";
import { getDexScreenerPair } from "./dexScreener";

// Raydium CLMM Program ID
const RAYDIUM_CLMM_PROGRAM_ID = new PublicKey('CAMMCzo5YL8w4VFF8KVHrK22GGUQp5Vpz8KqQqQqQqQqQqQqQq');

// In-memory cache for positions (30 seconds)
const positionsCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_DURATION = 30 * 1000;

// In-memory cache for pool token mints (60 seconds)
const poolTokenCache = new Map<string, { ts: number; tokenA?: string; tokenB?: string; poolType?: 'CLMM' | 'AMM' }>();
const POOL_CACHE_DURATION = 60 * 1000;

export interface RaydiumPosition {
  type: "CLMM" | "AMM";
  poolId: string;
  tokenA: string;
  tokenB: string;
  symbolA?: string;
  symbolB?: string;
  // CLMM-specific fields
  ticks?: {
    lower: number;
    upper: number;
  };
  liquidity?: string;
  // AMM-specific fields
  lpBalance?: string;
  lpMint?: string;
}

/**
 * Helper function to get real token mints for a Raydium pool
 * Uses DexScreener API to fetch token pair information
 */
async function getPoolTokenMints({ 
  connection, 
  poolId,
  poolType = 'CLMM'
}: { 
  connection: Connection; 
  poolId: string;
  poolType?: 'CLMM' | 'AMM';
}): Promise<{ tokenA?: string; tokenB?: string; poolType?: 'CLMM' | 'AMM' }> {
  
  // Check cache first
  const cached = poolTokenCache.get(poolId);
  if (cached && Date.now() - cached.ts < POOL_CACHE_DURATION) {
    return { tokenA: cached.tokenA, tokenB: cached.tokenB, poolType: cached.poolType };
  }

  // Use DexScreener API to get token pair information
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/pairs/solana/${poolId}`, { cache: "no-store" });
    if (!r.ok) throw new Error("dexscreener not ok");
    const j = await r.json();
    const pair = Array.isArray(j.pairs) && j.pairs.length ? j.pairs[0] : null;
    if (!pair) throw new Error("no pairs");
    
    // Determine pool type from DexScreener data
    const detectedPoolType: 'CLMM' | 'AMM' = pair.amm ? 'AMM' : 'CLMM';
    
    // DexScreener base/quote map to tokenA/B (order is not critical for display)
    const result = { 
      tokenA: pair.baseToken?.address, 
      tokenB: pair.quoteToken?.address,
      poolType: detectedPoolType
    };
    
    // Cache the result
    poolTokenCache.set(poolId, { ts: Date.now(), ...result });
    return result;
    
  } catch (error) {
    console.debug(`Failed to fetch token mints for Raydium pool ${poolId}:`, error);
    // Return empty object if DexScreener fails
    return { poolType };
  }
}

/**
 * Fetches Raydium CLMM positions owned by the given wallet
 * CLMM positions are typically represented as NFTs (amount=1, decimals=0)
 */
async function fetchClmmPositions({ 
  connection, 
  owner 
}: { 
  connection: Connection; 
  owner: string; 
}): Promise<RaydiumPosition[]> {
  
  try {
    const ownerPk = new PublicKey(owner);
    
    // Get owner token accounts (NFT filter: amount==1, decimals==0)
    const resp = await connection.getParsedTokenAccountsByOwner(ownerPk, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    });
    
    const candidateMints = resp.value
      .filter((v) => {
        const info = v.account.data.parsed.info.tokenAmount;
        return info.amount === "1" && info.decimals === 0;
      })
      .map((v) => v.account.data.parsed.info.mint);

    if (candidateMints.length === 0) {
      return [];
    }

    const out: RaydiumPosition[] = [];
    
    // For each candidate NFT, try to identify if it's a Raydium CLMM position
    for (const mint of candidateMints) {
      try {
        const mintPk = new PublicKey(mint);
        
        // Try to derive CLMM position PDA
        const [posPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("position"), mintPk.toBuffer()],
          RAYDIUM_CLMM_PROGRAM_ID
        );

        // Quick owner check
        const acc = await connection.getAccountInfo(posPda);
        if (!acc || acc.owner.toBase58() !== RAYDIUM_CLMM_PROGRAM_ID.toBase58()) continue;

        // Parse position account data (similar to Orca but for Raydium)
        const data = acc.data;
        
        // Skip discriminator (first 8 bytes)
        let offset = 8;
        
        // Read pool ID (32 bytes)
        const poolIdBytes = data.slice(offset, offset + 32);
        const poolId = new PublicKey(poolIdBytes).toBase58();
        offset += 32;
        
        // Skip positionMint (32 bytes) - we already have it
        offset += 32;
        
        // Read liquidity (16 bytes as BigInt)
        const liquidityBytes = data.slice(offset, offset + 16);
        const liquidity = BigInt('0x' + liquidityBytes.toString('hex')).toString();
        offset += 16;
        
        // Read tick indices (4 bytes each as signed integers)
        const tickLowerBytes = data.slice(offset, offset + 4);
        const tickUpperBytes = data.slice(offset + 4, offset + 8);
        
        const tickLower = tickLowerBytes.readInt32LE(0);
        const tickUpper = tickUpperBytes.readInt32LE(0);
        
        // Fetch real token mints from pool
        const { tokenA, tokenB } = await getPoolTokenMints({ connection, poolId, poolType: 'CLMM' });
        
        out.push({
          type: "CLMM",
          poolId: poolId,
          tokenA: tokenA || "",
          tokenB: tokenB || "",
          symbolA: tokenA ? getTokenSymbol(tokenA) : undefined,
          symbolB: tokenB ? getTokenSymbol(tokenB) : undefined,
          ticks: {
            lower: tickLower,
            upper: tickUpper
          },
          liquidity: liquidity
        });
      } catch (_) { 
        // skip bad candidate 
        console.debug(`Error processing CLMM position mint ${mint}:`, _);
      }
    }

    return out;
    
  } catch (error) {
    console.error("Error fetching Raydium CLMM positions:", error);
    return [];
  }
}

/**
 * Fetches Raydium AMM LP token balances owned by the given wallet
 * AMM positions are represented as LP token balances
 */
async function fetchAmmPositions({ 
  connection, 
  owner 
}: { 
  connection: Connection; 
  owner: string; 
}): Promise<RaydiumPosition[]> {
  
  try {
    const ownerPk = new PublicKey(owner);
    
    // Get owner token accounts with non-zero balances
    const resp = await connection.getParsedTokenAccountsByOwner(ownerPk, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    });
    
    const lpTokens = resp.value
      .filter((v) => {
        const info = v.account.data.parsed.info.tokenAmount;
        return info.amount !== "0" && info.amount !== "1"; // Non-zero, non-NFT balances
      })
      .map((v) => ({
        mint: v.account.data.parsed.info.mint,
        balance: v.account.data.parsed.info.tokenAmount.amount,
        decimals: v.account.data.parsed.info.tokenAmount.decimals
      }));

    if (lpTokens.length === 0) {
      return [];
    }

    const out: RaydiumPosition[] = [];
    
    // For each LP token, try to identify if it's a Raydium AMM pool
    for (const lpToken of lpTokens) {
      try {
        // Try to get pool info from DexScreener
        const pair = await getDexScreenerPair({ 
          tokenMint: lpToken.mint, 
          quoteMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // USDC
        });
        
        if (pair && pair.dexId === 'raydium') {
          // Fetch real token mints from pool
          const { tokenA, tokenB } = await getPoolTokenMints({ 
            connection, 
            poolId: pair.pool, 
            poolType: 'AMM' 
          });
          
          out.push({
            type: "AMM",
            poolId: pair.pool,
            tokenA: tokenA || pair.baseToken?.address || "",
            tokenB: tokenB || pair.quoteToken?.address || "",
            symbolA: tokenA ? getTokenSymbol(tokenA) : pair.baseToken?.symbol,
            symbolB: tokenB ? getTokenSymbol(tokenB) : pair.quoteToken?.symbol,
            lpBalance: lpToken.balance,
            lpMint: lpToken.mint
          });
        }
      } catch (_) { 
        // skip bad candidate 
        console.debug(`Error processing AMM LP token ${lpToken.mint}:`, _);
      }
    }

    return out;
    
  } catch (error) {
    console.error("Error fetching Raydium AMM positions:", error);
    return [];
  }
}

/**
 * Fetches all Raydium positions (CLMM + AMM) owned by the given wallet
 */
export async function fetchRaydiumPositions({ 
  connection, 
  owner 
}: { 
  connection: Connection; 
  owner: string; 
}): Promise<RaydiumPosition[]> {
  
  // Check cache first
  const cached = positionsCache.get(owner);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Fetch both CLMM and AMM positions in parallel
    const [clmmPositions, ammPositions] = await Promise.all([
      fetchClmmPositions({ connection, owner }),
      fetchAmmPositions({ connection, owner })
    ]);

    // Combine and sort by liquidity/balance
    const allPositions = [
      ...clmmPositions,
      ...ammPositions
    ];

    // Sort CLMM by liquidity desc, AMM by LP balance desc
    const sortedPositions = allPositions.sort((a, b) => {
      if (a.type === "CLMM" && b.type === "CLMM") {
        return BigInt(b.liquidity || "0") > BigInt(a.liquidity || "0") ? 1 : -1;
      } else if (a.type === "AMM" && b.type === "AMM") {
        return BigInt(b.lpBalance || "0") > BigInt(a.lpBalance || "0") ? 1 : -1;
      } else {
        // CLMM positions first
        return a.type === "CLMM" ? -1 : 1;
      }
    });

    // Cache the result
    positionsCache.set(owner, { data: sortedPositions, timestamp: Date.now() });

    // Clean up old cache entries (older than 5 minutes)
    const now = Date.now();
    for (const [key, value] of positionsCache.entries()) {
      if (now - value.timestamp > 5 * 60 * 1000) {
        positionsCache.delete(key);
      }
    }
    
    // Clean up old pool token cache entries (older than 2 minutes)
    for (const [key, value] of poolTokenCache.entries()) {
      if (now - value.ts > 2 * 60 * 1000) {
        poolTokenCache.delete(key);
      }
    }

    return sortedPositions;

  } catch (error) {
    console.error("Error fetching Raydium positions:", error);
    // Return empty array on error, don't break the UI
    return [];
  }
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  const now = Date.now();
  
  // Clear positions cache
  for (const [key, value] of positionsCache.entries()) {
    if (now - value.timestamp > 5 * 60 * 1000) {
      positionsCache.delete(key);
    }
  }
  
  // Clear pool token cache
  for (const [key, value] of poolTokenCache.entries()) {
    if (now - value.ts > 2 * 60 * 1000) {
      poolTokenCache.delete(key);
    }
  }
}

/**
 * Manually clear all cache entries
 */
export function clearAllCache(): void {
  positionsCache.clear();
  poolTokenCache.clear();
  console.info('Raydium positions cache cleared');
}

/**
 * Get cache statistics for debugging
 */
export function getCacheStats(): { 
  positionsSize: number; 
  poolTokensSize: number; 
  positionsEntries: Array<{ key: string; age: number }>;
  poolTokensEntries: Array<{ key: string; age: number }>;
} {
  const now = Date.now();
  
  const positionsEntries = Array.from(positionsCache.entries()).map(([key, value]) => ({
    key,
    age: Math.round((now - value.timestamp) / 1000) // age in seconds
  }));
  
  const poolTokensEntries = Array.from(poolTokenCache.entries()).map(([key, value]) => ({
    key,
    age: Math.round((now - value.ts) / 1000) // age in seconds
  }));
  
  return {
    positionsSize: positionsCache.size,
    poolTokensSize: poolTokenCache.size,
    positionsEntries,
    poolTokensEntries
  };
}
