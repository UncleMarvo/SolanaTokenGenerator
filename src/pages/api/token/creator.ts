import type { NextApiRequest, NextApiResponse } from "next";
import { getTokenCreator } from "@/lib/tokens";

/**
 * GET /api/token/creator?mint=<mint_address>
 * Returns the creator wallet address for a specific token mint
 * 
 * Query parameters:
 * - mint: Required. The mint address to query
 * 
 * Returns:
 * - 200: { ok: true, creator: string, name: string, ticker: string, createdAt: string }
 * - 400: { ok: false, error: "MissingMint" }
 * - 404: { ok: false, error: "TokenNotFound" }
 * - 500: { ok: false, error: "ServerError", message: string }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Only allow GET requests
    if (req.method !== "GET") {
      return res.status(405).json({ 
        ok: false, 
        error: "MethodNotAllowed" 
      });
    }

    // Extract mint address from query parameters
    const mint = (req.query.mint as string) || "";
    
    // Validate required mint parameter
    if (!mint) {
      return res.status(400).json({ 
        ok: false, 
        error: "MissingMint" 
      });
    }

    // Validate mint address format (basic validation)
    if (mint.length < 32) {
      return res.status(400).json({ 
        ok: false, 
        error: "InvalidMintFormat" 
      });
    }

    // Fetch token creator information
    const token = await getTokenCreator(mint);
    
    // Return 404 if token not found
    if (!token) {
      return res.status(404).json({ 
        ok: false, 
        error: "TokenNotFound" 
      });
    }

    // Return successful response with creator information
    return res.status(200).json({ 
      ok: true, 
      creator: token.creatorWallet,
      name: token.name,
      ticker: token.ticker,
      createdAt: token.createdAt.toISOString()
    });

  } catch (e: any) {
    // Handle server errors with detailed error information
    console.error("Error in /api/token/creator:", e);
    return res.status(500).json({ 
      ok: false, 
      error: "ServerError", 
      message: e?.message 
    });
  }
}
