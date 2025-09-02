import { Connection, PublicKey } from "@solana/web3.js";
import { getTokenSymbol } from "./tokenSymbols";
// Orca Whirlpool Program ID
const ORCA_WHIRLPOOL_PROGRAM_ID = new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc');

// In-memory cache for positions (30 seconds)
const positionsCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_DURATION = 30 * 1000;

// In-memory cache for pool token mints (60 seconds)
const poolTokenCache = new Map<string, { ts: number; tokenA?: string; tokenB?: string }>();
const POOL_CACHE_DURATION = 60 * 1000;

export interface OrcaPosition {
  positionMint: string;
  whirlpool: string;
  lowerTick: number;
  upperTick: number;
  liquidity: string;
  tokenA: string;
  tokenB: string;
  symbolA?: string;
  symbolB?: string;
}

/**
 * Helper function to get real token mints for a whirlpool
 * Uses DexScreener API to fetch token pair information
 */
async function getPoolTokenMints({ 
  connection, 
  whirlpool 
}: { 
  connection: Connection; 
  whirlpool: string; 
}): Promise<{ tokenA?: string; tokenB?: string }> {
  
  // Check cache first
  const cached = poolTokenCache.get(whirlpool);
  if (cached && Date.now() - cached.ts < POOL_CACHE_DURATION) {
    return { tokenA: cached.tokenA, tokenB: cached.tokenB };
  }

  // Use DexScreener API to get token pair information
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/pairs/solana/${whirlpool}`, { cache: "no-store" });
    if (!r.ok) throw new Error("dexscreener not ok");
    const j = await r.json();
    const pair = Array.isArray(j.pairs) && j.pairs.length ? j.pairs[0] : null;
    if (!pair) throw new Error("no pairs");
    
    // DexScreener base/quote map to tokenA/B (order is not critical for display)
    const result = { 
      tokenA: pair.baseToken?.address, 
      tokenB: pair.quoteToken?.address 
    };
    
    // Cache the result
    poolTokenCache.set(whirlpool, { ts: Date.now(), ...result });
    return result;
    
  } catch (error) {
    console.debug(`Failed to fetch token mints for whirlpool ${whirlpool}:`, error);
    // Return empty object if DexScreener fails
    return {};
  }
}

/**
 * Fetches real Orca Whirlpool positions owned by the given wallet
 */
export async function fetchOrcaPositionsReal({ 
  connection, 
  owner 
}: { 
  connection: Connection; 
  owner: string; 
}): Promise<OrcaPosition[]> {
  
  // Check cache first
  const cached = positionsCache.get(owner);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

    try {
    // a) Get owner token accounts (NFT filter: amount==1, decimals==0)
    const ownerPk = new PublicKey(owner);
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
      const emptyResult: OrcaPosition[] = [];
      positionsCache.set(owner, { data: emptyResult, timestamp: Date.now() });
      return emptyResult;
    }

    // b) For each candidate, derive Position PDA and validate ownership
    const out: OrcaPosition[] = [];
    for (const mint of candidateMints) {
      try {
        const mintPk = new PublicKey(mint);
        
        // Derive position PDA manually
        const [posPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("position"), mintPk.toBuffer()],
          ORCA_WHIRLPOOL_PROGRAM_ID
        );

        // Quick owner check
        const acc = await connection.getAccountInfo(posPda);
        if (!acc || acc.owner.toBase58() !== ORCA_WHIRLPOOL_PROGRAM_ID.toBase58()) continue;

        // Parse real position account data from acc.data buffer
        // Position account layout: [discriminator(8) + whirlpool(32) + positionMint(32) + liquidity(16) + tickLowerIndex(4) + tickUpperIndex(4) + ...]
        const data = acc.data;
        
        // Skip discriminator (first 8 bytes)
        let offset = 8;
        
        // Read whirlpool address (32 bytes)
        const whirlpoolBytes = data.slice(offset, offset + 32);
        const whirlpool = new PublicKey(whirlpoolBytes).toBase58();
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
        
        // c) Fetch real token mints from whirlpool account
        const { tokenA, tokenB } = await getPoolTokenMints({ connection, whirlpool });
        
        out.push({
          positionMint: mint,
          whirlpool: whirlpool, // Real whirlpool address from account data
          lowerTick: tickLower, // Real lower tick from account data
          upperTick: tickUpper, // Real upper tick from account data
          liquidity: liquidity, // Real liquidity from account data
          tokenA: tokenA || "", // Real mint from SDK or DexScreener (or empty if both fail)
          tokenB: tokenB || "", // Real mint from SDK or DexScreener (or empty if both fail)
          symbolA: tokenA ? getTokenSymbol(tokenA) : undefined,
          symbolB: tokenB ? getTokenSymbol(tokenB) : undefined,
        });
      } catch (_) { 
        // skip bad candidate 
        console.debug(`Error processing position mint ${mint}:`, _);
      }
    }

    // d) sort by liquidity desc and return
    const sortedPositions = out.sort((a,b) => BigInt(b.liquidity) > BigInt(a.liquidity) ? 1 : -1);

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
    console.error("Error fetching Orca positions:", error);
    // Return empty array on error, don't break the UI
    return [];
  }
}
