import type { NextApiRequest, NextApiResponse } from "next";
import { listCreatedTokens } from "@/lib/tokens";

/**
 * GET /api/my-tokens?wallet=pubkey
 * Returns all tokens created by the specified wallet address
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

    // Extract wallet address from query parameters
    const wallet = (req.query.wallet as string) || "";
    if (!wallet) {
      return res.status(400).json({ 
        ok: false, 
        error: "MissingWallet" 
      });
    }

    // Validate wallet address format (basic validation)
    if (wallet.length < 32) {
      return res.status(400).json({ 
        ok: false, 
        error: "InvalidWalletFormat" 
      });
    }

    // Fetch tokens created by this wallet
    const rows = await listCreatedTokens(wallet);
    
    return res.status(200).json({ 
      ok: true, 
      items: rows 
    });

  } catch (e: any) {
    console.error("Error in /api/my-tokens:", e);
    return res.status(500).json({ 
      ok: false, 
      error: "ServerError", 
      message: e?.message 
    });
  }
}
