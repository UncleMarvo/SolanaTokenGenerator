import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/db";

// Response type for Pro status check
type ProStatusResponse = {
  ok: boolean;
  isPro: boolean;
  wallet?: string;
  expiresAt?: string | null;
  error?: string;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProStatusResponse>
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ 
      ok: false, 
      isPro: false,
      error: "MethodNotAllowed",
      message: "Only GET requests are allowed"
    });
  }

  try {
    const { wallet } = req.query;
    
    // Validate wallet parameter
    if (!wallet || typeof wallet !== "string") {
      return res.status(400).json({ 
        ok: false, 
        isPro: false,
        error: "BadRequest",
        message: "Wallet address is required"
      });
    }

    // Check if wallet has Pro access
    const proAccess = await prisma.proAccess.findUnique({
      where: { wallet },
      select: {
        wallet: true,
        expiresAt: true,
        updatedAt: true
      }
    });

    if (!proAccess) {
      return res.status(200).json({ 
        ok: true, 
        isPro: false,
        wallet,
        message: "No Pro access found for this wallet"
      });
    }

    // Check if Pro access has expired
    const now = new Date();
    const isExpired = proAccess.expiresAt && proAccess.expiresAt < now;
    
    if (isExpired) {
      // Remove expired access
      await prisma.proAccess.delete({
        where: { wallet }
      });
      
      return res.status(200).json({ 
        ok: true, 
        isPro: false,
        wallet,
        message: "Pro access has expired"
      });
    }

    // Return Pro status
    return res.status(200).json({ 
      ok: true, 
      isPro: true,
      wallet,
      expiresAt: proAccess.expiresAt?.toISOString() || null,
      message: "Pro access is active"
    });

  } catch (error: any) {
    console.error("Pro status check error:", error);
    
    return res.status(500).json({ 
      ok: false, 
      isPro: false,
      error: "ServerError",
      message: error?.message || "Internal server error occurred"
    });
  }
}
