import type { NextApiRequest, NextApiResponse } from "next";
import { readHonestCached } from "@/lib/honestCache";

/**
 * API endpoint for single honest status lookup
 * GET /api/honest-status?mint=<mint_address>&bust=1
 * 
 * Query parameters:
 * - mint: Required. The mint address to check
 * - bust: Optional. Set to "1" to bypass cache and fetch fresh data
 * 
 * Returns:
 * - 200: { ok: true, status: Honest }
 * - 400: { ok: false, error: "MissingMint" }
 * - 500: { ok: false, error: "ServerError", message: string }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Extract mint address from query parameters
    const mint = (req.query.mint as string) || "";
    
    // Validate required mint parameter
    if (!mint) {
      return res.status(400).json({ 
        ok: false, 
        error: "MissingMint" 
      });
    }
    
    // Read honest status with optional cache busting
    const status = await readHonestCached(mint, { 
      bust: req.query.bust === "1" 
    });
    
    // Return successful response with status data
    return res.status(200).json({ 
      ok: true, 
      status 
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
