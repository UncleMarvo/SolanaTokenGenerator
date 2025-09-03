import { NextApiRequest, NextApiResponse } from "next";
import { fetchLpChips } from "../../../lib/lpStats";
import { prisma } from "../../../lib/db";
import { isFresh } from "../../../lib/freshness";

// In-memory cache for LP data (60 second TTL)
const lpCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 60 seconds

/**
 * Check if cached data is still valid
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_TTL;
}

/**
 * Clear expired cache entries
 */
function clearExpiredCache(): void {
  const now = Date.now();
  const entries = Array.from(lpCache.entries());
  for (const [key, value] of entries) {
    if (!isCacheValid(value.timestamp)) {
      lpCache.delete(key);
    }
  }
}

// Clean up expired cache every 5 minutes
setInterval(clearExpiredCache, 5 * 60 * 1000);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { mint } = req.query;

    if (!mint || typeof mint !== "string") {
      return res.status(400).json({ error: "Missing or invalid mint parameter" });
    }

    // Check cache first
    const cached = lpCache.get(mint);
    if (cached && isCacheValid(cached.timestamp)) {
      console.log(`Using cached LP data for ${mint.slice(0, 8)}...`);
      return res.status(200).json(cached.data);
    }

    // Database-first approach for LP presence check
    let lpPresent = false;
    let dbSource = "none";
    
    try {
      // Check if we have fresh database data for this mint
      const dbPositions = await prisma.positionsClmm.findMany({
        where: {
          OR: [
            { tokenA: mint },
            { tokenB: mint }
          ]
        },
        orderBy: { updatedAt: 'desc' },
        take: 1 // Just need to know if any exist
      });

      if (dbPositions.length > 0) {
        const latestPosition = dbPositions[0];
        
        if (isFresh(latestPosition.updatedAt)) {
          // Database has fresh data - use it for LP presence
          lpPresent = true;
          dbSource = "database";
          console.log(`Using fresh database LP data for ${mint.slice(0, 8)}...`);
        } else {
          // Database data is stale - will need chain check
          console.log(`Database LP data stale for ${mint.slice(0, 8)}..., will check chain`);
        }
      }
    } catch (dbError) {
      console.warn("Database LP check failed, falling back to chain:", dbError);
      // Continue with chain check
    }

    // Fetch fresh data from chain if database check failed or was stale
    let lpData;
    if (dbSource === "database") {
      // Use database data for LP presence, but still fetch other metrics from chain
      lpData = await fetchLpChips({ mint });
      // Override LP presence with database result
      lpData.lpPresent = lpPresent;
      lpData.dbSource = dbSource;
    } else {
      // Fetch everything from chain
      console.log(`Fetching fresh LP data from chain for ${mint.slice(0, 8)}...`);
      lpData = await fetchLpChips({ mint });
      
      // Best-effort database upsert for new LP data
      try {
        await upsertLpDataToDb(mint, lpData);
      } catch (upsertError) {
        console.warn("Failed to upsert LP data to database:", upsertError);
        // Continue without failing the request
      }
    }

    // Cache the result
    lpCache.set(mint, {
      data: lpData,
      timestamp: Date.now()
    });

    // Return the data
    return res.status(200).json(lpData);

  } catch (error) {
    console.error("Error fetching LP data:", error);
    
    // Return partial data if possible, or empty object
    return res.status(200).json({
      lpUsd: undefined,
      inRange: null,
      honest: false,
      lastTx: undefined,
      lpPresent: false,
      source: "error",
      dbSource: "none"
    });
  }
}

/**
 * Best-effort upsert of LP data to database
 * Creates or updates position records when LP is detected
 */
async function upsertLpDataToDb(mint: string, lpData: any) {
  // Only upsert if we have meaningful LP data
  if (!lpData.lpPresent && !lpData.lpUsd) {
    return;
  }

  try {
    // For now, we'll create a placeholder position record
    // This could be enhanced with more detailed LP metadata
    const positionMint = `lp_${mint}_${Date.now()}`;
    
    await prisma.positionsClmm.upsert({
      where: { positionMint },
      update: {
        tokenA: mint,
        tokenB: "", // Unknown for general LP check
        decA: 0,
        decB: 0,
        tickLower: 0,
        tickUpper: 0,
        lastLiquidity: "0",
        updatedAt: new Date()
      },
      create: {
        positionMint,
        wallet: "unknown", // Unknown wallet for general LP check
        poolId: "unknown", // Unknown pool for general LP check
        tokenA: mint,
        tokenB: "",
        decA: 0,
        decB: 0,
        tickLower: 0,
        tickUpper: 0,
        lastLiquidity: "0"
      }
    });
  } catch (error) {
    console.warn("Failed to upsert LP data to database:", error);
    // Don't throw - this is best-effort
  }
}
