import type { NextApiRequest, NextApiResponse } from "next";
import { invalidateHonest } from "@/lib/honestCache";

/**
 * API endpoint for cache invalidation
 * POST /api/honest-status/invalidate?mint=<mint_address>
 * 
 * Request body (alternative to query param):
 * - mint: The mint address to invalidate from cache
 * 
 * Query parameters:
 * - mint: The mint address to invalidate from cache
 * 
 * Returns:
 * - 200: { ok: true }
 * - 400: { ok: false, error: "MissingMint" }
 * - 405: { ok: false, error: "MethodNotAllowed" }
 * - 500: { ok: false, error: "ServerError", message: string }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Only allow POST requests for invalidation operations
    if (req.method !== "POST") {
      return res.status(405).json({ 
        ok: false, 
        error: "MethodNotAllowed" 
      });
    }
    
    // Extract mint address from either body or query parameters
    const mint = (req.body?.mint as string) || (req.query?.mint as string) || "";
    
    // Validate required mint parameter
    if (!mint) {
      return res.status(400).json({ 
        ok: false, 
        error: "MissingMint" 
      });
    }
    
    // Invalidate the cache entry for this mint
    invalidateHonest(mint);
    
    // Return successful response
    return res.status(200).json({ 
      ok: true 
    });
  } catch (e: any) {
    // Handle server errors with detailed error information
    return res.status(500).json({ 
      ok: false, 
      error: "ServerError", 
      message: e?.message 
    });
  }
}
