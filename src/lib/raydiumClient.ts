import { PublicKey } from '@solana/web3.js';

// Common token mints
const WSOL_MINT = 'So11111111111111111111111111111111111111112'; // Wrapped SOL
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

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
 * Fetch Raydium AMM pools from public API
 */
async function fetchRaydiumAMMPools(): Promise<RaydiumAMMPool[]> {
  try {
    const response = await fetch('https://api.raydium.io/v2/sdk/liquidity/mainnet.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch AMM pools: ${response.status}`);
    }
    
    const data = await response.json();
    return data.official || [];
  } catch (error) {
    console.error('Error fetching Raydium AMM pools:', error);
    return [];
  }
}

/**
 * Fetch Raydium CLMM pools from public API
 */
async function fetchRaydiumCLMMPools(): Promise<RaydiumCLMMPool[]> {
  try {
    const response = await fetch('https://api.raydium.io/v2/ammV3/ammPools');
    if (!response.ok) {
      throw new Error(`Failed to fetch CLMM pools: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching Raydium CLMM pools:', error);
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
      expectedLpTokens = Math.round(expected * 100) / 100; // Round to 2 decimals
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
      expectedLpTokens: expectedLpTokens.toString(),
      minOut: Math.round(minOut * 100) / 100 // Round to 2 decimals
    };
    
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

