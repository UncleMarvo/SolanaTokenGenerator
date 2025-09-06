import { Connection, PublicKey } from '@solana/web3.js';
import { IS_DEVNET, DEV_DISABLE_DEXSCR } from './env';

// Initialize Solana connection
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// Common token mints
const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

export interface OrcaQuoteRequest {
  tokenMint: string;
  baseAmount: string;
  quoteMint: string;
}

export interface OrcaQuoteResponse {
  pool: string;
  priceImpact: number;
  lpFee: number;
  expectedLpTokens: string;
  minOut: string;
}

/**
 * Get Orca Whirlpool quote for adding liquidity
 * Uses DexScreener API to find real pool addresses and get basic quote data
 */
export async function getOrcaQuote(request: OrcaQuoteRequest): Promise<OrcaQuoteResponse> {
  try {
    const { tokenMint, baseAmount, quoteMint } = request;
    
    // Validate inputs
    if (!tokenMint || !baseAmount || !quoteMint) {
      throw new Error('Missing required parameters');
    }
    
    // Parse public keys to validate format
    const tokenMintPubkey = new PublicKey(tokenMint);
    const quoteMintPubkey = new PublicKey(quoteMint);
    const baseAmountBN = BigInt(baseAmount);
    
    // Try to find a real Orca pool using DexScreener API (mainnet only)
    let poolAddress: string;
    
    if (IS_DEVNET) {
      // On devnet, DexScreener doesn't have data for test tokens
      // For testing purposes, we'll generate a deterministic pool address
      // This allows the commit flow to work for testing without real pools
      const tokenA = tokenMintPubkey.toBase58();
      const tokenB = quoteMintPubkey.toBase58();
      const sortedTokens = [tokenA, tokenB].sort();
      poolAddress = `orca_devnet_${sortedTokens[0].slice(0, 8)}_${sortedTokens[1].slice(0, 8)}`;
      console.log(`[DEVNET] Generated test pool address: ${poolAddress}`);
    } else {
      // On mainnet, use DexScreener to find real Orca pools (unless disabled on devnet)
      if (DEV_DISABLE_DEXSCR) {
        throw new Error('DexScreener API calls disabled on devnet');
      }
      
      try {
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`, { 
          cache: "no-store" 
        });
        
        if (response.ok) {
          const data = await response.json();
          const orcaPools = data.pairs?.filter((pair: any) => 
            pair.dexId === 'orca' && 
            (pair.baseToken?.address === tokenMint || pair.quoteToken?.address === tokenMint) &&
            (pair.baseToken?.address === quoteMint || pair.quoteToken?.address === quoteMint)
          );
          
          if (orcaPools && orcaPools.length > 0) {
            // Use the first Orca pool found
            poolAddress = orcaPools[0].pairAddress;
          } else {
            throw new Error('No Orca pool found on DexScreener');
          }
        } else {
          throw new Error('DexScreener API error');
        }
      } catch (dexError) {
        console.warn('DexScreener lookup failed:', dexError);
        // No fallback - if we can't find a real pool, we should return an error
        throw new Error(`No Orca pool found for token pair: ${tokenMint} / ${quoteMint}. Please ensure the tokens have an existing Orca liquidity pool.`);
      }
    }
    
    // Calculate quote data
    const baseAmountNum = Number(baseAmountBN);
    
    // Estimate price impact (simplified calculation)
    const priceImpact = Math.min(baseAmountNum / 1000000, 5); // Max 5% impact
    
    // Orca typically has 0.3% LP fee
    const lpFee = 0.003;
    
    // Calculate expected LP tokens (simplified)
    const expectedLpTokens = baseAmountNum * 0.1; // Rough estimate
    
    // Calculate minimum output with 1% slippage
    const minOut = baseAmountNum * 0.99;
    
    return {
      pool: poolAddress,
      priceImpact: Math.round(priceImpact * 100) / 100, // Round to 2 decimals
      lpFee: Math.round(lpFee * 10000) / 10000, // Round to 4 decimals
      expectedLpTokens: (Math.round(expectedLpTokens * 100) / 100).toString(), // Round to 2 decimals
      minOut: (Math.round(minOut * 100) / 100).toString() // Round to 2 decimals
    };
    
  } catch (error) {
    console.error('Error getting Orca quote:', error);
    
    // If it's a validation error, throw it
    if (error instanceof Error && error.message.includes('Invalid public key')) {
      throw new Error('Invalid token mint address');
    }
    
    // For other errors, provide generic message
    throw new Error('Failed to get Orca quote. Pool may not exist or network error occurred.');
  }
}

/**
 * Get available pools for a token using DexScreener API
 */
export async function getAvailablePools(tokenMint: string): Promise<string[]> {
  try {
    // Validate token mint format
    new PublicKey(tokenMint);
    
    // Use DexScreener to find Orca pools for this token
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenMint}`, { 
      cache: "no-store" 
    });
    
    if (response.ok) {
      const data = await response.json();
      const orcaPools = data.pairs?.filter((pair: any) => 
        pair.dexId === 'orca' && 
        (pair.baseToken?.address === tokenMint || pair.quoteToken?.address === tokenMint)
      );
      
      if (orcaPools && orcaPools.length > 0) {
        return orcaPools.map((pool: any) => pool.pairAddress);
      }
    }
    
    // Return empty array if no pools found
    return [];
    
  } catch (error) {
    console.error('Error getting available pools:', error);
    return [];
  }
}
