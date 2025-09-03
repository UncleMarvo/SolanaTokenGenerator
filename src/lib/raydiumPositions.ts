import { Connection, PublicKey } from "@solana/web3.js";

type AmmPos = { 
  source: "raydium"; 
  kind: "AMM"; 
  poolId: string; 
  lpMint: string; 
  tokenA: string; 
  tokenB: string; 
  lpBalance: string; 
  usd?: number 
};

type ClmmPos = { 
  source: "raydium"; 
  kind: "CLMM"; 
  poolId: string; 
  tokenA: string; 
  tokenB: string; 
  tickLower?: number; 
  tickUpper?: number; 
  liquidity?: string; 
  usd?: number 
};

export type RaydiumPos = AmmPos | ClmmPos;

const cache = new Map<string, { ts: number, data: RaydiumPos[] }>();
const TTL = 60_000;

/**
 * Fetch JSON from URL with timeout and size limits
 * Used for Raydium API and DexScreener API calls
 */
async function fetchJson(url: string, maxBytes = 8_000_000, timeoutMs = 8000) {
  const ctrl = new AbortController(); 
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const reader = r.body?.getReader(); 
    let received = 0; 
    const chunks: any[] = [];
    if (reader) {
      while (true) { 
        const { done, value } = await reader.read(); 
        if (done) break; 
        received += value.length; 
        if (received > maxBytes) throw new Error("TooLarge"); 
        chunks.push(value); 
      }
      const buf = new Uint8Array(received); 
      let off = 0; 
      for (const c of chunks) { 
        buf.set(c, off); 
        off += c.length; 
      }
      return JSON.parse(new TextDecoder().decode(buf));
    }
    return await r.json();
  } finally { 
    clearTimeout(t); 
  }
}

/**
 * Fetch Raydium AMM pool list from their public API
 * Returns a map of LP mint addresses to pool metadata
 */
async function getRaydiumAmmPools() {
  // small JSON, subject to change; adjust if needed
  const url = "https://api.raydium.io/v2/sdk/liquidity/mainnet.json";
  const j = await fetchJson(url);
  // Build map: lpMint -> { poolId, tokenA, tokenB }
  const map = new Map<string, { poolId: string; tokenA: string; tokenB: string }>();
  (j?.official ?? []).forEach((p: any) => { 
    if (p.lpMint && p.baseMint && p.quoteMint) 
      map.set(p.lpMint, { poolId: p.id || p.lpMint, tokenA: p.baseMint, tokenB: p.quoteMint }); 
  });
  (j?.unOfficial ?? []).forEach((p: any) => { 
    if (p.lpMint && p.baseMint && p.quoteMint) 
      map.set(p.lpMint, { poolId: p.id || p.lpMint, tokenA: p.baseMint, tokenB: p.quoteMint }); 
  });
  return map;
}

/**
 * Get USD liquidity estimate for a token pair from DexScreener
 * Used to enrich position data with approximate USD values
 */
async function dexScreenerUsdForPair(mintA: string, mintB: string) {
  try {
    const r = await fetchJson(`https://api.dexscreener.com/latest/dex/tokens/${mintA}`);
    const pairs = Array.isArray(r?.pairs) ? r.pairs.filter((p: any) => 
      p.chainId === "solana" && (
        p.baseToken?.address === mintA && p.quoteToken?.address === mintB || 
        p.baseToken?.address === mintB && p.quoteToken?.address === mintA
      )
    ) : [];
    const best = pairs.sort((a: any, b: any) => (b?.liquidity?.usd || 0) - (a?.liquidity?.usd || 0))[0];
    return best?.liquidity?.usd as number | undefined;
  } catch { 
    return undefined; 
  }
}

/**
 * Fetch Raydium AMM LP token positions for a wallet
 * Scans token accounts for LP tokens and matches them to Raydium pools
 */
async function fetchAmmPositions(conn: Connection, owner: PublicKey): Promise<AmmPos[]> {
  const pools = await getRaydiumAmmPools();
  const resp = await conn.getParsedTokenAccountsByOwner(owner, { 
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") 
  });
  const out: AmmPos[] = [];
  for (const v of resp.value) {
    const info = v.account.data.parsed?.info?.tokenAmount;
    const mint = v.account.data.parsed?.info?.mint as string;
    if (!info || !mint) continue;
    const ui = Number(info.uiAmount || 0);
    if (ui <= 0) continue;
    const meta = pools.get(mint);
    if (!meta) continue; // not a Raydium LP mint
    out.push({ 
      source: "raydium", 
      kind: "AMM", 
      poolId: meta.poolId, 
      lpMint: mint, 
      tokenA: meta.tokenA, 
      tokenB: meta.tokenB, 
      lpBalance: info.amount 
    });
  }
  // enrich with USD (best-effort)
  for (const p of out) { 
    p.usd = await dexScreenerUsdForPair(p.tokenA, p.tokenB); 
  }
  return out;
}

/**
 * Fetch Raydium CLMM positions for a wallet
 * MVP: Returns empty array - CLMM position scanning requires SDK support
 * Future: Implement when Raydium SDK provides owner position enumeration
 */
async function fetchClmmPositions(conn: Connection, owner: PublicKey): Promise<ClmmPos[]> {
  // Best-effort: many SDKs don't expose easy owner enumeration; skip if unavailable.
  try {
    // If your Raydium SDK has an owner positions helper, call it here.
    // Otherwise, return empty array for now (we still have AMM coverage).
    return [];
  } catch { 
    return []; 
  }
}

/**
 * Main function to fetch all Raydium positions (AMM + CLMM) for a wallet
 * Implements 60-second caching for performance
 * Returns empty array on errors to prevent UI breakage
 */
export async function fetchRaydiumPositions({ connection, owner }: { connection: Connection; owner: string }): Promise<RaydiumPos[]> {
  const key = `raydium:${owner}`;
  const now = Date.now();
  const c = cache.get(key);
  if (c && now - c.ts < TTL) return c.data;
  const ownerPk = new PublicKey(owner);
  const [amm, clmm] = await Promise.all([
    fetchAmmPositions(connection, ownerPk).catch(() => []),
    fetchClmmPositions(connection, ownerPk).catch(() => []),
  ]);
  const data = [...amm, ...clmm];
  cache.set(key, { ts: now, data });
  return data;
}
