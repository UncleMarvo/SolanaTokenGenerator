import type { NextApiRequest, NextApiResponse } from "next";
import { readHonestCached } from "@/lib/honestCache";

/**
 * API endpoint for batch honest status lookup
 * POST /api/honest-status/batch?bust=1
 * 
 * Request body:
 * - mints: Array of mint addresses to check
 * 
 * Query parameters:
 * - bust: Optional. Set to "1" to bypass cache and fetch fresh data
 * 
 * Returns:
 * - 200: { ok: true, items: Honest[] }
 * - 400: { ok: false, error: "MissingMints" }
 * - 405: { ok: false, error: "MethodNotAllowed" }
 * - 500: { ok: false, error: "ServerError", message: string }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Only allow POST requests for batch operations
    if (req.method !== "POST") {
      return res.status(405).json({ 
        ok: false, 
        error: "MethodNotAllowed" 
      });
    }
    
    // Extract mint addresses from request body
    const mints: string[] = Array.isArray(req.body?.mints) ? req.body.mints : [];
    
    // Validate that mints array is provided and not empty
    if (!mints.length) {
      return res.status(400).json({ 
        ok: false, 
        error: "MissingMints" 
      });
    }
    
    // Check if cache busting is requested
    const bust = req.query.bust === "1";
    
    // Remove duplicates and filter out empty values
    const uniq = Array.from(new Set(mints.filter(Boolean)));
    
    // Process all mints in parallel for better performance
    const items = await Promise.all(
      uniq.map(m => readHonestCached(m, { bust }))
    );
    
    // Return successful response with all status items
    return res.status(200).json({ 
      ok: true, 
      items 
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
