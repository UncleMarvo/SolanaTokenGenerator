import { NextApiRequest, NextApiResponse } from "next";

interface LiquidityQuoteRequest {
  dex: "Raydium" | "Orca";
  pair: "SOL/TOKEN" | "USDC/TOKEN";
  tokenMint: string;
  baseAmount: string;
  quoteAmount: string;
}

interface LiquidityQuoteResponse {
  poolAddress: string;
  priceImpactBp: number;
  lpFeeBp: number;
  expectedLpTokens: string;
  minOut: string;
  quoteId: string;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<LiquidityQuoteResponse | { error: string }>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { dex, pair, tokenMint, baseAmount, quoteAmount }: LiquidityQuoteRequest = req.body;

    if (!dex || !pair || !tokenMint || !baseAmount || !quoteAmount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Generate deterministic mock data based on input
    const baseAmountNum = parseFloat(baseAmount);
    const quoteAmountNum = parseFloat(quoteAmount);
    
    // Create deterministic values based on inputs
    const poolAddress = `ExamplePool${tokenMint.slice(0, 8)}${dex.slice(0, 3)}`;
    const priceImpactBp = Math.floor((baseAmountNum + quoteAmountNum) % 100) + 10; // 10-109 bps
    const lpFeeBp = dex === "Raydium" ? 30 : 25; // Raydium 30bps, Orca 25bps
    const expectedLpTokens = (baseAmountNum * quoteAmountNum * 0.1).toFixed(2);
    const minOut = (Math.min(baseAmountNum, quoteAmountNum) * 0.95).toFixed(2);
    const quoteId = `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const mockResponse: LiquidityQuoteResponse = {
      poolAddress,
      priceImpactBp,
      lpFeeBp,
      expectedLpTokens,
      minOut,
      quoteId
    };

    res.status(200).json(mockResponse);
  } catch (error) {
    console.error("Error generating liquidity quote:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
