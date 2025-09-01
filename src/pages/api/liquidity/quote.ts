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
  source: "Raydium" | "DexScreener" | "Orca"; // Include source for UI indication
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LiquidityQuoteResponse | { error: string; details?: string[] } | { error: string; message: string }>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "MethodNotAllowed", message: "Method not allowed" });
  }

  // Check Content-Type
  if (!req.headers["content-type"]?.includes("application/json")) {
    return res.status(400).json({ error: "InvalidContentType", message: "Content-Type must be application/json" });
  }

  try {
    // Parse request body
    let body: LiquidityQuoteRequest;
    try {
      body = req.body;
      // If body is already parsed (Pages Router), use it; otherwise parse manually
      if (!body || Object.keys(body).length === 0) {
        body = JSON.parse(req.body as string);
      }
    } catch (parseError) {
      console.warn("Failed to parse request body:", parseError);
      return res.status(400).json({ error: "InvalidJSON", message: "Invalid JSON in request body" });
    }

    const { dex, pair, tokenMint, baseAmount, quoteAmount } = body;

    // Input validation
    const validationErrors: string[] = [];
    
    // Check required fields
    if (!dex) validationErrors.push("dex required");
    if (!pair) validationErrors.push("pair required");
    if (!tokenMint) validationErrors.push("tokenMint required");
    if (!baseAmount) validationErrors.push("baseAmount required");
    if (!quoteAmount) validationErrors.push("quoteAmount required");
    
    // Validate dex value
    if (dex && !["Orca", "Raydium"].includes(dex)) {
      validationErrors.push("dex must be 'Orca' or 'Raydium'");
    }
    
    // Validate pair value
    if (pair && !["SOL/TOKEN", "USDC/TOKEN"].includes(pair)) {
      validationErrors.push("pair must be 'SOL/TOKEN' or 'USDC/TOKEN'");
    }
    
    // Validate base58 format for mint addresses
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (tokenMint && !base58Regex.test(tokenMint)) {
      validationErrors.push("tokenMint must be valid base58 format");
    }
    
    // Validate numeric amounts
    if (baseAmount && (isNaN(Number(baseAmount)) || Number(baseAmount) <= 0)) {
      validationErrors.push("baseAmount must be a positive number");
    }
    if (quoteAmount && (isNaN(Number(quoteAmount)) || Number(quoteAmount) <= 0)) {
      validationErrors.push("quoteAmount must be a positive number");
    }
    
    // Return validation errors if any
    if (validationErrors.length > 0) {
      console.warn("Validation failed:", { dex, pair, tokenMint: tokenMint?.substring(0, 8) + "...", baseAmount, quoteAmount, errors: validationErrors });
      return res.status(400).json({ 
        error: "InvalidRequest", 
        details: validationErrors 
      });
    }

    // Determine quote mint based on pair
    const quoteMint = pair === "SOL/TOKEN" 
      ? "So11111111111111111111111111111111111111112" // SOL
      : "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC

    let quote;
    let quoteId;

      if (dex === "Orca") {
        // Get Orca quote
        try {
          quote = await getOrcaQuote({
            tokenMint,
            baseAmount,
            quoteMint
          });
          // Add source to Orca quote for consistency
          quote = { ...quote, source: "Orca" as const };
          quoteId = `orca_quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        } catch (orcaError) {
          console.warn("Orca quote failed:", orcaError);
          if (orcaError instanceof Error) {
            if (orcaError.message.includes('No pool available')) {
              return res.status(404).json({ error: "NoPool", message: "No pool available for this pair on Orca" });
            } else if (orcaError.message.includes('Invalid token mint address')) {
              return res.status(400).json({ error: "InvalidRequest", message: "Invalid token mint address" });
            }
          }
          return res.status(502).json({ error: "ProviderError", message: "Orca API error" });
        }
      } else if (dex === "Raydium") {
        // Get Raydium quote
        try {
          quote = await getRaydiumQuote({
            tokenMint,
            baseAmount,
            quoteMint
          });
          // Update quoteId to reflect the actual source if fallback was used
          const source = quote.source || 'Raydium';
          quoteId = `${source.toLowerCase()}_quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        } catch (raydiumError) {
          console.warn("Raydium quote failed:", raydiumError);
          if (raydiumError instanceof Error) {
            if (raydiumError.message.includes('No pool available')) {
              return res.status(404).json({ error: "NoPool", message: "No pool available for this pair on Raydium or DexScreener" });
            } else if (raydiumError.message.includes('Invalid token mint address')) {
              return res.status(400).json({ error: "InvalidRequest", message: "Invalid token mint address" });
            } else if (raydiumError.message.includes('timeout')) {
              return res.status(408).json({ error: "Timeout", message: "Request timeout - please try again" });
            } else if (raydiumError.message.includes('too large')) {
              return res.status(413).json({ error: "ResponseTooLarge", message: "Response too large - using fallback data" });
            }
          }
          return res.status(502).json({ error: "ProviderError", message: "Raydium API error" });
        }
      } else {
        return res.status(400).json({ error: "InvalidRequest", message: "Unsupported DEX" });
      }

      // Convert response to expected format
      const response: LiquidityQuoteResponse = {
        poolAddress: quote.pool,
        priceImpactBp: Math.round(quote.priceImpact * 100), // Convert percentage to basis points
        lpFeeBp: Math.round(quote.lpFee * 10000), // Convert decimal to basis points
        expectedLpTokens: quote.expectedLpTokens.toString(),
        minOut: quote.minOut.toString(),
        quoteId,
        source: quote.source || dex // Use quote source or fallback to DEX name
      };

      // Log the source for debugging
      console.log(`Quote generated from ${response.source} for ${dex} request`);

      res.status(200).json(response);
  } catch (error) {
    console.error("Error generating liquidity quote:", error);
    res.status(500).json({ error: "Unknown", message: "Unexpected error occurred" });
  }
}
