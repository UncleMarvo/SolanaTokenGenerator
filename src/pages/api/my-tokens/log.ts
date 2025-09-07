import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { logCreatedToken } from "@/lib/tokens";

// Validation schema for token creation data
const Body = z.object({
  mint: z.string().min(32, "Mint address must be at least 32 characters"),
  creatorWallet: z.string().min(32, "Wallet address must be at least 32 characters"),
  name: z.string().min(1, "Token name is required"),
  ticker: z.string().min(1, "Token ticker is required").max(12, "Token ticker must be 12 characters or less"),
});

/**
 * POST /api/my-tokens/log
 * Logs a newly created token to the database
 * Called after successful token creation
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return res.status(405).json({ 
        ok: false, 
        error: "MethodNotAllowed" 
      });
    }

    // Validate request body
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        ok: false, 
        error: "BadRequest", 
        details: parsed.error.flatten() 
      });
    }

    // Log the created token to database
    const row = await logCreatedToken(parsed.data);
    
    return res.status(200).json({ 
      ok: true, 
      mint: row.mint 
    });

  } catch (e: any) {
    console.error("Error in /api/my-tokens/log:", e);
    return res.status(500).json({ 
      ok: false, 
      error: "ServerError", 
      message: e?.message 
    });
  }
}
