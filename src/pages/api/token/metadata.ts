import type { NextApiRequest, NextApiResponse } from "next";
import { getTokenByMint } from "@/lib/tokens";
import { StoredToken } from "@/utils/tokenStorage";

/**
 * GET /api/token/metadata?mint=<mint_address>
 * Returns complete token metadata from the database
 * 
 * Query parameters:
 * - mint: Required. The mint address to query
 * 
 * Returns:
 * - 200: { ok: true, token: StoredToken }
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

    // Fetch token metadata from database
    const token = await getTokenByMint(mint);
    
    // Return 404 if token not found
    if (!token) {
      return res.status(404).json({ 
        ok: false, 
        error: "TokenNotFound" 
      });
    }

    // Return successful response with token metadata
    return res.status(200).json({ 
      ok: true, 
      token 
    });

  } catch (e: any) {
    // Handle server errors with detailed error information
    console.error("Error in /api/token/metadata:", e);
    return res.status(500).json({ 
      ok: false, 
      error: "ServerError", 
      message: e?.message 
    });
  }
}
