import { NextApiRequest, NextApiResponse } from "next";

interface LiquidityCommitRequest {
  dex: "Raydium" | "Orca";
  pair: "SOL/TOKEN" | "USDC/TOKEN";
  tokenMint: string;
  baseAmount: string;
  quoteAmount: string;
  quoteId: string;
}

interface LiquidityCommitResponse {
  txid: string;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<LiquidityCommitResponse | { error: string }>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { dex, pair, tokenMint, baseAmount, quoteAmount, quoteId }: LiquidityCommitRequest = req.body;

    if (!dex || !pair || !tokenMint || !baseAmount || !quoteAmount || !quoteId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Generate a mock transaction ID
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 9);
    const txid = `MockTx${timestamp}${randomSuffix}`;

    const mockResponse: LiquidityCommitResponse = {
      txid
    };

    res.status(200).json(mockResponse);
  } catch (error) {
    console.error("Error committing liquidity:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
