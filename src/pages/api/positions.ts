import { NextApiRequest, NextApiResponse } from "next";
import { Connection, PublicKey } from "@solana/web3.js";
import { fetchOrcaPositionsReal } from "../../lib/orcaPositions";
import { fetchRaydiumPositions } from "../../lib/raydiumPositions";
import { prisma } from "../../lib/db";
import { isFresh } from "../../lib/freshness";

// Simple in-memory cache for positions (fallback for AMM positions)
const positionsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds

interface PositionsRequest {
  owner: string;
}

interface PositionsResponse {
  orcaPositions: any[];
  raydiumPositions: any[];
  timestamp: number;
  source: "database" | "chain" | "mixed";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PositionsResponse | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { owner } = req.query;
    
    if (!owner || Array.isArray(owner)) {
      return res.status(400).json({ error: "Owner public key is required" });
    }

    // Validate public key format
    let ownerPubkey: PublicKey;
    try {
      ownerPubkey = new PublicKey(owner);
    } catch (error) {
      return res.status(400).json({ error: "Invalid public key format" });
    }

    // Check cache first for AMM positions (no DB schema needed)
    const cacheKey = owner;
    const cached = positionsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return res.status(200).json({
        ...cached.data,
        source: "cache"
      });
    }

    // Database-first approach for Orca & Raydium CLMM positions
    let orcaPositions: any[] = [];
    let raydiumPositions: any[] = [];
    let source: "database" | "chain" | "mixed" = "database";
    let needsChainFetch = false;

    try {
      // Query database for CLMM positions
      const dbPositions = await prisma.positionsClmm.findMany({
        where: { wallet: owner },
        orderBy: { updatedAt: 'desc' }
      });

      // Check if we have fresh data for all positions
      const allFresh = dbPositions.length > 0 && 
        dbPositions.every(pos => isFresh(pos.updatedAt));

      if (allFresh) {
        // All data is fresh from database - map to UI shape
        console.log(`Using fresh database positions for ${owner.slice(0, 8)}...`);
        
        // Map database positions to expected format
        orcaPositions = dbPositions
          .filter(pos => pos.poolId.startsWith('whirlpool')) // Orca whirlpools
          .map(pos => ({
            positionMint: pos.positionMint,
            whirlpool: pos.poolId,
            lowerTick: pos.tickLower,
            upperTick: pos.tickUpper,
            liquidity: pos.lastLiquidity,
            tokenA: pos.tokenA,
            tokenB: pos.tokenB,
            dbSource: "database"
          }));

        raydiumPositions = dbPositions
          .filter(pos => !pos.poolId.startsWith('whirlpool')) // Raydium CLMM pools
          .map(pos => ({
            source: "raydium",
            kind: "CLMM",
            poolId: pos.poolId,
            tokenA: pos.tokenA,
            tokenB: pos.tokenB,
            tickLower: pos.tickLower,
            tickUpper: pos.tickUpper,
            liquidity: pos.lastLiquidity,
            dbSource: "database"
          }));

        source = "database";
      } else {
        // Some data is stale or missing - need to fetch from chain
        console.log(`Database positions stale for ${owner.slice(0, 8)}..., fetching from chain`);
        needsChainFetch = true;
        source = "mixed";
      }
    } catch (dbError) {
      console.warn("Database query failed, falling back to chain:", dbError);
      needsChainFetch = true;
      source = "chain";
    }

    // Fetch from chain if needed
    if (needsChainFetch) {
      // Initialize Solana connection
      const connection = new Connection(
        process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com"
      );

      // Fetch both Orca and Raydium positions in parallel
      const [chainOrcaPositions, chainRaydiumPositions] = await Promise.all([
        fetchOrcaPositionsReal({ 
          connection, 
          owner: ownerPubkey.toString() 
        }),
        fetchRaydiumPositions({ 
          connection, 
          owner: ownerPubkey.toString() 
        })
      ]);

      // Merge with database results or replace if database failed
      if (source === "mixed") {
        // Merge fresh database data with fresh chain data
        orcaPositions = [...orcaPositions, ...chainOrcaPositions];
        raydiumPositions = [...raydiumPositions, ...chainRaydiumPositions];
      } else {
        // Use only chain data
        orcaPositions = chainOrcaPositions;
        raydiumPositions = chainRaydiumPositions;
      }

      // Best-effort database upsert for new positions
      try {
        await upsertPositionsToDb(owner, orcaPositions, raydiumPositions);
      } catch (upsertError) {
        console.warn("Failed to upsert positions to database:", upsertError);
        // Continue without failing the request
      }
    }

    const response: PositionsResponse = {
      orcaPositions,
      raydiumPositions,
      timestamp: Date.now(),
      source
    };

    // Cache the response for AMM positions (fallback)
    positionsCache.set(cacheKey, { data: response, timestamp: Date.now() });

    // Clean up old cache entries (older than 5 minutes)
    const now = Date.now();
    for (const [key, value] of positionsCache.entries()) {
      if (now - value.timestamp > 5 * 60 * 1000) {
        positionsCache.delete(key);
      }
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error("Error fetching positions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Best-effort upsert of positions to database
 * Maps position data to database schema and upserts
 */
async function upsertPositionsToDb(
  wallet: string, 
  orcaPositions: any[], 
  raydiumPositions: any[]
) {
  const upsertPromises: Promise<any>[] = [];

  // Upsert Orca positions
  for (const pos of orcaPositions) {
    if (pos.whirlpool && pos.positionMint) {
      upsertPromises.push(
        prisma.positionsClmm.upsert({
          where: { positionMint: pos.positionMint },
          update: {
            wallet,
            poolId: pos.whirlpool,
            tokenA: pos.tokenA || "",
            tokenB: pos.tokenB || "",
            decA: 0, // Default values - could be enhanced
            decB: 0,
            tickLower: pos.lowerTick || 0,
            tickUpper: pos.upperTick || 0,
            lastLiquidity: pos.liquidity || "0",
            updatedAt: new Date()
          },
          create: {
            positionMint: pos.positionMint,
            wallet,
            poolId: pos.whirlpool,
            tokenA: pos.tokenA || "",
            tokenB: pos.tokenB || "",
            decA: 0,
            decB: 0,
            tickLower: pos.lowerTick || 0,
            tickUpper: pos.upperTick || 0,
            lastLiquidity: pos.liquidity || "0"
          }
        })
      );
    }
  }

  // Upsert Raydium CLMM positions
  for (const pos of raydiumPositions) {
    if (pos.kind === "CLMM" && pos.poolId) {
      // For CLMM, we need a unique identifier - using poolId + wallet for now
      // This could be enhanced with proper position mint tracking
      const positionMint = `${pos.poolId}_${wallet}`;
      
      upsertPromises.push(
        prisma.positionsClmm.upsert({
          where: { positionMint },
          update: {
            wallet,
            poolId: pos.poolId,
            tokenA: pos.tokenA || "",
            tokenB: pos.tokenB || "",
            decA: 0,
            decB: 0,
            tickLower: pos.tickLower || 0,
            tickUpper: pos.tickUpper || 0,
            lastLiquidity: pos.liquidity || "0",
            updatedAt: new Date()
          },
          create: {
            positionMint,
            wallet,
            poolId: pos.poolId,
            tokenA: pos.tokenA || "",
            tokenB: pos.tokenB || "",
            decA: 0,
            decB: 0,
            tickLower: pos.tickLower || 0,
            tickUpper: pos.tickUpper || 0,
            lastLiquidity: pos.liquidity || "0"
          }
        })
      );
    }
  }

  // Execute all upserts in parallel
  if (upsertPromises.length > 0) {
    await Promise.allSettled(upsertPromises);
  }
}
