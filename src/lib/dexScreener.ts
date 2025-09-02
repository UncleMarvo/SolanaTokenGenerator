/**
 * DexScreener API client for Solana token pairs
 * Used as a fallback when Raydium pool fetch fails
 */

export interface DexScreenerPair {
  pool: string;
  price: number;
  reservesBase: number;
  reservesQuote: number;
}

export interface DexScreenerResponse {
  pairs: Array<{
    chainId: string;
    dexId: string;
    url: string;
    pairAddress: string;
    baseToken: {
      address: string;
      name: string;
      symbol: string;
    };
    quoteToken: {
      address: string;
      name: string;
      symbol: string;
    };
    priceNative: string;
    priceUsd: string;
    txns: {
      h24: {
        buys: number;
        sells: number;
      };
    };
    volume: {
      h24: number;
      h6: number;
      h1: number;
    };
    priceChange: {
      h24: number;
      h6: number;
      h1: number;
    };
    liquidity: {
      usd: number;
      base: number;
      quote: number;
    };
    fdv: number;
    pairCreatedAt: number;
  }>;
}

/**
 * Fetch token pair data from DexScreener API
 * @param tokenMint - The base token mint address
 * @param quoteMint - The quote token mint address (USDC or WSOL)
 * @returns Pair data or null if no suitable pair found
 */
export async function getDexScreenerPair({
  tokenMint,
  quoteMint,
}: {
  tokenMint: string;
  quoteMint: string;
}): Promise<DexScreenerPair | null> {
  try {
    console.log(`Fetching DexScreener pairs for ${tokenMint} vs ${quoteMint}`);
    
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/pairs/solana/${tokenMint}`,
      {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
        // Add timeout to prevent hanging requests
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 10000);
          return controller.signal;
        })(), // 10 second timeout
      }
    );

    if (!response.ok) {
      console.warn(`DexScreener API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data: DexScreenerResponse = await response.json();
    
    if (!data.pairs || data.pairs.length === 0) {
      console.log("No pairs found in DexScreener response");
      return null;
    }

    // Find a pair where either base or quote matches our quoteMint
    // Also look for pairs with USDC or WSOL as the quote token
    const suitablePair = data.pairs.find(pair => {
      const baseAddress = pair.baseToken.address.toLowerCase();
      const quoteAddress = pair.quoteToken.address.toLowerCase();
      const targetMint = quoteMint.toLowerCase();
      
      // Check if this pair matches our target quote mint
      if (baseAddress === targetMint || quoteAddress === targetMint) {
        return true;
      }
      
      // Also check if this pair has USDC or WSOL as quote (common stable pairs)
      const isUSDCPair = quoteAddress === USDC_MINT.toLowerCase() || baseAddress === USDC_MINT.toLowerCase();
      const isWSOLPair = quoteAddress === WSOL_MINT.toLowerCase() || baseAddress === WSOL_MINT.toLowerCase();
      
      return isUSDCPair || isWSOLPair;
    });

    if (!suitablePair) {
      console.log(`No suitable pair found for ${quoteMint} in DexScreener data`);
      console.log(`Available pairs:`, data.pairs.map(p => `${p.baseToken.symbol}/${p.quoteToken.symbol}`));
      return null;
    }

    // Determine which token is our base and which is quote
    const isBaseToken = suitablePair.baseToken.address.toLowerCase() === tokenMint.toLowerCase();
    const baseToken = isBaseToken ? suitablePair.baseToken : suitablePair.quoteToken;
    const quoteToken = isBaseToken ? suitablePair.quoteToken : suitablePair.baseToken;

    // Calculate price (quote/base ratio)
    let price: number;
    if (isBaseToken) {
      // If our token is base, price is quote/base
      price = parseFloat(suitablePair.priceUsd) || 0;
    } else {
      // If our token is quote, price is base/quote (inverse)
      price = 1 / (parseFloat(suitablePair.priceUsd) || 1);
    }

    // Get reserves (liquidity)
    const reservesBase = suitablePair.liquidity.base || 0;
    const reservesQuote = suitablePair.liquidity.quote || 0;

    console.log(`DexScreener pair found: ${baseToken.symbol}/${quoteToken.symbol}, price: ${price}, reserves: ${reservesBase}/${reservesQuote}`);

    return {
      pool: suitablePair.url || `https://dexscreener.com/solana/${suitablePair.pairAddress}`,
      price,
      reservesBase,
      reservesQuote,
    };

  } catch (error) {
    console.error("Error fetching DexScreener data:", error);
    return null;
  }
}

/**
 * Get USDC mint address for Solana
 */
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/**
 * Get WSOL (Wrapped SOL) mint address for Solana
 */
export const WSOL_MINT = "So11111111111111111111111111111111111111112";
