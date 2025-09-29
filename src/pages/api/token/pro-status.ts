import { NextApiRequest, NextApiResponse } from "next";
import { getTokenProStatus } from "../../../lib/tokenProStatus";

type TokenProStatusResponse = {
  ok: boolean;
  isPro: boolean;
  tier: string;
  paymentVerified: boolean;
  tokenMint?: string;
  error?: string;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokenProStatusResponse>
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ 
      ok: false, 
      isPro: false,
      tier: 'free',
      paymentVerified: false,
      error: "MethodNotAllowed",
      message: "Only GET requests are allowed"
    });
  }

  try {
    const { mint } = req.query;
    
    // Validate mint parameter
    if (!mint || typeof mint !== "string") {
      return res.status(400).json({ 
        ok: false, 
        isPro: false,
        tier: 'free',
        paymentVerified: false,
        error: "BadRequest",
        message: "Token mint address is required"
      });
    }

    // Get token Pro status
    const result = await getTokenProStatus(mint);

    if (result.error) {
      return res.status(200).json({ 
        ok: true, 
        isPro: result.isPro,
        tier: result.tier,
        paymentVerified: result.paymentVerified,
        tokenMint: mint,
        error: result.error,
        message: result.error
      });
    }

    // Return Pro status
    return res.status(200).json({ 
      ok: true, 
      isPro: result.isPro,
      tier: result.tier,
      paymentVerified: result.paymentVerified,
      tokenMint: mint,
      message: result.isPro ? "Token has Pro access" : "Token has free tier"
    });

  } catch (error: any) {
    console.error("Token Pro status check error:", error);
    return res.status(500).json({ 
      ok: false, 
      isPro: false,
      tier: 'free',
      paymentVerified: false,
      error: "InternalServerError",
      message: "Internal server error"
    });
  }
}
