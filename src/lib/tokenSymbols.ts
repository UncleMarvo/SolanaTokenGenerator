// Small known-mints map for popular tokens
export const KNOWN_TOKEN_SYMBOLS: { [mint: string]: string } = {
  // Native SOL and Wrapped SOL
  'So11111111111111111111111111111111111111112': 'WSOL',
  
  // Stablecoins
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  
  // Liquid staking derivatives
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
  '7dHbWXmci3dT8UFYWYZQBL7CyDq92rNwCB4STcP1LC8k': 'stSOL',
  'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn': 'jitoSOL',
  
  // Popular DeFi tokens
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
  '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': 'POPCAT',
  'HZ1JovNiVvGrGNiiYvEozEVg58WUyNNCfq1JqoYzqJ2b': 'DOGWIFHAT',
  '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU': 'SAMO',
  
  // Other popular tokens
  'EPeUFDgHRxs9xxEPVaL6kfGQvCon7jmAWKVUHuux1Tpz': 'GMT',
  'AFbX8oGjGpmVFywbVehh2sSh4Yvjv7tYb3Kk9br4m3D6': 'STEP',
  'RLBzFwJYfJbLLbF7bxWcF3V5uFmJXWR6yJvJfJfJfJf': 'RLB',
};

/**
 * Gets the symbol for a given mint address
 * Returns the symbol if known, otherwise returns a shortened version of the mint
 */
export function getTokenSymbol(mint: string): string {
  return KNOWN_TOKEN_SYMBOLS[mint] || mint.slice(0, 4) + '...';
}

/**
 * Gets both symbols for a token pair
 * Returns "A/B" format if both are known, otherwise returns mint addresses
 */
export function getTokenPairSymbols(tokenA: string, tokenB: string): string {
  const symbolA = KNOWN_TOKEN_SYMBOLS[tokenA];
  const symbolB = KNOWN_TOKEN_SYMBOLS[tokenB];
  
  if (symbolA && symbolB) {
    return `${symbolA}/${symbolB}`;
  }
  
  return `${tokenA.slice(0, 4)}.../${tokenB.slice(0, 4)}...`;
}
