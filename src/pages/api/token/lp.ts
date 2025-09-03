import { NextApiRequest, NextApiResponse } from "next";
import { fetchLpChips } from "../../../lib/lpStats";

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

    // Fetch fresh data
    console.log(`Fetching fresh LP data for ${mint.slice(0, 8)}...`);
    const lpData = await fetchLpChips({ mint });

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
      source: "error"
    });
  }
}
