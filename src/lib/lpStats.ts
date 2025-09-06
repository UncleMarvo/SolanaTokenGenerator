import { DEV_DISABLE_DEXSCR } from "./env";

/**
 * LP Statistics and Chips for Token Pages
 * Fetches live data from multiple sources: DexScreener, Orca, and on-chain verification
 */

export type LpChips = {
  lpUsd?: number;           // liquidity in USD
  inRange?: boolean|null;   // true/false/null if unknown
  honest?: boolean;         // on-chain verify
  lastTx?: string;          // tx signature
  lpPresent?: boolean;      // LP presence (from database or chain)
  source?: "orca"|"raydium"|"dexscreener";
  dbSource?: "database"|"chain"|"none"; // Data source for LP presence
};

/**
 * Fetch LP statistics from multiple sources
 * Returns partial data even if some sources fail
 */
export async function fetchLpChips({ mint }: { mint: string }): Promise<LpChips> {
  const result: LpChips = {};
  
  // a) DexScreener pair (primary for USD + last tx) - only if not disabled
  let lpUsd: number|undefined, lastTx: string|undefined;
  if (!DEV_DISABLE_DEXSCR) {
    try {
      const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, { 
        cache: "no-store",
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      if (r.ok) {
        const j = await r.json();
        const pairs = Array.isArray(j.pairs) ? j.pairs.filter(p => p.chainId === "solana") : [];
        
        if (pairs.length > 0) {
          // Sort by liquidity USD (highest first)
          const best = pairs.sort((a, b) => (b?.liquidity?.usd || 0) - (a?.liquidity?.usd || 0))[0];
          lpUsd = best?.liquidity?.usd;
          
          // Note: DexScreener doesn't provide individual tx signatures
          // We'll leave lastTx undefined for now
          result.source = "dexscreener";
        }
      }
    } catch (error) {
      console.warn("DexScreener fetch failed:", error);
    }
  }

  // b) Honest verify (reuse existing helper)
  let honest = false;
  try {
    const { verifyHonestMint } = await import("./solanaToken");
    const { Connection } = await import("@solana/web3.js");
    
    // Create connection for on-chain verification
    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com"
    );
    
    honest = await verifyHonestMint({ connection, mint });
  } catch (error) {
    console.warn("Honest verification failed:", error);
  }

  // c) In-range (Orca) — optional best-effort
  let inRange: boolean|null = null;
  try {
    // This is optional - we'll implement if we have the metadata store
    // For now, leave as null (unknown)
    inRange = null;
  } catch (error) {
    console.warn("Orca range check failed:", error);
  }

  // d) Check local transaction metadata for lastTx
  try {
    const { getForMint } = await import("./lastCommitMeta");
    const local = getForMint(mint);
    if (local?.txid) {
      lastTx = local.txid;
      console.log(`Found local tx for ${mint.slice(0, 8)}...:`, local.txid);
    }
  } catch (error) {
    console.warn("Local metadata check failed:", error);
  }

  return { 
    lpUsd, 
    inRange, 
    honest, 
    lastTx, 
    lpPresent: lpUsd ? true : false, // LP present if we have USD data
    source: result.source || "dexscreener",
    dbSource: "chain" // Default to chain since this function fetches from chain
  };
}

/**
 * Format LP USD value for display
 */
export function formatLpUsd(lpUsd?: number): string {
  if (lpUsd == null) return "—";
  
  if (lpUsd >= 1_000_000) {
    return `$${(lpUsd / 1_000_000).toFixed(1)}M`;
  } else if (lpUsd >= 1_000) {
    return `$${(lpUsd / 1_000).toFixed(1)}K`;
  } else {
    return `$${Math.round(lpUsd)}`;
  }
}

/**
 * Get range status display text
 */
export function getRangeDisplay(inRange?: boolean|null): string {
  if (inRange === true) return "🎯 In";
  if (inRange === false) return "🎯 Out";
  return "🎯 —";
}

/**
 * Get honest verification display text
 */
export function getHonestDisplay(honest?: boolean): string {
  if (honest === true) return "✅ Honest Verified";
  if (honest === false) return "⚠️ Unverified";
  return "⚠️ —";
}

/**
 * Get last transaction display text
 */
export function getLastTxDisplay(lastTx?: string): string {
  if (lastTx) return "🔗 Last tx";
  return "🔗 —";
}

/**
 * Get last transaction display element (for React components)
 */
export function getLastTxElement(lastTx?: string): { text: string; href?: string } {
  if (lastTx) {
    return {
      text: "🔗 Last tx",
      href: `https://solscan.io/tx/${lastTx}`
    };
  }
  return { text: "🔗 —" };
}
