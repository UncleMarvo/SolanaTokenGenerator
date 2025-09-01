import { NextApiRequest, NextApiResponse } from "next";
import { getOrcaQuote } from "../../../lib/orcaClient";
import { getRaydiumQuote } from "../../../lib/raydiumClient";

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

export default async function handler(
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

    // Determine quote mint based on pair
    const quoteMint = pair === "SOL/TOKEN" 
      ? "So11111111111111111111111111111111111111112" // SOL
      : "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC

    try {
      let quote;
      let quoteId;

      if (dex === "Orca") {
        // Get Orca quote
        quote = await getOrcaQuote({
          tokenMint,
          baseAmount,
          quoteMint
        });
        quoteId = `orca_quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      } else if (dex === "Raydium") {
        // Get Raydium quote
        quote = await getRaydiumQuote({
          tokenMint,
          baseAmount,
          quoteMint
        });
        quoteId = `raydium_quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      } else {
        return res.status(400).json({ error: "Unsupported DEX" });
      }

      // Convert response to expected format
      const response: LiquidityQuoteResponse = {
        poolAddress: quote.pool,
        priceImpactBp: Math.round(quote.priceImpact * 100), // Convert percentage to basis points
        lpFeeBp: Math.round(quote.lpFee * 10000), // Convert decimal to basis points
        expectedLpTokens: quote.expectedLpTokens.toString(),
        minOut: quote.minOut.toString(),
        quoteId
      };

      res.status(200).json(response);
    } catch (quoteError) {
      console.error(`${dex} quote error:`, quoteError);
      
      // Handle specific error cases
      if (quoteError instanceof Error) {
        if (quoteError.message === 'No pool available') {
          return res.status(400).json({ error: "No pool available" });
        } else if (quoteError.message === 'No Raydium pool available') {
          return res.status(400).json({ error: "No Raydium pool available" });
        } else if (quoteError.message.includes('Invalid token mint address')) {
          return res.status(400).json({ error: "Invalid token mint address" });
        }
      }
      
      // For other errors, return generic error
      return res.status(500).json({ error: `Failed to get quote from ${dex}` });
    }

  } catch (error) {
    console.error("Error generating liquidity quote:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
