import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { logCreatedToken } from "@/lib/tokens";

// Validation schema for complete token metadata
const Body = z.object({
  mintAddress: z.string().min(32, "Mint address must be at least 32 characters"),
  creatorWallet: z.string().min(32, "Wallet address must be at least 32 characters"),
  name: z.string().min(1, "Token name is required"),
  symbol: z.string().min(1, "Token symbol is required").max(12, "Token symbol must be 12 characters or less"),
  decimals: z.string().min(1, "Decimals is required"),
  amount: z.string().min(1, "Amount is required"),
  image: z.string().min(1, "Image is required"),
  description: z.string().min(1, "Description is required"),
  preset: z.enum(["honest", "degen"]),
  vibe: z.enum(["funny", "serious", "degen"]),
  createdAt: z.number().min(1, "Created timestamp is required"),
  links: z.object({
    tg: z.string().optional(),
    x: z.string().optional(),
    site: z.string().optional(),
  }).optional(),
  // NEW: Payment tracking fields for per-token payment model
  tokenType: z.enum(["free", "pro"]).optional().default("free"),
  paymentTxSig: z.string().optional(),
  paidAmount: z.number().optional(),
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

    // Log the complete token metadata to database
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
